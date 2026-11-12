/* bTB-RISK Studio — farm-to-fork QMRA for Mycobacterium bovis in raw-milk cheese
   Teagasc Food Research Centre, Moorepark · DAFM PSSRC Topic 8.1
   Client-side Monte Carlo engine. No data leaves the browser. */

'use strict';

/* ============================== parameters ============================== */

const PROFILES = {
  A: { name: 'A · Standard / low incidence', ctx: 'Cork / Kerry', inc: 4.94, band: 'LOW' },
  B: { name: 'B · Border / medium', ctx: 'Monaghan / Cavan', inc: 6.05, band: 'MEDIUM' },
  C: { name: 'C · High incidence', ctx: 'Wicklow West', inc: 19.83, band: 'HIGH' },
  D: { name: 'D · Wildlife corridor', ctx: 'Kilkenny / Laois', inc: 7.50, band: 'MEDIUM' },
  E: { name: 'E · Custom DAFM case', ctx: 'User-defined', inc: 4.94, band: 'VARIABLE' }
};

const CHEESE = {
  caerphilly: { label: 'Caerphilly / semi-hard (pooled)', d: 55.4, mat: 153 },
  cheddar:    { label: 'Cheddar',                        d: 57.0, mat: 120 },
  gouda:      { label: 'Gouda',                          d: 59.0, mat: 120 },
  semihard:   { label: 'Semi-hard, short ripened',       d: 41.0, mat: 90 },
  soft:       { label: 'Soft / surface ripened',         d: 24.0, mat: 60 }
};

/* src: lit = literature value, cal = demonstration assumption, usr = user-entered */
const P = {
  profile:      { v:'A',      src:'usr', label:'Scenario profile' },
  herdInc:      { v:4.94,     src:'lit', label:'Herd incidence (%)', step:0.01,
                  note:'CSO DAA01 state herd incidence, 2023 context.' },
  stateInc:     { v:4.94,     src:'lit', label:'State average herd incidence (%)', step:0.01 },
  herdSize:     { v:57,       src:'usr', label:'Milking cows in herd', step:1 },
  dateClear:    { v:'2024-01-01', src:'usr', label:'Last clear herd test' },
  dateMake:     { v:'2024-04-01', src:'usr', label:'Cheese production date' },
  dateLoss:     { v:'2024-06-01', src:'usr', label:'Loss of TB-free status' },

  whpMean:      { v:0.035,    src:'lit', label:'Within-herd prevalence, mean', step:0.001,
                  note:'Beta distribution, herd-size adjusted (Collins & More 2022).' },
  whpSd:        { v:0.012,    src:'lit', label:'Within-herd prevalence, SD', step:0.001 },
  pShedLo:      { v:0.005,    src:'lit', label:'P(shedding into milk), lower', step:0.001 },
  pShedHi:      { v:0.020,    src:'lit', label:'P(shedding into milk), upper', step:0.001 },
  shedMean:     { v:0.25,     src:'cal', label:'Shedding concentration, mean (CFU/mL)', step:0.01,
                  note:'Lognormal. Calibrated so bulk-tank milk reproduces the reference workbook.' },
  shedGsd:      { v:1.8,      src:'cal', label:'Shedding concentration, geometric SD', step:0.1 },

  milkPerKg:    { v:10.0,     src:'lit', label:'Milk per kg cheese (L/kg)', step:0.1 },
  curdRet:      { v:0.90,     src:'lit', label:'Curd retention fraction', step:0.01,
                  note:'Fraction of cells partitioning into curd rather than whey.' },

  cheese:       { v:'caerphilly', src:'usr', label:'Cheese type' },
  dValue:       { v:55.4,     src:'lit', label:'D-value at maturation temperature (days)', step:0.1,
                  note:'Forgrave et al. 2016; Starikoff et al. 2016 (independent replicate).' },
  maturation:   { v:153,      src:'usr', label:'Maturation age at sale (days)', step:1 },
  pasteurised:  { v:0,        src:'usr', label:'Milk pasteurised before make' },
  pastLr:       { v:4.5,      src:'lit', label:'Pasteurisation log reduction', step:0.1 },

  ccProb:       { v:0.80,     src:'cal', label:'Proportion of servings with post-process transfer', step:0.01,
                  note:'Low-level transfer is modelled as common; the lognormal level term carries how much.' },
  ccMean:       { v:2.158e-5, src:'cal', label:'Cross-contamination level, mean (CFU/g)', step:1e-6,
                  note:'Lognormal. Calibrated so the serving dose reproduces the reference workbook.' },
  ccGsd:        { v:1.45,      src:'cal', label:'Cross-contamination, geometric SD', step:0.1 },
  ccPastFactor: { v:0.01,     src:'cal', label:'Cross-contamination factor, closed system', step:0.001 },

  serving:      { v:30,       src:'lit', label:'Serving size (g)', step:1,
                  note:'IUNA National Adult Nutrition Survey cheese serving.' },
  servingsYear: { v:96,       src:'lit', label:'Servings per consumer per year', step:1 },
  consumers:    { v:20000,    src:'cal', label:'Exposed consumer population', step:100 },

  rDist:        { v:'uniform', src:'usr', label:'Infectivity r — sampling' },
  rLo:          { v:1e-8,     src:'lit', label:'Infectivity r, lower bound', step:1e-9 },
  rHi:          { v:1e-4,     src:'lit', label:'Infectivity r, upper bound', step:1e-6 },
  suscA:        { v:3,        src:'lit', label:'Susceptibility Beta α', step:0.1 },
  suscB:        { v:12,       src:'lit', label:'Susceptibility Beta β', step:0.1 },
  bcgA:         { v:80,       src:'lit', label:'BCG coverage Beta α', step:1 },
  bcgB:         { v:20,       src:'lit', label:'BCG coverage Beta β', step:1 },
  bcgVe:        { v:0.50,     src:'lit', label:'BCG vaccine effectiveness', step:0.01,
                  note:'Colditz et al. 1994 meta-analysis.' },
  daly:         { v:12.1,     src:'lit', label:'DALYs per incident case', step:0.1,
                  note:'Menzies et al. 2021, Lancet Global Health (95% UI 10.0–14.9).' },
  iters:        { v:10000,    src:'usr', label:'Monte Carlo iterations', step:1000 }
};

const val = k => P[k].v;
const num = k => Number(P[k].v);

/* ============================== samplers ============================== */

/* Acklam inverse normal CDF */
function qnorm(p){
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425;
  if(p<pl){const q=Math.sqrt(-2*Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-pl){const q=Math.sqrt(-2*Math.log(1-p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  const q=p-0.5,r=q*q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/* Latin hypercube strata on (0,1), shuffled */
function lhs(n){
  const u=new Float64Array(n);
  for(let i=0;i<n;i++) u[i]=(i+Math.random())/n;
  for(let i=n-1;i>0;i--){const j=(Math.random()*(i+1))|0;const t=u[i];u[i]=u[j];u[j]=t;}
  return u;
}

/* Marsaglia–Tsang gamma, for Beta variates */
function rgamma(a){
  if(a<1) return rgamma(a+1)*Math.pow(Math.random(),1/a);
  const d=a-1/3, c=1/Math.sqrt(9*d);
  for(;;){
    let x,v;
    do{ x=qnorm(Math.random()*0.999998+1e-6); v=1+c*x; }while(v<=0);
    v=v*v*v; const u=Math.random();
    if(u<1-0.0331*x*x*x*x) return d*v;
    if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v))) return d*v;
  }
}
const rbeta=(a,b)=>{const x=rgamma(a),y=rgamma(b);return x/(x+y);};

/* Beta shape from mean and SD, clipped to a valid region */
function betaFromMeanSd(m,s){
  m=Math.min(Math.max(m,1e-6),1-1e-6);
  const maxv=m*(1-m)*0.98, v=Math.min(s*s,maxv);
  const k=m*(1-m)/v-1;
  return [Math.max(k*m,0.05), Math.max(k*(1-m),0.05)];
}

const pct=(sorted,q)=>{
  const i=(sorted.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i);
  return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);
};

/* ============================== the model ============================== */

function runModel(o){
  const n = Math.max(1000, Math.min(50000, Math.round(o.iters)));
  const mult = o.herdInc / o.stateInc;                     // county scaling
  const [wa,wb] = betaFromMeanSd(o.whpMean*mult, o.whpSd*mult);

  /* lognormal parameters from arithmetic mean + geometric SD */
  const sSig = Math.log(o.shedGsd), sMu = Math.log(o.shedMean) - sSig*sSig/2;
  const cSig = Math.log(o.ccGsd),   cMu = Math.log(o.ccMean)   - cSig*cSig/2;

  const uR=lhs(n), uShed=lhs(n), uCc=lhs(n), uCcP=lhs(n), uPs=lhs(n);

  const risk=new Float64Array(n), dose=new Float64Array(n), btm=new Float64Array(n);
  const X={ r:new Float64Array(n), susc:new Float64Array(n), bcg:new Float64Array(n),
            whp:new Float64Array(n), shed:new Float64Array(n), ccP:new Float64Array(n),
            ccC:new Float64Array(n), pShed:new Float64Array(n) };

  const lrPast = o.pasteurised ? o.pastLr : 0;
  const ccFac  = o.pasteurised ? o.ccPastFactor : 1;
  const lrMat  = o.maturation / o.dValue;
  const survival = Math.pow(10, -(lrMat + lrPast));
  const concFactor = o.milkPerKg * 1000 * o.curdRet / 1000;   // CFU/mL milk -> CFU/g cheese

  for(let i=0;i<n;i++){
    // farm module
    const whp   = rbeta(wa,wb);
    const pShed = o.pShedLo + uPs[i]*(o.pShedHi-o.pShedLo);
    const shed  = Math.exp(sMu + sSig*qnorm(uShed[i]));
    const bulk  = whp * pShed * shed;                       // CFU/mL bulk tank milk

    // processing module
    const initial  = bulk * concFactor;                     // CFU/g fresh curd
    const survived = initial * survival;                    // CFU/g at sale

    // post-process cross-contamination
    const hit = uCcP[i] < o.ccProb ? 1 : 0;
    const ccC = Math.exp(cMu + cSig*qnorm(uCc[i])) * ccFac;
    const cheeseConc = survived + hit*ccC;

    // exposure
    const d = cheeseConc * o.serving;                       // CFU per serving

    // dose-response
    const r  = o.rDist==='loguniform'
             ? Math.exp(Math.log(o.rLo) + uR[i]*(Math.log(o.rHi)-Math.log(o.rLo)))
             : o.rLo + uR[i]*(o.rHi-o.rLo);
    const su = rbeta(o.suscA,o.suscB);
    const bc = rbeta(o.bcgA,o.bcgB);
    const rEff = r * su * (1 - bc*o.bcgVe);

    const pServ = 1 - Math.exp(-rEff*d);
    const pYear = 1 - Math.pow(1-pServ, o.servingsYear);

    risk[i]=pYear; dose[i]=d; btm[i]=bulk;
    X.r[i]=r; X.susc[i]=su; X.bcg[i]=bc; X.whp[i]=whp;
    X.shed[i]=shed; X.ccP[i]=hit; X.ccC[i]=ccC; X.pShed[i]=pShed;
  }

  const sorted = Float64Array.from(risk).sort();
  const mean = a => { let s=0; for(let i=0;i<a.length;i++) s+=a[i]; return s/a.length; };
  const meanRisk = mean(risk);
  const sd = (()=>{ let s=0; for(let i=0;i<n;i++){const d=risk[i]-meanRisk; s+=d*d;} return Math.sqrt(s/(n-1)); })();

  const cases = meanRisk * o.consumers;

  return {
    n, risk, dose, btm, X,
    meanRisk, sd,
    median: pct(sorted,0.5), p05: pct(sorted,0.05), p95: pct(sorted,0.95),
    p25: pct(sorted,0.25), p75: pct(sorted,0.75), max: sorted[n-1], min: sorted[0],
    riskServing: meanRisk / o.servingsYear,
    meanDose: mean(dose), meanBtm: mean(btm),
    lrMat, lrPast, lrTotal: lrMat+lrPast, survival,
    cases, dalys: cases*o.daly,
    whoRatio: meanRisk/1e-6,
    src: srcAnalysis(X, risk)
  };
}

/* standardised regression coefficients */
function srcAnalysis(X, y){
  const keys = Object.keys(X), n = y.length, k = keys.length;
  const z = keys.map(key=>{
    const a=X[key]; let m=0; for(let i=0;i<n;i++) m+=a[i]; m/=n;
    let s=0; for(let i=0;i<n;i++){const d=a[i]-m; s+=d*d;} s=Math.sqrt(s/(n-1))||1e-12;
    const out=new Float64Array(n); for(let i=0;i<n;i++) out[i]=(a[i]-m)/s; return out;
  });
  let my=0; for(let i=0;i<n;i++) my+=y[i]; my/=n;
  let sy=0; for(let i=0;i<n;i++){const d=y[i]-my; sy+=d*d;} sy=Math.sqrt(sy/(n-1))||1e-12;
  const zy=new Float64Array(n); for(let i=0;i<n;i++) zy[i]=(y[i]-my)/sy;

  // normal equations
  const A=[], b=[];
  for(let i=0;i<k;i++){
    A.push(new Float64Array(k));
    let s=0; for(let t=0;t<n;t++) s+=z[i][t]*zy[t]; b.push(s/(n-1));
    for(let j=0;j<k;j++){ let q=0; for(let t=0;t<n;t++) q+=z[i][t]*z[j][t]; A[i][j]=q/(n-1); }
  }
  for(let i=0;i<k;i++) A[i][i]+=1e-8;
  // gaussian elimination
  const M=A.map((row,i)=>Array.from(row).concat([b[i]]));
  for(let c=0;c<k;c++){
    let p=c; for(let r2=c+1;r2<k;r2++) if(Math.abs(M[r2][c])>Math.abs(M[p][c])) p=r2;
    const t=M[c]; M[c]=M[p]; M[p]=t;
    for(let r2=0;r2<k;r2++){ if(r2===c||Math.abs(M[c][c])<1e-14) continue;
      const f=M[r2][c]/M[c][c]; for(let j=c;j<=k;j++) M[r2][j]-=f*M[c][j]; }
  }
  const beta=M.map((row,i)=>Math.abs(row[i])<1e-14?0:row[k]/row[i]);
  let r2=0; for(let i=0;i<k;i++) r2+=beta[i]*b[i];

  const names={ r:'Infectivity r (dose–response)', ccC:'Cross-contamination level (CFU/g)',
    ccP:'Cross-contamination occurrence', shed:'Shedding concentration (CFU/mL)',
    whp:'Within-herd prevalence', susc:'Oral susceptibility', bcg:'BCG coverage',
    pShed:'P(shedding into milk)' };
  return { r2: Math.max(0,Math.min(1,r2)),
    terms: keys.map((key,i)=>({key, name:names[key]||key, src:beta[i]}))
      .sort((a,b2)=>Math.abs(b2.src)-Math.abs(a.src)) };
}

const TEXT_KEYS = new Set(['profile','cheese','rDist','dateClear','dateMake','dateLoss']);
function gather(){
  const o={};
  for(const k in P) o[k] = TEXT_KEYS.has(k) ? String(P[k].v) : Number(P[k].v);
  return o;
}

/* ============================== formatting ============================== */

function sci(x,d=2){
  if(!isFinite(x)) return '—';
  if(x===0) return '0';
  if(x>=0.01 && x<10000) return x.toLocaleString('en-IE',{maximumFractionDigits:d+2});
  const e=Math.floor(Math.log10(Math.abs(x)));
  const m=(x/Math.pow(10,e)).toFixed(d);
  return `${m}×10${sup(e)}`;
}
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sup = e => String(e).split('').map(c=>SUP[c]||c).join('');
const fix = (x,d=2) => isFinite(x)? x.toFixed(d) : '—';

function band(meanRisk){
  if(meanRisk < 1e-6) return {cls:'low',  text:'Low modelled risk', note:'Below the WHO 10⁻⁶ per person per year reference level.'};
  if(meanRisk < 1e-5) return {cls:'mod',  text:'Moderate modelled risk', note:'Above the WHO reference level but within one order of magnitude.'};
  return {cls:'high', text:'Elevated modelled risk', note:'More than ten times the WHO reference level.'};
}

/* ============================== charts ============================== */

function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function setup(cv,h){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const w=cv.clientWidth||600;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.height=h+'px';
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,w,h);
  return {c,w,h};
}

function axes(c,L,T,W,H,opts){
  c.strokeStyle=css('--line'); c.lineWidth=1;
  c.beginPath(); c.moveTo(L,T); c.lineTo(L,T+H); c.lineTo(L+W,T+H); c.stroke();
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif';
  if(opts.ylab){ c.save(); c.translate(12,T+H/2); c.rotate(-Math.PI/2); c.textAlign='center'; c.fillText(opts.ylab,0,0); c.restore(); }
  if(opts.xlab){ c.textAlign='center'; c.fillText(opts.xlab,L+W/2,T+H+34); }
}

/* histogram of log10 annual risk */
function chartHist(cv,res){
  const {c,w,h}=setup(cv,280);
  const L=52,T=16,W=w-L-16,H=h-T-50;
  const logs=[]; for(let i=0;i<res.risk.length;i++){ const v=res.risk[i]; if(v>0) logs.push(Math.log10(v)); }
  if(!logs.length) return;
  let lo=Math.floor(Math.min(...logs)), hi=Math.ceil(Math.max(...logs));
  if(hi-lo<2) hi=lo+2;
  const nb=44, bins=new Array(nb).fill(0);
  for(const v of logs){ let b=Math.floor((v-lo)/(hi-lo)*nb); if(b>=nb)b=nb-1; if(b<0)b=0; bins[b]++; }
  const mx=Math.max(...bins)||1;
  const x=v=>L+(v-lo)/(hi-lo)*W;

  // grid
  c.strokeStyle=css('--line'); c.lineWidth=1; c.setLineDash([2,4]);
  for(let e=lo;e<=hi;e++){ c.beginPath(); c.moveTo(x(e),T); c.lineTo(x(e),T+H); c.stroke(); }
  c.setLineDash([]);

  // bars
  const bw=W/nb;
  for(let i=0;i<nb;i++){
    const bh=bins[i]/mx*H;
    const centre=lo+(i+0.5)*(hi-lo)/nb;
    c.fillStyle = centre < -6 ? css('--brand') : (centre < -5 ? css('--mod') : css('--high'));
    c.globalAlpha=.82; c.fillRect(L+i*bw, T+H-bh, Math.max(bw-1,1), bh); c.globalAlpha=1;
  }

  // WHO line
  if(-6>=lo && -6<=hi){
    c.strokeStyle=css('--high'); c.lineWidth=1.6; c.setLineDash([5,4]);
    c.beginPath(); c.moveTo(x(-6),T-4); c.lineTo(x(-6),T+H); c.stroke(); c.setLineDash([]);
    c.fillStyle=css('--high'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
    c.fillText('WHO 10⁻⁶', Math.min(x(-6)+5, L+W-56), T+8);
  }
  // percentile markers
  [[res.p05,'5th'],[res.median,'median'],[res.p95,'95th']].forEach(([v,lab])=>{
    if(v<=0) return; const px=x(Math.log10(v)); if(px<L||px>L+W) return;
    c.strokeStyle=css('--ink-2'); c.lineWidth=1; c.beginPath(); c.moveTo(px,T+H); c.lineTo(px,T+H+6); c.stroke();
    c.fillStyle=css('--muted'); c.font='10px Inter,sans-serif'; c.textAlign='center'; c.fillText(lab,px,T+H+17);
  });

  axes(c,L,T,W,H,{xlab:'log₁₀ annual probability of infection per consumer',ylab:'iterations'});
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif'; c.textAlign='right';
  for(let e=lo;e<=hi;e++) c.fillText(String(e), x(e)+14, T+H+16);
  c.textAlign='right'; c.fillText(String(mx), L-6, T+10); c.fillText('0', L-6, T+H+3);
}

/* horizontal bars with optional error bars, log x-axis */
function chartBarsLog(cv, rows, opts){
  const h = 54 + rows.length*34;
  const {c,w}=setup(cv,h);
  const L=Math.min(150, w*0.34), T=12, W=w-L-54, H=h-T-40;
  const vals=rows.flatMap(r=>[r.v,r.lo,r.hi].filter(v=>v>0));
  let lo=Math.floor(Math.log10(Math.min(...vals)))-0.2, hi=Math.ceil(Math.log10(Math.max(...vals,1e-6)))+0.2;
  const x=v=>L+(Math.log10(v)-lo)/(hi-lo)*W;
  const bh=Math.min(20, H/rows.length*0.55);

  c.strokeStyle=css('--line'); c.setLineDash([2,4]);
  for(let e=Math.ceil(lo);e<=Math.floor(hi);e++){ c.beginPath(); c.moveTo(x(Math.pow(10,e)),T); c.lineTo(x(Math.pow(10,e)),T+H); c.stroke();
    c.setLineDash([]); c.fillStyle=css('--muted'); c.font='10.5px Inter,sans-serif'; c.textAlign='center';
    c.fillText('10'+sup(e), x(Math.pow(10,e)), T+H+16); c.setLineDash([2,4]); }
  c.setLineDash([]);

  rows.forEach((r,i)=>{
    const y=T+(i+0.5)*(H/rows.length);
    c.fillStyle=css('--ink-2'); c.font='12.5px Inter,sans-serif'; c.textAlign='right';
    c.fillText(r.label.length>24?r.label.slice(0,23)+'…':r.label, L-10, y+4);
    c.fillStyle = r.colour || css('--brand');
    c.globalAlpha = (r.lo>0 && r.hi>0) ? 0.34 : 0.85;
    c.fillRect(L, y-bh/2, Math.max(x(r.v)-L,2), bh);
    c.globalAlpha = 1;
    c.fillRect(Math.max(x(r.v)-2,L), y-bh/2-2, 3, bh+4);
    if(r.lo>0 && r.hi>0){
      c.strokeStyle=css('--ink-2'); c.lineWidth=1.3;
      c.beginPath(); c.moveTo(x(r.lo),y); c.lineTo(x(r.hi),y);
      c.moveTo(x(r.lo),y-5); c.lineTo(x(r.lo),y+5);
      c.moveTo(x(r.hi),y-5); c.lineTo(x(r.hi),y+5); c.stroke();
    }
    c.fillStyle=css('--muted'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
    c.fillText(sci(r.v,2), Math.min(x(r.hi>0?r.hi:r.v)+8, L+W+2), y+3.5);
  });

  if(opts&&opts.ref){
    const px=x(opts.ref);
    c.strokeStyle=css('--high'); c.lineWidth=1.6; c.setLineDash([5,4]);
    c.beginPath(); c.moveTo(px,T); c.lineTo(px,T+H); c.stroke(); c.setLineDash([]);
    c.fillStyle=css('--high'); c.font='600 10px Inter,sans-serif'; c.textAlign='center';
    c.fillText(opts.refLabel||'reference', px, T+H+30);
  }
  c.strokeStyle=css('--line'); c.lineWidth=1; c.beginPath(); c.moveTo(L,T); c.lineTo(L,T+H); c.stroke();
}

/* tornado */
function chartTornado(cv, terms){
  const rows=terms.slice(0,8);
  const h=46+rows.length*30;
  const {c,w}=setup(cv,h);
  const L=Math.min(185,w*0.40), T=10, W=w-L-54, H=h-T-32;
  const mx=Math.max(...rows.map(r=>Math.abs(r.src)),0.1)*1.12;
  const x0=L, x=v=>L+Math.abs(v)/mx*W;
  c.strokeStyle=css('--line'); c.setLineDash([2,4]);
  [0.25,0.5,0.75,1].forEach(f=>{ c.beginPath(); c.moveTo(L+f*W/1.12*1,T); c.lineTo(L+f*W/1.12*1,T+H); c.stroke(); });
  c.setLineDash([]);
  rows.forEach((r,i)=>{
    const y=T+(i+0.5)*(H/rows.length);
    c.fillStyle=css('--ink-2'); c.font='12px Inter,sans-serif'; c.textAlign='right';
    const lab=r.name.length>30?r.name.slice(0,29)+'…':r.name;
    c.fillText(lab, L-10, y+4);
    c.fillStyle = r.src>=0 ? css('--brand') : css('--mod');
    c.fillRect(x0, y-8, Math.max(x(r.src)-x0,2), 16);
    c.fillStyle=css('--muted'); c.font='600 11px Inter,sans-serif'; c.textAlign='left';
    c.fillText(r.src.toFixed(3), x(r.src)+7, y+4);
  });
  c.strokeStyle=css('--line'); c.beginPath(); c.moveTo(L,T); c.lineTo(L,T+H); c.stroke();
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif'; c.textAlign='center';
  c.fillText('|standardised regression coefficient|', L+W/2, T+H+22);
}

/* dose–response curve */
function chartDR(cv,o,res){
  const {c,w,h}=setup(cv,270);
  const L=58,T=14,W=w-L-18,H=h-T-48;
  const lo=-6, hi=3;                            // log10 dose, CFU
  const x=v=>L+(v-lo)/(hi-lo)*W;
  const ylo=-12, yhi=0;
  const y=v=>T+H-(v-ylo)/(yhi-ylo)*H;

  c.strokeStyle=css('--line'); c.setLineDash([2,4]);
  for(let e=lo;e<=hi;e+=1){ c.beginPath(); c.moveTo(x(e),T); c.lineTo(x(e),T+H); c.stroke(); }
  for(let e=ylo;e<=yhi;e+=2){ c.beginPath(); c.moveTo(L,y(e)); c.lineTo(L+W,y(e)); c.stroke(); }
  c.setLineDash([]);

  const f=0.2*(1-0.8*o.bcgVe);                  // mean susceptibility × BCG term
  const curve=(r,col,wid,dash)=>{
    c.strokeStyle=col; c.lineWidth=wid; c.setLineDash(dash||[]); c.beginPath();
    for(let i=0;i<=240;i++){
      const ld=lo+(hi-lo)*i/240, d=Math.pow(10,ld);
      const p=1-Math.exp(-r*f*d);
      const ly=Math.max(Math.log10(Math.max(p,1e-13)),ylo);
      i?c.lineTo(x(ld),y(ly)):c.moveTo(x(ld),y(ly));
    }
    c.stroke(); c.setLineDash([]);
  };
  curve(o.rHi, css('--high'), 2);
  curve(Math.sqrt(o.rLo*o.rHi), css('--brand'), 2.4);
  curve(o.rLo, css('--mod'), 2, [5,4]);

  // modelled dose marker
  if(res && res.meanDose>0){
    const ld=Math.log10(res.meanDose);
    if(ld>lo){ c.strokeStyle=css('--ink-2'); c.lineWidth=1.4; c.setLineDash([3,3]);
      c.beginPath(); c.moveTo(x(ld),T); c.lineTo(x(ld),T+H); c.stroke(); c.setLineDash([]);
      c.fillStyle=css('--ink-2'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
      c.fillText('modelled serving dose', x(ld)+5, T+12); }
  }

  axes(c,L,T,W,H,{xlab:'log₁₀ ingested dose (CFU per serving)',ylab:'log₁₀ P(infection)'});
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif';
  c.textAlign='center'; for(let e=lo;e<=hi;e++) c.fillText(String(e),x(e),T+H+16);
  c.textAlign='right';  for(let e=ylo;e<=yhi;e+=2) c.fillText(String(e),L-7,y(e)+4);

  // legend
  const items=[['r = upper bound',css('--high')],['r = geometric mean',css('--brand')],['r = lower bound',css('--mod')]];
  c.font='11px Inter,sans-serif'; c.textAlign='left';
  items.forEach(([t,col],i)=>{ const yy=T+14+i*15, xx=L+W-152;
    c.strokeStyle=col; c.lineWidth=2.4; c.beginPath(); c.moveTo(xx,yy-4); c.lineTo(xx+20,yy-4); c.stroke();
    c.fillStyle=css('--muted'); c.fillText(t,xx+26,yy); });
}

/* ============================== state ============================== */

let RESULT=null, SCENARIOS=[], STEP=0;
const REF = { mean:3.36e-7, median:1.36e-7, p05:1.30e-8, p95:1.27e-6, sd:6.72e-7,
              serving:3.49e-9, cases:0.0067, lr:2.76, dose:5.69e-4, btm:1.09e-4 };

function ensureRun(){ if(!RESULT) RESULT = runModel(gather()); return RESULT; }

/* ============================== views ============================== */

const NAV = [
  {g:'Overview'},
  {id:'home',    t:'Home'},
  {id:'start',   t:'Start here'},
  {g:'Assessment'},
  {id:'assess',  t:'Case assessment'},
  {id:'results', t:'Risk characterisation'},
  {id:'scenarios',t:'Scenario comparison'},
  {id:'sensitivity',t:'Sensitivity analysis'},
  {g:'Method'},
  {id:'dose',    t:'Dose–response'},
  {id:'spec',    t:'Model specification'},
  {id:'evidence',t:'Parameters and evidence'},
  {id:'standards',t:'Standards and benchmarks'},
  {g:'Output'},
  {id:'record',  t:'Decision record'},
  {id:'about',   t:'About and citation'}
];

const V = {};

V.home = () => {
  const r = ensureRun(); const b = band(r.meanRisk);
  return `
  <div class="hero">
    <div class="ht">
      <div class="eyebrow" style="color:#5fe0cf">DAFM PSSRC Topic 8.1 · Teagasc Moorepark</div>
      <h1>What is the risk from cheese made before a herd lost its TB-free status?</h1>
      <p>A farm-to-fork quantitative microbial risk assessment for <em>Mycobacterium bovis</em> in
      unpasteurised cheese, built on Irish surveillance data and run in your browser.</p>
      <div class="tagrow"><span>EFSA four-step framework</span><span>Monte Carlo, Latin hypercube</span>
      <span>CSO DAA01 / DAQ01</span><span>County-level scenarios</span></div>
    </div>
    <div class="hi"><img src="assets/hero.jpg" alt="Irish dairy herd, raw milk and cheese with a risk-assessment overlay"></div>
  </div>

  <h2 style="border:0;padding-top:22px">Reference case</h2>
  <p class="lead">Scenario A, a 57-cow herd at the 2023 state herd incidence of 4.94%, making
  Caerphilly-style raw-milk cheese sold at 153 days. ${r.n.toLocaleString()} iterations.</p>
  <div class="grid g4" style="margin-top:14px">
    ${tile('Mean annual risk', sci(r.meanRisk), 'per consumer per year', true)}
    ${tile('Median annual risk', sci(r.median), '50th percentile')}
    ${tile('95th percentile', sci(r.p95), 'upper uncertainty bound')}
    ${tile('Expected cases', fix(r.cases,4), `in ${Number(val('consumers')).toLocaleString()} consumers`)}
  </div>
  <div style="margin-top:14px"><span class="pill ${b.cls}">${b.text}</span>
  <span class="small" style="margin-left:8px">${b.note}</span></div>

  <div class="chartbox" style="margin-top:20px">
    <h3>Distribution of modelled annual risk</h3>
    <div class="cap">Each bar counts Monte Carlo iterations. The dashed line is the WHO tolerable
    risk reference of 10⁻⁶ infections per person per year.</div>
    <canvas id="c-hist"></canvas>
  </div>

  <h2>What this tool does</h2>
  <div class="grid g3">
    <div class="card"><h3>Translates surveillance into exposure</h3><p class="small">Herd incidence,
    within-herd prevalence and shedding are carried through bulk-tank dilution, curd partitioning and
    maturation to a concentration on the plate.</p></div>
    <div class="card"><h3>Keeps uncertainty visible</h3><p class="small">Every input is a distribution,
    not a point. Results are reported as percentile bands, because the dominant parameter — oral
    infectivity — has no validated human estimate.</p></div>
    <div class="card"><h3>Leaves an audit trail</h3><p class="small">Each input carries its provenance.
    The decision record reproduces the full parameter set alongside the result, so a case can be
    re-run and checked later.</p></div>
  </div>

  <div class="warn" style="margin-top:20px"><strong>Research demonstration.</strong> Outputs are
  decision-support evidence for risk managers, not a legal safe/unsafe determination and not a
  regulatory decision tool. The infectivity parameter spans four orders of magnitude.</div>

  <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn" data-go="assess">Start an assessment</button>
    <button class="btn ghost" data-go="spec">Read the model specification</button>
  </div>` ;
};
V.home.after = () => { const r=ensureRun(); chartHist(document.getElementById('c-hist'), r); };

const tile=(k,v,s,accent)=>`<div class="tile${accent?' accent':''}"><div class="k">${k}</div>
  <div class="v num">${v}</div><div class="s">${s||''}</div></div>`;

V.start = () => `
  <div class="eyebrow">Orientation</div>
  <h1>Start here</h1>
  <p class="lead">bTB-RISK Studio answers one question: given a herd that lost its TB-free status,
  what exposure did consumers of its raw-milk cheese face during the window between the last clear
  test and the restriction?</p>

  <h2>The regulatory gap this addresses</h2>
  <div class="grid g3">
    <div class="card"><div class="eyebrow">Safe zone</div><p class="small">The herd tests clear.
    Milk enters the vat under normal rules and cheese is made and sold.</p></div>
    <div class="card" style="border-left:3px solid var(--mod)"><div class="eyebrow" style="color:var(--mod)">Risk window</div>
    <p class="small">Infection is present but undetected. Cheese produced in this window has already
    been made, matured and in many cases sold before anyone knows.</p></div>
    <div class="card"><div class="eyebrow">Detection</div><p class="small">A later test or
    post-mortem finding removes TB-free status. The question becomes retrospective: what was the
    exposure, and does any action follow?</p></div>
  </div>

  <h2>How to use it</h2>
  <div class="tablewrap"><table>
    <tr><th>Step</th><th>What you do</th><th>What it affects</th></tr>
    <tr><td>1. Case and county</td><td>Enter the herd, its county incidence and the three key dates.</td><td>Prevalence scaling, exposure window</td></tr>
    <tr><td>2. Herd and bulk tank</td><td>Accept or adjust prevalence and shedding assumptions.</td><td>Bulk-tank concentration</td></tr>
    <tr><td>3. Cheese manufacture</td><td>Milk-to-cheese ratio and curd retention.</td><td>Concentration into curd</td></tr>
    <tr><td>4. Maturation</td><td>Cheese type, D-value and age at sale; pasteurisation if used.</td><td>Log reduction</td></tr>
    <tr><td>5. Cross-contamination</td><td>Probability and level of post-process contamination.</td><td>Practical risk floor</td></tr>
    <tr><td>6. Consumption and dose–response</td><td>Serving size, frequency, population, infectivity range.</td><td>Dose and probability of infection</td></tr>
  </table></div>

  <h2>Reading the provenance tags</h2>
  <p>Every input on the assessment pages is tagged, so a reviewer can tell a published value from a
  working assumption.</p>
  <div class="legend">
    <span><i style="background:var(--brand)"></i><strong>Literature</strong> — taken from a cited published source</span>
    <span><i style="background:var(--mod)"></i><strong>Demonstration</strong> — a working assumption, calibrated not measured</span>
    <span><i style="background:var(--muted)"></i><strong>User</strong> — case facts you supply</span>
  </div>

  <div class="note" style="margin-top:18px">Nothing you type is uploaded. The Monte Carlo runs in
  this browser tab and the decision record is generated locally.</div>

  <div style="margin-top:20px"><button class="btn" data-go="assess">Go to the assessment</button></div>`;

/* ---------- assessment ---------- */

const STEPS = [
  { t:'Case and county', fields:['profile','herdInc','stateInc','herdSize','dateClear','dateMake','dateLoss'] },
  { t:'Herd and bulk tank', fields:['whpMean','whpSd','pShedLo','pShedHi','shedMean','shedGsd'] },
  { t:'Cheese manufacture', fields:['milkPerKg','curdRet'] },
  { t:'Maturation and processing', fields:['cheese','dValue','maturation','pasteurised','pastLr'] },
  { t:'Cross-contamination', fields:['ccProb','ccMean','ccGsd','ccPastFactor'] },
  { t:'Consumption and dose–response', fields:['serving','servingsYear','consumers','rDist','rLo','rHi','suscA','suscB','bcgA','bcgB','bcgVe','daly','iters'] }
];

const SRCLAB={lit:'Literature',cal:'Demonstration',usr:'User'};

function field(k){
  const p=P[k]; const id='f-'+k;
  let ctrl;
  if(k==='profile'){
    ctrl=`<select id="${id}" data-k="${k}">${Object.entries(PROFILES).map(([v,o])=>
      `<option value="${v}"${p.v===v?' selected':''}>${o.name} — ${o.ctx}</option>`).join('')}</select>`;
  } else if(k==='cheese'){
    ctrl=`<select id="${id}" data-k="${k}">${Object.entries(CHEESE).map(([v,o])=>
      `<option value="${v}"${p.v===v?' selected':''}>${o.label} — D = ${o.d} d</option>`).join('')}</select>`;
  } else if(k==='rDist'){
    ctrl=`<select id="${id}" data-k="${k}">
      <option value="uniform"${p.v==='uniform'?' selected':''}>Uniform (reference workbook)</option>
      <option value="loguniform"${p.v==='loguniform'?' selected':''}>Log-uniform (conservative lower tail)</option></select>`;
  } else if(k==='pasteurised'){
    ctrl=`<select id="${id}" data-k="${k}">
      <option value="0"${Number(p.v)===0?' selected':''}>No — raw milk</option>
      <option value="1"${Number(p.v)===1?' selected':''}>Yes — pasteurised</option></select>`;
  } else if(k.startsWith('date')){
    ctrl=`<input type="date" id="${id}" data-k="${k}" value="${p.v}">`;
  } else {
    ctrl=`<input type="number" id="${id}" data-k="${k}" value="${p.v}" step="${p.step||'any'}">`;
  }
  return `<div class="field">
    <label for="${id}">${p.label} <span class="src ${p.src}">· ${SRCLAB[p.src]}</span></label>
    ${ctrl}${p.note?`<div class="hint">${p.note}</div>`:''}</div>`;
}

V.assess = () => {
  const s=STEPS[STEP];
  return `
  <div class="eyebrow">Assessment</div>
  <h1>Case assessment</h1>
  <p class="lead">Six steps from case facts to a risk estimate. Values carry over between steps and
  the model re-runs when you press Run.</p>
  <div class="steps">${STEPS.map((x,i)=>
    `<button data-step="${i}" class="${i===STEP?'on':''}">${i+1}. ${x.t}</button>`).join('')}</div>
  <div class="card">
    <h3 style="margin-top:0">${STEP+1}. ${s.t}</h3>
    ${stepIntro(STEP)}
    <div class="grid g2" style="margin-top:14px">${s.fields.map(field).join('')}</div>
    ${stepReadout(STEP)}
  </div>
  <div style="display:flex;gap:10px;margin-top:14px">
    <button class="btn ghost" data-step="${Math.max(0,STEP-1)}"${STEP===0?' disabled':''}>Previous</button>
    <button class="btn ghost" data-step="${Math.min(STEPS.length-1,STEP+1)}"${STEP===STEPS.length-1?' disabled':''}>Next step</button>
  </div>
  <div class="runbar">
    <button class="btn" id="run">Run ${Number(val('iters')).toLocaleString()} iterations</button>
    <div class="st" id="runstate">${RESULT?`Last run: mean annual risk ${sci(RESULT.meanRisk)}`:'Not yet run with these values.'}</div>
    <button class="btn ghost" data-go="results" style="margin-left:auto">View results</button>
  </div>`;
};

function stepIntro(i){
  const t=[
    'County herd incidence scales within-herd prevalence relative to the state average. The dates record the exposure window; they are carried into the decision record and do not alter the calculation.',
    'The farm module converts herd status into a bulk-tank concentration. Because each cow contributes milk in proportion to her yield, dilution is handled by the prevalence term rather than a separate volume step.',
    'Milk-to-cheese ratio and curd retention set how far organisms are concentrated when milk becomes curd.',
    'Maturation is modelled as first-order inactivation. Log reduction is the ratio of age at sale to the D-value at ripening temperature.',
    'Post-process contamination bypasses maturation entirely, which is why it becomes the practical risk floor once the cheese is well matured or the milk is pasteurised.',
    'Exposure is a serving size and an annual frequency. The exponential dose–response model needs an infectivity parameter r for which no validated human oral estimate exists.'
  ];
  return `<p class="small" style="max-width:70ch">${t[i]}</p>`;
}

function stepReadout(i){
  const o=gather();
  if(i===0){
    const m=(o.herdInc/o.stateInc);
    const d1=new Date(o.dateClear), d2=new Date(o.dateLoss);
    const days=isFinite(d1)&&isFinite(d2)?Math.round((d2-d1)/864e5):0;
    return `<dl class="kv"><dt>Prevalence multiplier</dt><dd>${fix(m,2)}×</dd>
      <dt>Exposure window</dt><dd>${days} days between last clear test and status loss</dd>
      <dt>Profile band</dt><dd>${PROFILES[o.profile].band}</dd></dl>`;
  }
  if(i===1){
    const m=(o.herdInc/o.stateInc);
    const btm=o.whpMean*m*((o.pShedLo+o.pShedHi)/2)*o.shedMean;
    return `<dl class="kv"><dt>Expected bulk-tank concentration</dt><dd>${sci(btm)} CFU/mL</dd>
      <dt>Reference workbook</dt><dd>${sci(REF.btm)} CFU/mL</dd></dl>`;
  }
  if(i===2){
    const m=(o.herdInc/o.stateInc);
    const btm=o.whpMean*m*((o.pShedLo+o.pShedHi)/2)*o.shedMean;
    return `<dl class="kv"><dt>Concentration factor</dt><dd>${fix(o.milkPerKg*o.curdRet,2)}× (per gram of cheese vs per mL of milk)</dd>
      <dt>Fresh curd concentration</dt><dd>${sci(btm*o.milkPerKg*o.curdRet)} CFU/g</dd></dl>`;
  }
  if(i===3){
    const lr=o.maturation/o.dValue + (o.pasteurised?o.pastLr:0);
    return `<dl class="kv"><dt>Log reduction</dt><dd>${fix(lr,2)} log₁₀</dd>
      <dt>Surviving fraction</dt><dd>${sci(Math.pow(10,-lr))}</dd>
      <dt>Reference workbook</dt><dd>${REF.lr} log₁₀ (Caerphilly, 153 d)</dd></dl>`;
  }
  if(i===4){
    const e=o.ccProb*o.ccMean*(o.pasteurised?o.ccPastFactor:1);
    return `<dl class="kv"><dt>Expected contribution</dt><dd>${sci(e)} CFU/g averaged over all servings</dd></dl>`;
  }
  const rm=o.rDist==='uniform'?(o.rLo+o.rHi)/2:(o.rHi-o.rLo)/Math.log(o.rHi/o.rLo);
  const su=o.suscA/(o.suscA+o.suscB), bc=o.bcgA/(o.bcgA+o.bcgB);
  return `<dl class="kv"><dt>Mean r</dt><dd>${sci(rm)}</dd>
    <dt>Mean susceptibility</dt><dd>${fix(su,3)}</dd>
    <dt>Mean BCG coverage</dt><dd>${fix(bc,3)} (effectiveness ${o.bcgVe})</dd>
    <dt>Mean effective r</dt><dd>${sci(rm*su*(1-bc*o.bcgVe))}</dd></dl>`;
}

/* ---------- results ---------- */

V.results = () => {
  const r=ensureRun(), o=gather(), b=band(r.meanRisk);
  return `
  <div class="eyebrow">Risk characterisation</div>
  <h1>Risk characterisation</h1>
  <p class="lead">${PROFILES[o.profile].name}, ${o.herdSize} cows, ${CHEESE[o.cheese].label} at
  ${o.maturation} days${o.pasteurised?', pasteurised milk':''}. ${r.n.toLocaleString()} iterations,
  Latin hypercube sampling.</p>

  <div style="margin:14px 0"><span class="pill ${b.cls}">${b.text}</span>
    <span class="pill" style="margin-left:6px">WHO ratio ${fix(r.whoRatio,3)}</span></div>

  <div class="grid g4">
    ${tile('Mean annual risk', sci(r.meanRisk),'per consumer per year',true)}
    ${tile('Median', sci(r.median),'50th percentile')}
    ${tile('5th–95th', `${sci(r.p05,1)} – ${sci(r.p95,1)}`,'90% uncertainty interval')}
    ${tile('Standard deviation', sci(r.sd),'across iterations')}
  </div>
  <div class="grid g4" style="margin-top:14px">
    ${tile('Risk per serving', sci(r.riskServing),'single eating occasion')}
    ${tile('Expected cases', fix(r.cases,4),`in ${o.consumers.toLocaleString()} consumers / year`)}
    ${tile('Disease burden', fix(r.dalys,4),`DALYs at ${o.daly} per case`)}
    ${tile('Maximum iteration', sci(r.max),'worst sampled combination')}
  </div>

  <div class="chartbox" style="margin-top:20px">
    <h3>Distribution of annual risk</h3>
    <div class="cap">Teal bars fall below the WHO 10⁻⁶ reference, amber between 10⁻⁶ and 10⁻⁵, red above.</div>
    <canvas id="c-hist2"></canvas>
  </div>

  <h2>Exposure pathway</h2>
  <div class="tablewrap"><table>
    <tr><th>Stage</th><th>Quantity</th><th>This run</th><th>Reference workbook</th></tr>
    <tr><td>Bulk tank milk</td><td>Mean concentration</td><td class="num">${sci(r.meanBtm)} CFU/mL</td><td class="num">${sci(REF.btm)} CFU/mL</td></tr>
    <tr><td>Processing</td><td>Total log reduction</td><td class="num">${fix(r.lrTotal,2)}</td><td class="num">${REF.lr}</td></tr>
    <tr><td>Processing</td><td>Surviving fraction</td><td class="num">${sci(r.survival)}</td><td class="num">—</td></tr>
    <tr><td>Consumption</td><td>Mean dose per serving</td><td class="num">${sci(r.meanDose)} CFU</td><td class="num">${sci(REF.dose)} CFU</td></tr>
    <tr><td>Risk</td><td>Per serving</td><td class="num">${sci(r.riskServing)}</td><td class="num">${sci(REF.serving)}</td></tr>
    <tr><td>Risk</td><td>Annual, per consumer</td><td class="num">${sci(r.meanRisk)}</td><td class="num">${sci(REF.mean)}</td></tr>
  </table></div>
  <p class="small">The reference column is the @RISK workbook that this engine reimplements
  (Teagasc bTB QMRA DAFM decision tool, 19 May 2026), shown for the reference case only. Differences
  of a few per cent are Monte Carlo sampling error. The percentile band differs more, because this
  engine and the workbook do not use identical distribution shapes for every input.</p>

  <h2>Interpretation</h2>
  <p>${b.note} Percentile ranges carry more information than the point estimate here, because the
  spread is driven by an infectivity parameter that is bounded by expert reasoning rather than
  measured in humans. Read the result as evidence about the plausible magnitude of exposure, not as
  a prediction of cases.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
    <button class="btn ghost" data-go="sensitivity">What drives this estimate?</button>
    <button class="btn ghost" data-go="record">Generate decision record</button>
  </div>`;
};
V.results.after = () => chartHist(document.getElementById('c-hist2'), ensureRun());

/* ---------- scenarios ---------- */

V.scenarios = () => {
  const base=gather();
  const rows=Object.entries(PROFILES).map(([k,prof])=>{
    const o={...base, profile:k, herdInc: k==='E'?base.herdInc:prof.inc, iters:Math.min(base.iters,8000)};
    const res=runModel(o);
    return {k,prof,res,inc:o.herdInc};
  });
  const past=runModel({...base, pasteurised:1, iters:Math.min(base.iters,8000)});
  SCENARIOS=rows;
  return `
  <div class="eyebrow">Policy analysis</div>
  <h1>Scenario comparison</h1>
  <p class="lead">The same method applied to different county profiles. Multipliers are the ratio of
  county herd incidence to the state average, so a scenario can be rebuilt for any RVO by entering
  its current figure on step 1.</p>

  <div class="tablewrap" style="margin-top:14px"><table>
    <tr><th>Scenario</th><th>County context</th><th>Herd incidence</th><th>Multiplier</th>
    <th>Mean annual risk</th><th>95th percentile</th><th>Band</th></tr>
    ${rows.map(({k,prof,res,inc})=>{const b=band(res.meanRisk);return `<tr>
      <td><strong>${k}</strong> · ${prof.name.slice(4)}</td>
      <td>${prof.ctx}</td><td class="num">${fix(inc,2)}%</td>
      <td class="num">${fix(inc/base.stateInc,2)}×</td>
      <td class="num">${sci(res.meanRisk)}</td><td class="num">${sci(res.p95)}</td>
      <td><span class="pill ${b.cls}">${prof.band}</span></td></tr>`;}).join('')}
  </table></div>

  <div class="chartbox" style="margin-top:18px">
    <h3>Annual risk by scenario</h3>
    <div class="cap">Bars show the mean; whiskers span the 5th to 95th percentile. The dashed line is
    the WHO 10⁻⁶ reference.</div>
    <canvas id="c-scen"></canvas>
    <p class="small" style="margin-bottom:0">A four-fold rise in herd incidence moves the mean risk by
    well under a factor of two. That is not a rounding artefact: once the cheese is well matured, most
    of the dose arrives after processing, and post-process contamination does not scale with herd
    status. County incidence governs what enters the vat; hygiene governs what reaches the plate.</p>
  </div>

  <h2>Raw milk against pasteurisation</h2>
  <div class="tablewrap"><table>
    <tr><th>Metric</th><th>Raw milk, ${base.maturation} d</th><th>Pasteurised</th><th>Difference</th></tr>
    <tr><td>Processing log reduction</td><td class="num">${fix(base.maturation/base.dValue,2)}</td>
      <td class="num">${fix(base.maturation/base.dValue+base.pastLr,2)}</td><td class="num">${fix(base.pastLr,1)} log more</td></tr>
    <tr><td>Mean dose per serving</td><td class="num">${sci(rows[0].res.meanDose)} CFU</td>
      <td class="num">${sci(past.meanDose)} CFU</td>
      <td class="num">${fix(rows[0].res.meanDose/Math.max(past.meanDose,1e-30),0)}× lower</td></tr>
    <tr><td>Mean annual risk</td><td class="num">${sci(rows[0].res.meanRisk)}</td>
      <td class="num">${sci(past.meanRisk)}</td>
      <td class="num">${fix(rows[0].res.meanRisk/Math.max(past.meanRisk,1e-30),0)}× lower</td></tr>
  </table></div>
  <div class="note" style="margin-top:14px">Pasteurisation removes the organisms that came through
  the milk, so what remains is whatever reaches the cheese afterwards. Once that happens,
  post-process hygiene — not the heat step — sets the risk floor.</div>`;
};
V.scenarios.after = () => {
  const base=gather();
  chartBarsLog(document.getElementById('c-scen'),
    SCENARIOS.map(({k,prof,res})=>({label:`${k} · ${prof.ctx}`, v:res.meanRisk, lo:res.p05, hi:res.p95,
      colour: band(res.meanRisk).cls==='low'?css('--brand'):band(res.meanRisk).cls==='mod'?css('--mod'):css('--high')})),
    {ref:1e-6, refLabel:'WHO 10⁻⁶'});
};

/* ---------- sensitivity ---------- */

V.sensitivity = () => {
  const r=ensureRun();
  const top=r.src.terms[0];
  return `
  <div class="eyebrow">Sensitivity</div>
  <h1>What drives the risk estimate</h1>
  <p class="lead">Standardised regression coefficients from the current run. Each coefficient is the
  change in modelled risk, in standard deviations, for a one standard deviation change in that input
  with the others held still.</p>

  <div class="chartbox" style="margin-top:14px">
    <h3>Tornado — standardised regression coefficients</h3>
    <div class="cap">Model R² = ${fix(r.src.r2,3)} on ${r.n.toLocaleString()} iterations.</div>
    <canvas id="c-tor"></canvas>
  </div>

  <div class="tablewrap" style="margin-top:16px"><table>
    <tr><th>Rank</th><th>Input</th><th>SRC</th><th>Share of explained variance</th></tr>
    ${r.src.terms.map((t,i)=>`<tr><td>${i+1}</td><td>${t.name}</td>
      <td class="num">${t.src.toFixed(3)}</td>
      <td class="num">${fix(100*t.src*t.src/Math.max(r.src.terms.reduce((s,x)=>s+x.src*x.src,0),1e-9),1)}%</td></tr>`).join('')}
  </table></div>

  <h2>What follows from this</h2>
  <div class="grid g2" style="margin-top:12px">
    <div class="card"><h3>Dominant driver</h3><p class="small"><strong>${top.name}</strong> carries an
    SRC of ${top.src.toFixed(3)}. The infectivity term dominates because there is no validated human
    oral dose–response model for <em>M. bovis</em>; the range used here spans four orders of
    magnitude and that spread propagates directly into the output.</p></div>
    <div class="card"><h3>What is actionable</h3><p class="small">Infectivity is a research gap, not a
    control point. The inputs a risk manager can actually move are the cross-contamination terms and
    maturation age. Improving the estimate needs better oral-infectivity evidence; reducing the risk
    needs facility hygiene and age at sale.</p></div>
  </div>
  <div class="warn" style="margin-top:16px">An R² below 1 means the regression does not capture all
  the variance — the model is multiplicative, so part of the spread is interaction rather than
  linear main effects. Treat the ranking as an ordering of importance, not a variance budget.</div>`;
};
V.sensitivity.after = () => chartTornado(document.getElementById('c-tor'), ensureRun().src.terms);

/* ---------- dose–response ---------- */

V.dose = () => {
  const o=gather(), r=ensureRun();
  return `
  <div class="eyebrow">Hazard characterisation</div>
  <h1>Dose–response</h1>
  <p class="lead">The exponential model assumes each ingested organism has an independent probability
  of initiating infection. That probability, r, is the single largest uncertainty in this assessment.</p>

  <div class="eq">P(infection) = 1 − exp(−<em>r</em><sub>eff</sub> × <em>D</em>)</div>
  <div class="eq"><em>r</em><sub>eff</sub> = <em>r</em> × Susceptibility × (1 − BCG<sub>coverage</sub> × VE)</div>

  <div class="chartbox" style="margin-top:16px">
    <h3>Infection probability against ingested dose</h3>
    <div class="cap">Three curves across the r range in use. Both axes are log₁₀.</div>
    <canvas id="c-dr"></canvas>
  </div>

  <div class="tablewrap" style="margin-top:16px"><table>
    <tr><th>Term</th><th>Distribution</th><th>Mean</th><th>Basis</th></tr>
    <tr><td>r, infectivity</td><td>${o.rDist==='uniform'?'Uniform':'Log-uniform'}(${sci(o.rLo,0)}, ${sci(o.rHi,0)})</td>
      <td class="num">${sci(o.rDist==='uniform'?(o.rLo+o.rHi)/2:(o.rHi-o.rLo)/Math.log(o.rHi/o.rLo))}</td>
      <td>No validated human oral estimate. Bounds set from animal challenge studies and expert reasoning.</td></tr>
    <tr><td>Susceptibility</td><td>Beta(${o.suscA}, ${o.suscB})</td><td class="num">${fix(o.suscA/(o.suscA+o.suscB),3)}</td>
      <td>The oral route is markedly less efficient than the respiratory route.</td></tr>
    <tr><td>BCG coverage</td><td>Beta(${o.bcgA}, ${o.bcgB})</td><td class="num">${fix(o.bcgA/(o.bcgA+o.bcgB),3)}</td>
      <td>Irish universal neonatal BCG programme, historical cohorts.</td></tr>
    <tr><td>BCG effectiveness</td><td>Fixed ${o.bcgVe}</td><td class="num">${o.bcgVe}</td>
      <td>Colditz et al. 1994 meta-analysis.</td></tr>
  </table></div>

  <div class="warn" style="margin-top:16px"><strong>Treat r as an uncertainty parameter, not a
  constant.</strong> At this run the mean dose is ${sci(r.meanDose)} CFU per serving, which sits in
  the far linear tail of every curve above: risk scales almost proportionally with dose, so the
  result inherits the full width of the r range.</div>

  <h2>Why no better estimate exists</h2>
  <p>Published dose–response work on <em>M. bovis</em> covers animal challenge by the respiratory and
  intratracheal routes, and human data come from aerosol BCG studies. Neither supports an oral model
  for humans. Until a defensible oral estimate exists, scenario bands over r are the honest way to
  present this step, and any single central value should be read as one choice among four orders of
  magnitude.</p>`;
};
V.dose.after = () => chartDR(document.getElementById('c-dr'), gather(), ensureRun());

/* ---------- specification ---------- */

V.spec = () => {
  const o=gather();
  return `
  <div class="eyebrow">Method</div>
  <h1>Model specification</h1>
  <p class="lead">A six-module stochastic framework aligned to the EFSA risk assessment structure and
  Codex CAC/GL 30-1999, implemented as ${o.iters.toLocaleString()} Latin hypercube iterations.</p>

  <h2>Module chain</h2>
  <div class="tablewrap"><table>
    <tr><th>#</th><th>Module</th><th>Computation</th><th>Output</th></tr>
    <tr><td>1</td><td>Hazard and product</td><td><em>M. bovis</em> in unpasteurised cheese</td><td>Scope</td></tr>
    <tr><td>2</td><td>Herd infection</td><td>Within-herd prevalence × county multiplier</td><td>Infected fraction</td></tr>
    <tr><td>3</td><td>Bulk tank</td><td>prevalence × P(shed) × shedding concentration</td><td>CFU/mL</td></tr>
    <tr><td>4</td><td>Cheese manufacture</td><td>× milk per kg × curd retention</td><td>CFU/g fresh curd</td></tr>
    <tr><td>5</td><td>Maturation</td><td>LR = t ÷ D; S = 10<sup>−LR</sup></td><td>CFU/g at sale</td></tr>
    <tr><td>6</td><td>Exposure and risk</td><td>dose = CFU/g × serving; P = 1 − e<sup>−rD</sup></td><td>Annual risk, cases, DALYs</td></tr>
  </table></div>

  <h2>Equations as implemented</h2>
  <div class="eq">C<sub>BTM</sub> = P<sub>within-herd</sub> × (I<sub>county</sub> ÷ I<sub>state</sub>) × P<sub>shed</sub> × C<sub>shed</sub></div>
  <div class="eq">C<sub>curd</sub> = C<sub>BTM</sub> × V<sub>milk per kg</sub> × f<sub>retention</sub></div>
  <div class="eq">LR = t<sub>maturation</sub> ÷ D + LR<sub>pasteurisation</sub> &nbsp;&nbsp; S = 10<sup>−LR</sup></div>
  <div class="eq">C<sub>cheese</sub> = C<sub>curd</sub> × S + 1<sub>[cross-contamination]</sub> × C<sub>cc</sub></div>
  <div class="eq">D<sub>serving</sub> = C<sub>cheese</sub> × m<sub>serving</sub></div>
  <div class="eq">P<sub>annual</sub> = 1 − (1 − P<sub>serving</sub>)<sup>n<sub>servings</sub></sup></div>

  <h2>Sampling</h2>
  <p>Inputs with a closed-form inverse CDF — infectivity, shedding concentration, cross-contamination
  level and occurrence, shedding probability — are drawn by Latin hypercube over stratified uniforms,
  independently shuffled. Beta-distributed inputs (within-herd prevalence, susceptibility, BCG
  coverage) are drawn by the Marsaglia–Tsang gamma method. Sensitivity is reported as standardised
  regression coefficients of annual risk on all sampled inputs.</p>

  <h2>Current parameter set</h2>
  <div class="tablewrap"><table>
    <tr><th>Parameter</th><th>Value</th><th>Provenance</th></tr>
    ${Object.entries(P).map(([k,p])=>`<tr><td>${p.label}</td>
      <td class="num">${typeof p.v==='number'?sci(p.v,3):p.v}</td>
      <td><span class="src ${p.src}">${SRCLAB[p.src]}</span></td></tr>`).join('')}
  </table></div>

  <h2>Known limitations</h2>
  <ul class="refs">
    <li>No validated human oral dose–response model exists for <em>M. bovis</em>; r is bounded by reasoning, not measurement.</li>
    <li>Shedding concentration into bulk milk is calibrated to reproduce the reference workbook rather than fitted to Irish isolate data.</li>
    <li>Cross-contamination parameters are demonstration assumptions and should be replaced with facility-specific evidence before any case use.</li>
    <li>Inputs are sampled independently; correlation between herd size, yield and prevalence is not modelled.</li>
    <li>The model is static. It does not track growth or decline during retail and domestic storage beyond the D-value term.</li>
  </ul>`;
};

/* ---------- evidence ---------- */

V.evidence = () => `
  <div class="eyebrow">Provenance</div>
  <h1>Parameters and evidence</h1>
  <p class="lead">Where each class of input comes from, and what still rests on assumption.</p>

  <div class="tablewrap"><table>
    <tr><th>Parameter group</th><th>Distribution</th><th>Source</th><th>Status</th></tr>
    <tr><td>Herd incidence, county profiles</td><td>Fixed per scenario</td><td>CSO DAA01 / DAFM open data, 2023 context</td><td><span class="src lit">Literature</span></td></tr>
    <tr><td>Within-herd prevalence</td><td>Beta, herd-size adjusted</td><td>Collins and More 2022, <em>Microbial Risk Analysis</em></td><td><span class="src lit">Literature</span></td></tr>
    <tr><td>D-values, cheese matrices</td><td>Fixed by cheese type</td><td>Forgrave et al. 2016, <em>Journal of Applied Microbiology</em>; Starikoff et al. 2016</td><td><span class="src lit">Literature</span></td></tr>
    <tr><td>Serving size and frequency</td><td>Fixed</td><td>IUNA National Adult Nutrition Survey</td><td><span class="src lit">Literature</span></td></tr>
    <tr><td>BCG effectiveness</td><td>Fixed 0.5</td><td>Colditz et al. 1994, meta-analysis</td><td><span class="src lit">Literature</span></td></tr>
    <tr><td>DALYs per case</td><td>Fixed 12.1</td><td>Menzies et al. 2021, <em>Lancet Global Health</em> (95% UI 10.0–14.9)</td><td><span class="src lit">Literature</span></td></tr>
    <tr><td>Shedding into milk</td><td>Uniform × lognormal</td><td>Calibrated to the reference workbook's bulk-tank concentration</td><td><span class="src cal">Demonstration</span></td></tr>
    <tr><td>Cross-contamination</td><td>Bernoulli × lognormal</td><td>Working assumption calibrated to the reference workbook; no facility-level Irish data</td><td><span class="src cal">Demonstration</span></td></tr>
    <tr><td>Exposed population</td><td>Fixed</td><td>Order-of-magnitude estimate for raw-milk cheese consumers</td><td><span class="src cal">Demonstration</span></td></tr>
    <tr><td>Infectivity r</td><td>Uniform(10⁻⁸, 10⁻⁴)</td><td>No validated human oral model; bounds from animal challenge literature</td><td><span class="src cal">Demonstration</span></td></tr>
  </table></div>

  <h2>Corrections carried in this version</h2>
  <ul class="refs">
    <li>Collins and More 2022 is published in <em>Microbial Risk Analysis</em>, not <em>Preventive Veterinary Medicine</em>.</li>
    <li>Forgrave et al. 2016 is published in the <em>Journal of Applied Microbiology</em>; the D-values of 57, 59, 41 and 24 days are confirmed correct.</li>
    <li>The DALY weight is 12.1 per incident case (Menzies et al. 2021), not 15. Burden figures are correspondingly lower than earlier drafts.</li>
    <li>Nuñéz-García is dated 2017 and is a diagnostic-test meta-analysis; it does not support a shedding parameter and is not used as one here.</li>
    <li>Clegg et al. 2011 reports SICTT sensitivity of 52.9–60.8%, which bears on detection timing rather than on the exposure calculation.</li>
  </ul>

  <h2>Evidence gaps worth funding</h2>
  <div class="grid g2" style="margin-top:12px">
    <div class="card"><h3>Oral infectivity in humans</h3><p class="small">The decisive gap. Any
    defensible estimate would narrow the output by orders of magnitude and change what the tool can
    support.</p></div>
    <div class="card"><h3>Shedding into bulk milk</h3><p class="small">Irish isolate data on how
    often and at what level infected cows shed into milk would replace the calibrated term with a
    measured one.</p></div>
  </div>`;

/* ---------- standards ---------- */

V.standards = () => {
  const r=ensureRun();
  return `
  <div class="eyebrow">Context</div>
  <h1>Standards and benchmarks</h1>
  <p class="lead">What the modelled risk is being compared against, and what those reference levels
  do and do not mean.</p>

  <div class="chartbox" style="margin-top:14px">
    <h3>This assessment against common reference levels</h3>
    <div class="cap">Log scale. Reference levels are policy conventions, not biological thresholds.</div>
    <canvas id="c-bench"></canvas>
  </div>

  <div class="tablewrap" style="margin-top:16px"><table>
    <tr><th>Framework</th><th>Reference</th><th>What it governs</th></tr>
    <tr><td>WHO drinking-water guideline</td><td>10⁻⁶ infections per person per year</td><td>A widely borrowed tolerable-risk convention; not written for foodborne zoonoses</td></tr>
    <tr><td>Codex CAC/GL 30-1999</td><td>Principles and guidelines for microbiological risk assessment</td><td>The structure this model follows: hazard identification, characterisation, exposure, risk characterisation</td></tr>
    <tr><td>EFSA risk assessment framework</td><td>Four-step structure</td><td>Transparency, separation of assessment from management, explicit uncertainty</td></tr>
    <tr><td>Regulation (EC) 853/2004</td><td>Hygiene rules for food of animal origin</td><td>Raw-milk product requirements and herd health status conditions</td></tr>
    <tr><td>Irish bTB eradication programme</td><td>Herd restriction on loss of TB-free status</td><td>The trigger event this assessment is built around</td></tr>
  </table></div>

  <div class="warn" style="margin-top:16px">The 10⁻⁶ convention is a comparator, not a standard for
  this product. A result below it does not authorise sale, and a result above it does not by itself
  require withdrawal. Both are inputs to a risk-manager judgement that also weighs detection timing,
  volume, traceability and consumer profile.</div>

  <h2>This run</h2>
  <dl class="kv">
    <dt>Mean annual risk</dt><dd>${sci(r.meanRisk)}</dd>
    <dt>Ratio to WHO 10⁻⁶</dt><dd>${fix(r.whoRatio,3)}</dd>
    <dt>Iterations above 10⁻⁶</dt><dd>${fix(100*countAbove(r.risk,1e-6)/r.n,1)}%</dd>
    <dt>Iterations above 10⁻⁵</dt><dd>${fix(100*countAbove(r.risk,1e-5)/r.n,1)}%</dd>
  </dl>`;
};
const countAbove=(a,t)=>{let c=0;for(let i=0;i<a.length;i++) if(a[i]>t) c++; return c;};
V.standards.after = () => {
  const r=ensureRun();
  chartBarsLog(document.getElementById('c-bench'),[
    {label:'This assessment, mean', v:r.meanRisk, lo:r.p05, hi:r.p95, colour:css('--brand')},
    {label:'This assessment, 95th', v:r.p95, lo:0, hi:0, colour:css('--brand-2')},
    {label:'WHO reference 10⁻⁶', v:1e-6, lo:0, hi:0, colour:css('--high')},
    {label:'One in 100,000', v:1e-5, lo:0, hi:0, colour:css('--mod')}
  ],{});
};

/* ---------- decision record ---------- */

V.record = () => {
  const r=ensureRun(), o=gather(), b=band(r.meanRisk);
  const stamp=new Date().toISOString().slice(0,16).replace('T',' ');
  return `
  <div class="eyebrow">Output</div>
  <h1>Decision record</h1>
  <p class="lead">A self-contained summary of this run: the case, the assumptions, the result and the
  caveats, in a form that can be filed alongside a risk-manager decision.</p>

  <div class="card" style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:baseline">
      <h3 style="margin:0">bTB-RISK assessment record</h3>
      <span class="small mono">${stamp} UTC</span>
    </div>
    <dl class="kv" style="margin-top:12px">
      <dt>Scenario</dt><dd>${PROFILES[o.profile].name} — ${PROFILES[o.profile].ctx}</dd>
      <dt>Herd</dt><dd>${o.herdSize} milking cows, county herd incidence ${fix(o.herdInc,2)}% (${fix(o.herdInc/o.stateInc,2)}× state average)</dd>
      <dt>Exposure window</dt><dd>${o.dateClear} (last clear test) → ${o.dateLoss} (status loss); cheese made ${o.dateMake}</dd>
      <dt>Product</dt><dd>${CHEESE[o.cheese].label}, ${o.maturation} days at sale, ${o.pasteurised?'pasteurised':'raw'} milk</dd>
      <dt>Processing</dt><dd>${fix(r.lrTotal,2)} log₁₀ reduction, surviving fraction ${sci(r.survival)}</dd>
      <dt>Mean dose</dt><dd>${sci(r.meanDose)} CFU per ${o.serving} g serving, ${o.servingsYear} servings per year</dd>
      <dt>Mean annual risk</dt><dd><strong>${sci(r.meanRisk)}</strong> per consumer</dd>
      <dt>90% interval</dt><dd>${sci(r.p05)} to ${sci(r.p95)}</dd>
      <dt>Expected cases</dt><dd>${fix(r.cases,4)} per year in ${o.consumers.toLocaleString()} consumers</dd>
      <dt>Burden</dt><dd>${fix(r.dalys,4)} DALYs at ${o.daly} per case</dd>
      <dt>Dominant driver</dt><dd>${r.src.terms[0].name} (SRC ${r.src.terms[0].src.toFixed(3)})</dd>
      <dt>Method</dt><dd>${r.n.toLocaleString()} iterations, Latin hypercube; exponential dose–response</dd>
      <dt>Verdict</dt><dd><span class="pill ${b.cls}">${b.text}</span> — risk-manager review required</dd>
    </dl>
    <div class="small" style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px">
      Produced with bTB-RISK Studio, Teagasc Food Research Centre Moorepark, under DAFM PSSRC Topic 8.1.
      Decision-support evidence only. The infectivity parameter spans four orders of magnitude and the
      cross-contamination terms are demonstration assumptions.
    </div>
  </div>

  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
    <button class="btn" id="copyrec">Copy record as text</button>
    <button class="btn ghost" data-go="assess">Change the case</button>
  </div>
  <div class="small" id="copymsg" style="margin-top:8px"></div>

  <h2>Suggested wording for a case file</h2>
  <p>“Applying the Teagasc bTB-RISK farm-to-fork QMRA to this case gives a mean modelled annual
  probability of infection of ${sci(r.meanRisk)} per consumer, with a 90% interval of ${sci(r.p05)} to
  ${sci(r.p95)}. ${b.note} The estimate is governed by the infectivity parameter, for which no
  validated human oral value exists; it is offered as proportionate evidence for a risk-management
  decision rather than as a determination of safety.”</p>`;
};
V.record.after = () => {
  const btn=document.getElementById('copyrec'); if(!btn) return;
  btn.addEventListener('click',()=>{
    const txt=document.querySelector('.card .kv').parentElement.innerText;
    const msg=document.getElementById('copymsg');
    navigator.clipboard?.writeText(txt).then(
      ()=>{msg.textContent='Record copied to the clipboard.';},
      ()=>{msg.textContent='Copy was refused by the browser. Select the record above and copy it.';}
    );
  });
};

/* ---------- about ---------- */

V.about = () => `
  <div class="eyebrow">About</div>
  <h1>About and citation</h1>
  <p class="lead">bTB-RISK Studio accompanies a quantitative microbial risk assessment of
  <em>Mycobacterium bovis</em> in unpasteurised cheese produced by Irish herds that subsequently lose
  TB-free status.</p>

  <h2>Project</h2>
  <dl class="kv">
    <dt>Funder</dt><dd>Department of Agriculture, Food and the Marine, PSSRC reference 2023PSSRC916</dd>
    <dt>Topic</dt><dd>PSSRC Topic 8.1 — farm-to-fork QMRA, raw-milk cheese, bTB risk to consumers</dd>
    <dt>Host</dt><dd>Teagasc Food Research Centre, Moorepark, Fermoy, Co. Cork</dd>
    <dt>Duration</dt><dd>12-month study</dd>
  </dl>

  <h2>Contributors</h2>
  <div class="grid g4" style="margin-top:10px">
    ${['Gopaiah Talari','Triona O’Brien','Prabin Lamichhane','Diarmuid Sheehan'].map(n=>
      `<div class="tile"><div class="v" style="font-size:16px">${n}</div>
       <div class="s">Teagasc Food Research Centre, Moorepark</div></div>`).join('')}
  </div>

  <h2>How to cite the tool</h2>
  <div class="card"><p class="small mono" style="max-width:none">Talari, G., O’Brien, T., Lamichhane, P.
  and Sheehan, D. (2026) <em>bTB-RISK Studio: a farm-to-fork quantitative microbial risk assessment
  tool for Mycobacterium bovis in unpasteurised cheese</em>. Teagasc Food Research Centre, Moorepark,
  for the Department of Agriculture, Food and the Marine, PSSRC Topic 8.1.</p></div>

  <h2>Method references</h2>
  <ul class="refs">
    <li>Codex Alimentarius Commission (1999) <em>Principles and guidelines for the conduct of microbiological risk assessment</em>, CAC/GL 30-1999.</li>
    <li>Collins, Á. and More, S.J. (2022) <em>Microbial Risk Analysis</em> — within-herd prevalence of bovine tuberculosis.</li>
    <li>Forgrave, K. et al. (2016) <em>Journal of Applied Microbiology</em> — survival of <em>M. bovis</em> in cheese matrices.</li>
    <li>Starikoff, K. et al. (2016) — independent D-value estimate at 18 °C.</li>
    <li>Colditz, G.A. et al. (1994) — efficacy of BCG vaccine, meta-analysis.</li>
    <li>Menzies, N.A. et al. (2021) <em>Lancet Global Health</em> — disability weights and DALYs for tuberculosis.</li>
    <li>Central Statistics Office — DAA01, DAQ01, DAQ02 bovine tuberculosis surveillance series.</li>
  </ul>

  <h2>Scope and disclaimer</h2>
  <div class="warn">This is a research demonstration produced for a departmental project. It is not a
  regulatory decision tool, does not constitute a safety determination, and should not be used as the
  sole basis for a product action. Demonstration parameters must be replaced with case-specific and
  facility-specific evidence before any operational use.</div>

  <div class="logos">
    <img src="assets/teagasc.png" alt="Teagasc">
    <img src="assets/dafm.png" alt="Department of Agriculture, Food and the Marine">
  </div>
  <p class="small">Runs entirely in your browser. No case data is transmitted or stored.</p>`;

/* ============================== router ============================== */

function buildNav(){
  const html = NAV.map(n=> n.g
    ? `<div class="grp">${n.g}</div>`
    : `<a class="nav" href="#${n.id}" data-id="${n.id}"><span class="dot"></span>${n.t}</a>`).join('');
  document.getElementById('navlinks').innerHTML = html;
  document.getElementById('mobnav').innerHTML = NAV.filter(n=>!n.g)
    .map(n=>`<a href="#${n.id}" data-id="${n.id}">${n.t}</a>`).join('');
}

function route(){
  const id = (location.hash||'#home').slice(1);
  const page = V[id] ? id : 'home';
  const view = document.getElementById('view');
  view.innerHTML = V[page]();
  document.querySelectorAll('[data-id]').forEach(a=>a.classList.toggle('on', a.dataset.id===page));
  document.getElementById('mobnav').classList.remove('open');
  window.scrollTo(0,0);
  if(V[page].after) requestAnimationFrame(()=>V[page].after());
}

document.addEventListener('click', e=>{
  const go=e.target.closest('[data-go]');
  if(go){ location.hash='#'+go.dataset.go; return; }
  const st=e.target.closest('[data-step]');
  if(st && !st.disabled){ STEP=Number(st.dataset.step); route(); return; }
  if(e.target.id==='mobtoggle'){
    const m=document.getElementById('mobnav');
    m.classList.toggle('open');
    e.target.setAttribute('aria-expanded', m.classList.contains('open'));
  }
  if(e.target.id==='run'){
    const btn=e.target; btn.disabled=true; btn.textContent='Running…';
    setTimeout(()=>{
      RESULT=runModel(gather());
      const s=document.getElementById('runstate');
      if(s) s.textContent=`Mean annual risk ${sci(RESULT.meanRisk)} · median ${sci(RESULT.median)} · 95th ${sci(RESULT.p95)}`;
      btn.disabled=false; btn.textContent=`Run ${Number(val('iters')).toLocaleString()} iterations`;
    },30);
  }
});

document.addEventListener('change', e=>{
  const k=e.target.dataset && e.target.dataset.k;
  if(!k) return;
  P[k].v = e.target.value;
  if(k!=='profile' && k!=='cheese' && k!=='rDist' && !k.startsWith('date')) P[k].src='usr';
  if(k==='profile'){ const pr=PROFILES[e.target.value]; if(e.target.value!=='E'){ P.herdInc.v=pr.inc; P.herdInc.src='lit'; } }
  if(k==='cheese'){ const c=CHEESE[e.target.value]; P.dValue.v=c.d; P.maturation.v=c.mat; }
  RESULT=null;
  route();
});

window.addEventListener('hashchange', route);
window.addEventListener('resize', ()=>{ const id=(location.hash||'#home').slice(1);
  if(V[id] && V[id].after) V[id].after(); });

buildNav();
route();
