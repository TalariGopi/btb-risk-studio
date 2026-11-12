/* bTB-RISK Studio — stochastic engine
   Reimplements the Teagasc bTB QMRA DAFM decision-support workbook (19 May 2026)
   in the browser. Monte Carlo with Latin hypercube sampling. */

'use strict';

/* ---------------------------------------------------------------- samplers */

function qnorm(p){
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425;
  if(p<=0) p=1e-12; if(p>=1) p=1-1e-12;
  if(p<pl){const q=Math.sqrt(-2*Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-pl){const q=Math.sqrt(-2*Math.log(1-p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  const q=p-0.5,r=q*q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/* Latin hypercube strata on (0,1), independently shuffled */
function lhs(n){
  const u=new Float64Array(n);
  for(let i=0;i<n;i++) u[i]=(i+Math.random())/n;
  for(let i=n-1;i>0;i--){const j=(Math.random()*(i+1))|0;const t=u[i];u[i]=u[j];u[j]=t;}
  return u;
}

/* Marsaglia-Tsang gamma */
function rgamma(a){
  if(a<=0) return 0;
  if(a<1) return rgamma(a+1)*Math.pow(Math.random(),1/a);
  const d=a-1/3,c=1/Math.sqrt(9*d);
  for(;;){
    let x,v;
    do{ x=qnorm(Math.random()); v=1+c*x; }while(v<=0);
    v=v*v*v; const u=Math.random();
    if(u<1-0.0331*x*x*x*x) return d*v;
    if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v))) return d*v;
  }
}
const rbeta=(a,b)=>{const x=rgamma(a),y=rgamma(b);return (x+y)>0?x/(x+y):0;};

/* Inverse-CDF helpers so LHS strata can drive each input */
const iUnif  = (u,a,b)=> a+u*(b-a);
const iNorm  = (u,m,s)=> m+s*qnorm(u);
const iTriang= (u,a,m,b)=>{
  const f=(m-a)/(b-a);
  return u<f ? a+Math.sqrt(u*(b-a)*(m-a)) : b-Math.sqrt((1-u)*(b-a)*(b-m));
};
/* Pert: Beta(alpha,beta) scaled to [a,c]. Sampled by Marsaglia-Tsang, not LHS. */
function rpert(a,m,c,lambda){
  if(c<=a) return a;
  const l=lambda===undefined?4:lambda;
  const mu=(a+l*m+c)/(l+2);
  let al,be;
  if(Math.abs(mu-m)<1e-12){ al=be=(l/2)+1; }
  else{
    al=((mu-a)*(2*m-a-c))/((m-mu)*(c-a));
    be=al*(c-mu)/(mu-a);
  }
  al=Math.max(al,0.05); be=Math.max(be,0.05);
  return a+(c-a)*rbeta(al,be);
}
const pertMean=(a,m,c)=>(a+4*m+c)/6;

/* Poisson by inversion, small lambda */
function rpois(lam){
  const L=Math.exp(-lam); let k=0,p=1;
  do{ k++; p*=Math.random(); }while(p>L);
  return k-1;
}

/* Lognormal parameterised by arithmetic mean and SD, truncated */
function iLognormMS(u,mean,sd,lo,hi){
  const s2=Math.log(1+(sd*sd)/(mean*mean));
  const mu=Math.log(mean)-s2/2, sig=Math.sqrt(s2);
  let v=Math.exp(mu+sig*qnorm(u));
  if(lo!==undefined && v<lo) v=lo;
  if(hi!==undefined && v>hi) v=hi;
  return v;
}

const percentile=(sorted,q)=>{
  const i=(sorted.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i);
  return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
};

/* ------------------------------------------------- retrospective window */

function windowAnalysis(o){
  const d=s=>{const t=new Date(s+'T00:00:00'); return isNaN(t)?null:t;};
  const clear=d(o.dateClear), make=d(o.dateMake), loss=d(o.dateLoss), eat=d(o.dateAssess);
  const day=864e5;
  const out={ valid:true, msg:'Dates are internally consistent.' };
  if(!clear||!make||!loss){ out.valid=false; out.msg='One or more dates are missing.'; return out; }
  if(loss<=clear){ out.valid=false; out.msg='The status-loss date must fall after the last clear test.'; }
  out.windowDays = Math.round((loss-clear)/day);
  out.daysAfterClear = Math.round((make-clear)/day);
  out.elapsed = out.windowDays>0 ? Math.min(Math.max(out.daysAfterClear/out.windowDays,0),1) : 0;
  out.before = make < clear;
  out.inside = make >= clear && make <= loss;
  out.after  = make > loss;
  out.position = out.before ? 'Before the window'
               : out.inside ? 'Inside the DAFM retrospective window'
               : 'After loss of TB-free status';
  out.plain = out.before
    ? 'The cheese was produced before the last clear herd test, so it falls outside the retrospective window addressed by this assessment.'
    : out.inside
      ? 'The cheese was produced inside the DAFM retrospective window, between the last clear herd test and the subsequent loss of TB-free status.'
      : 'The cheese was produced after the herd lost TB-free status. Milk from a restricted herd should not have entered raw-milk cheese production under Regulation (EC) No 853/2004.';
  if(eat && make) out.maturationFromDates = Math.round((eat-make)/day);
  out.month = make ? make.getMonth() : 0;
  return out;
}

/* --------------------------------------------------------------- the model */

function runModel(o, win, onProgress, done){
  const ctx = prepareRun(o, win);
  if(!done){ runChunk(ctx, 0, ctx.n); return finaliseRun(ctx); }
  const chunk = Math.max(500, Math.round(ctx.n/40));
  let i = 0;
  (function step(){
    const to = Math.min(i+chunk, ctx.n);
    runChunk(ctx, i, to);
    i = to;
    if(onProgress) onProgress(i/ctx.n);
    if(i < ctx.n) setTimeout(step, 0);
    else done(finaliseRun(ctx));
  })();
  return null;
}

function prepareRun(o, win){
  const n=Math.max(1000,Math.min(50000,Math.round(o.iters)));
  const W = win || windowAnalysis(o);

  /* ---- secondary models: multipliers fed into the farm module ---- */
  const countyMult = o.countyMult;
  const seasonMult = o.useSeason ? SEASON[W.month||0].f : 1;
  /* retrospective uncertainty: later in the window means more undetected time */
  const ruf = 1 + W.elapsed * (1-o.seTst) * o.retroWeight;
  const prevMult  = countyMult * ruf * seasonMult;
  const shedMult  = Math.sqrt(prevMult);              /* sub-linear, Collins SRMA 2021 */
  const herdFactor = o.herdFactor;
  const procFactor = o.procFactor;

  const uHerdInc=lhs(n), uShedPos=lhs(n), uShedNeg=lhs(n), uYield=lhs(n),
        uServing=lhs(n), uR=lhs(n), uDval=lhs(n), uMat=lhs(n),
        uCcP=lhs(n), uCcC=lhs(n), uCurd=lhs(n), uConc=lhs(n),
        uTret=lhs(n), uTdom=lhs(n), uStoreT=lhs(n);

  const risk=new Float64Array(n), dose=new Float64Array(n), btm=new Float64Array(n),
        lrArr=new Float64Array(n), cheeseConc=new Float64Array(n), cases=new Float64Array(n);
  const X={ r:new Float64Array(n), ccC:new Float64Array(n), ccP:new Float64Array(n),
            pHerd:new Float64Array(n), serving:new Float64Array(n), shedPos:new Float64Array(n),
            dVal:new Float64Array(n), matur:new Float64Array(n), susc:new Float64Array(n),
            bcg:new Float64Array(n), pWithin:new Float64Array(n), nHerd:new Float64Array(n) };

  const pasteurised = o.pasteurised===1;

  return {o,n,W,prevMult,shedMult,ruf,seasonMult,countyMult,lhsU:{uR,uShedPos,uShedNeg,uYield,
    uServing,uDval,uMat,uCcP,uCcC,uCurd,uConc,uTret,uTdom,uStoreT},
    arr:{risk,dose,btm,lrArr,cheeseConc,cases},X,pasteurised};
}

function runChunk(ctx, start, end){
  const o=ctx.o, X=ctx.X, pasteurised=ctx.pasteurised;
  const prevMult=ctx.prevMult, shedMult=ctx.shedMult, herdFactor=o.herdFactor, procFactor=o.procFactor;
  const {uServing,uDval,uMat,uStoreT,uR}=ctx.lhsU;
  const {risk,dose,btm,lrArr,cheeseConc,cases}=ctx.arr;
  for(let i=start;i<end;i++){
    /* --- farm module --- */
    const nHerd  = o.herdSizeFixed>0 ? o.herdSizeFixed : rpert(o.nHerdMin,o.nHerdMode,o.nHerdMax);
    const pHerd  = rbeta(o.pHerdA,o.pHerdB);                       /* proportion */
    const pWith  = rbeta(o.pWithinA,o.pWithinB);                   /* proportion */
    const infected = nHerd * pHerd * pWith * prevMult;

    const shedPos = rpert(o.shedPosMin,o.shedPosMode,o.shedPosMax);
    const shedNeg = rpert(o.shedNegMin,o.shedNegMode,o.shedNegMax);
    const shedding = (pWith*shedPos + (1-pWith)*shedNeg) * shedMult;

    const yield_ = rpert(o.yieldMin,o.yieldMode,o.yieldMax);
    const milkL  = nHerd * yield_ * herdFactor;
    const bulk   = milkL>0 ? infected*shedding/milkL*1000 : 0;     /* CFU/mL */

    /* --- processing module --- */
    const fCurd = rpert(o.curdMin,o.curdMode,o.curdMax);
    const cFac  = rpert(o.concMin,o.concMode,o.concMax);
    const initial = bulk * fCurd * cFac;                           /* CFU/g fresh curd */

    const dVal = Math.max(iNorm(uDval[i],o.dValue,o.dValueSd),1);
    const matur = o.maturationFixed>0 ? o.maturationFixed
                : rpert(o.matMin,o.matMode,o.matMax);
    const lrMat = pasteurised ? iNorm(uMat[i],o.pastLr,o.pastLrSd) : matur/dVal;

    const tRetail = rpert(o.retailMin,o.retailMode,o.retailMax);
    const tDom    = rpert(o.domMin,o.domMode,o.domMax);
    const tempDom = rpert(o.domTempMin,o.domTempMode,o.domTempMax);
    const rateStore = 0.002*Math.exp(0.05*(tempDom-5));
    const lrStore = rateStore*(tRetail+tDom)/2.303;

    const lrTotal = lrMat + lrStore;
    const surv = Math.pow(10,-lrTotal);

    const pCross = rpert(o.ccPMin,o.ccPMode,o.ccPMax) * (pasteurised?o.ccPastFactor:1);
    const cCross = rpert(o.ccCMin,o.ccCMode,o.ccCMax);
    const ccAdd  = pCross*cCross;

    const finalC = (initial*surv + ccAdd) * procFactor;            /* CFU/g */

    /* --- exposure --- */
    const serving = Math.max(iNorm(uServing[i],o.serving,o.servingSd),1);
    const d = finalC*serving;
    const events = o.servingsFixed>0 ? o.servingsFixed : rpois(o.freqWeek)*52;

    /* --- dose-response --- */
    const r  = iLognormMS(uR[i],o.rMean,o.rSd,o.rLo,o.rHi);
    const su = rbeta(o.suscA,o.suscB);
    const bc = rbeta(o.bcgA,o.bcgB);
    const rEff = r*su*(2-bc);                                      /* workbook form */

    const pServ = 1-Math.exp(-rEff*d);
    const pYear = 1-Math.pow(1-pServ,events);

    const pop = o.consumers*o.pConsume;

    risk[i]=pYear; dose[i]=d; btm[i]=bulk; lrArr[i]=lrTotal; cheeseConc[i]=finalC;
    cases[i]=pYear*pop;
    X.r[i]=r; X.ccC[i]=cCross; X.ccP[i]=pCross; X.pHerd[i]=pHerd; X.serving[i]=serving;
    X.shedPos[i]=shedPos; X.dVal[i]=dVal; X.matur[i]=matur; X.susc[i]=su; X.bcg[i]=bc;
    X.pWithin[i]=pWith; X.nHerd[i]=nHerd;
  }

}

function finaliseRun(ctx){
  const o=ctx.o, n=ctx.n, X=ctx.X;
  const {risk,dose,btm,lrArr,cases}=ctx.arr;
  const cheeseConc=ctx.arr.cheeseConc;
  const mean=a=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i];return s/a.length;};
  const sortedRisk=Float64Array.from(risk).sort();
  const sortedCases=Float64Array.from(cases).sort();
  const meanRisk=mean(risk);
  const sd=(()=>{let s=0;for(let i=0;i<n;i++){const d=risk[i]-meanRisk;s+=d*d;}return Math.sqrt(s/(n-1));})();
  const pop=o.consumers*o.pConsume;
  const events=o.servingsFixed>0?o.servingsFixed:o.freqWeek*52;

  return {
    n, risk, dose, btm, X, prevMult:ctx.prevMult, shedMult:ctx.shedMult, ruf:ctx.ruf,
    seasonMult:ctx.seasonMult, countyMult:ctx.countyMult, window:ctx.W,
    meanRisk, sd,
    median:percentile(sortedRisk,0.5), p05:percentile(sortedRisk,0.05),
    p95:percentile(sortedRisk,0.95), p25:percentile(sortedRisk,0.25),
    p75:percentile(sortedRisk,0.75), max:sortedRisk[n-1],
    riskServing: meanRisk/events,
    meanDose: mean(dose), meanBtm: mean(btm), meanLr: mean(lrArr),
    meanConc: mean(cheeseConc), meanSurv: Math.pow(10,-mean(lrArr)),
    servings: events, pop,
    cases: meanRisk*pop, cases95: percentile(sortedCases,0.95),
    dalys: meanRisk*pop*o.daly,
    whoRatio: meanRisk/1e-6,
    src: srcAnalysis(X,risk)
  };
}

/* ------------------------------------------- standardised regression coeffs */

const SRC_NAMES = {
  r:'Infectivity parameter r', ccC:'Cross-contamination level (CFU/g)',
  ccP:'Cross-contamination probability', pHerd:'Herd-level incidence',
  serving:'Serving size', shedPos:'Shedding rate, reactors',
  dVal:'D-value', matur:'Maturation age', susc:'Host susceptibility',
  bcg:'BCG protection factor', pWithin:'Within-herd prevalence', nHerd:'Herd size'
};

function srcAnalysis(X,y){
  const keys=Object.keys(X), n=y.length, k=keys.length;
  const z=keys.map(key=>{
    const a=X[key]; let m=0; for(let i=0;i<n;i++) m+=a[i]; m/=n;
    let s=0; for(let i=0;i<n;i++){const d=a[i]-m;s+=d*d;} s=Math.sqrt(s/(n-1))||1e-12;
    const out=new Float64Array(n); for(let i=0;i<n;i++) out[i]=(a[i]-m)/s; return out;
  });
  let my=0; for(let i=0;i<n;i++) my+=y[i]; my/=n;
  let sy=0; for(let i=0;i<n;i++){const d=y[i]-my;sy+=d*d;} sy=Math.sqrt(sy/(n-1))||1e-12;
  const zy=new Float64Array(n); for(let i=0;i<n;i++) zy[i]=(y[i]-my)/sy;

  const A=[],b=[];
  for(let i=0;i<k;i++){
    A.push(new Float64Array(k));
    let s=0; for(let t=0;t<n;t++) s+=z[i][t]*zy[t]; b.push(s/(n-1));
    for(let j=0;j<k;j++){let q=0;for(let t=0;t<n;t++)q+=z[i][t]*z[j][t];A[i][j]=q/(n-1);}
  }
  for(let i=0;i<k;i++) A[i][i]+=1e-8;
  const M=A.map((row,i)=>Array.from(row).concat([b[i]]));
  for(let c=0;c<k;c++){
    let p=c; for(let r=c+1;r<k;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
    const t=M[c];M[c]=M[p];M[p]=t;
    for(let r=0;r<k;r++){ if(r===c||Math.abs(M[c][c])<1e-14) continue;
      const f=M[r][c]/M[c][c]; for(let j=c;j<=k;j++) M[r][j]-=f*M[c][j]; }
  }
  const beta=M.map((row,i)=>Math.abs(row[i])<1e-14?0:row[k]/row[i]);
  let r2=0; for(let i=0;i<k;i++) r2+=beta[i]*b[i];
  return { r2:Math.max(0,Math.min(1,r2)),
    terms:keys.map((key,i)=>({key,name:SRC_NAMES[key]||key,src:beta[i]}))
      .sort((a,b2)=>Math.abs(b2.src)-Math.abs(a.src)) };
}
