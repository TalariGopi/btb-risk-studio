/* bTB-RISK Studio — interface */
'use strict';

let RESULT=null, WIN=null, GROUP='case';
const val=k=>P[k].v, numv=k=>Number(P[k].v);

function recompute(){ const o=gather(); WIN=windowAnalysis(o); RESULT=runModel(o,WIN); return RESULT; }
function ensure(){ if(!RESULT) recompute(); return RESULT; }

/* ------------------------------------------------------------ formatting */
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sup=e=>String(e).split('').map(c=>SUP[c]||c).join('');
function sci(x,d){
  d=d===undefined?2:d;
  if(x===null||x===undefined||!isFinite(x)) return '—';
  if(x===0) return '0';
  if(Math.abs(x)>=0.01 && Math.abs(x)<100000) return x.toLocaleString('en-IE',{maximumFractionDigits:Math.max(d,2)});
  const e=Math.floor(Math.log10(Math.abs(x)));
  return (x/Math.pow(10,e)).toFixed(d)+'×10'+sup(e);
}
const fix=(x,d)=>isFinite(x)?Number(x).toFixed(d===undefined?2:d):'—';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function band(m){
  if(m<1e-7) return {cls:'low', k:'VERY LOW', t:'Very low modelled risk',
    note:'More than ten times below the WHO tolerable reference of 10⁻⁶ per person per year.'};
  if(m<1e-6) return {cls:'low', k:'LOW', t:'Low modelled risk',
    note:'Below the WHO tolerable reference of 10⁻⁶ per person per year.'};
  if(m<1e-5) return {cls:'mod', k:'MODERATE', t:'Moderate modelled risk',
    note:'Above the WHO reference level but within one order of magnitude of it.'};
  return {cls:'high', k:'ELEVATED', t:'Elevated modelled risk',
    note:'More than ten times the WHO tolerable reference level.'};
}

/* --------------------------------------------------------------- charts */
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function setup(cv,h){
  if(!cv) return null;
  const dpr=Math.min(window.devicePixelRatio||1,2), w=cv.clientWidth||640;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.height=h+'px';
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,w,h);
  c.font='11px Inter,system-ui,sans-serif';
  return {c,w,h};
}
function grid(c,L,T,W,H){
  c.strokeStyle=css('--line'); c.lineWidth=1; c.setLineDash([2,4]);
  for(let i=1;i<5;i++){const y=T+H*i/5; c.beginPath(); c.moveTo(L,y); c.lineTo(L+W,y); c.stroke();}
  c.setLineDash([]);
  c.beginPath(); c.moveTo(L,T); c.lineTo(L,T+H); c.lineTo(L+W,T+H); c.stroke();
}

function chartTrend(cv){
  const s=setup(cv,280); if(!s) return; const {c,w,h}=s;
  const L=46,T=14,W=w-L-52,H=h-T-42;
  const inc=NATIONAL.map(d=>d.inc), react=NATIONAL.map(d=>d.reactors);
  const yMax=Math.ceil(Math.max(...inc)+1), rMax=Math.max(...react)*1.1;
  const x=i=>L+i*W/(NATIONAL.length-1), y=v=>T+H-v/yMax*H, yr=v=>T+H-v/rMax*H;
  grid(c,L,T,W,H);
  // reactors as bars
  c.fillStyle=css('--surface-2');
  NATIONAL.forEach((d,i)=>{const bw=W/NATIONAL.length*0.55; c.fillRect(x(i)-bw/2,yr(d.reactors),bw,T+H-yr(d.reactors));});
  // incidence line
  c.strokeStyle=css('--brand'); c.lineWidth=2.4; c.beginPath();
  NATIONAL.forEach((d,i)=>i?c.lineTo(x(i),y(d.inc)):c.moveTo(x(i),y(d.inc))); c.stroke();
  NATIONAL.forEach((d,i)=>{ c.fillStyle=d.y===2024?css('--high'):css('--brand');
    c.beginPath(); c.arc(x(i),y(d.inc),d.y===2024?4.5:3,0,7); c.fill(); });
  c.fillStyle=css('--muted'); c.textAlign='right';
  for(let v=0;v<=yMax;v+=2) c.fillText(v+'%',L-6,y(v)+4);
  c.textAlign='center';
  NATIONAL.forEach((d,i)=>{ if(i%2===0||i===NATIONAL.length-1) c.fillText(String(d.y),x(i),T+H+16); });
  c.fillText('Herd incidence (line) and reactors (bars), CSO DAA01',L+W/2,T+H+34);
  c.textAlign='left'; c.fillStyle=css('--faint');
  for(let f=0;f<=1;f+=0.5) c.fillText(Math.round(rMax*f/1000)+'k',L+W+6,yr(rMax*f)+4);
  c.fillStyle=css('--high'); c.font='600 11px Inter,sans-serif'; c.textAlign='right';
  c.fillText('6.04% in 2024',x(14)-8,y(6.04)-8);
}

function chartCounties(cv,sel){
  const rows=COUNTIES;
  const s=setup(cv,30+rows.length*17); if(!s) return; const {c,w}=s;
  const L=Math.min(118,w*0.32),T=8,W=w-L-54,H=rows.length*17;
  const mx=Math.max(...rows.map(r=>r.inc))*1.08;
  const x=v=>L+v/mx*W;
  const tc={HIGH:css('--high'),MED:css('--mod'),LOW:css('--low')};
  c.strokeStyle=css('--line'); c.setLineDash([2,4]);
  for(let v=0;v<=mx;v+=4){c.beginPath();c.moveTo(x(v),T);c.lineTo(x(v),T+H);c.stroke();}
  c.setLineDash([]);
  rows.forEach((r,i)=>{
    const y=T+i*17+8.5, on=r.n===sel;
    c.fillStyle=on?css('--ink'):css('--muted'); c.font=(on?'600 ':'')+'11.5px Inter,sans-serif'; c.textAlign='right';
    c.fillText(r.n,L-8,y+4);
    c.fillStyle=tc[r.tier]; c.globalAlpha=on?1:0.72;
    c.fillRect(L,y-5.5,Math.max(x(r.inc)-L,2),11); c.globalAlpha=1;
    c.fillStyle=css('--muted'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
    c.fillText(r.inc.toFixed(2)+'%',x(r.inc)+6,y+4);
    if(on){ c.strokeStyle=css('--ink'); c.lineWidth=1.5; c.strokeRect(L-1,y-7,Math.max(x(r.inc)-L,2)+2,14); }
  });
  const nat=TIERS.NATIONAL.mean;
  c.strokeStyle=css('--ink-2'); c.lineWidth=1.5; c.setLineDash([5,4]);
  c.beginPath(); c.moveTo(x(nat),T); c.lineTo(x(nat),T+H); c.stroke(); c.setLineDash([]);
}

function chartHist(cv,r){
  const s=setup(cv,280); if(!s) return; const {c,w,h}=s;
  const L=50,T=16,W=w-L-18,H=h-T-52;
  const logs=[]; for(let i=0;i<r.risk.length;i++) if(r.risk[i]>0) logs.push(Math.log10(r.risk[i]));
  if(!logs.length) return;
  let lo=Math.floor(Math.min.apply(null,logs)), hi=Math.ceil(Math.max.apply(null,logs));
  if(hi-lo<3) hi=lo+3;
  const nb=46, bins=new Array(nb).fill(0);
  for(const v of logs){ let b=Math.floor((v-lo)/(hi-lo)*nb); b=Math.min(Math.max(b,0),nb-1); bins[b]++; }
  const mx=Math.max.apply(null,bins)||1, x=v=>L+(v-lo)/(hi-lo)*W, bw=W/nb;
  grid(c,L,T,W,H);
  for(let i=0;i<nb;i++){
    const centre=lo+(i+0.5)*(hi-lo)/nb, bh=bins[i]/mx*H;
    c.fillStyle = centre<-6?css('--brand') : centre<-5?css('--mod') : css('--high');
    c.globalAlpha=.85; c.fillRect(L+i*bw,T+H-bh,Math.max(bw-1,1),bh); c.globalAlpha=1;
  }
  if(-6>=lo&&-6<=hi){
    c.strokeStyle=css('--high'); c.lineWidth=1.8; c.setLineDash([5,4]);
    c.beginPath(); c.moveTo(x(-6),T-6); c.lineTo(x(-6),T+H); c.stroke(); c.setLineDash([]);
    c.fillStyle=css('--high'); c.font='600 10.5px Inter,sans-serif';
    c.textAlign = x(-6)>L+W-70?'right':'left';
    c.fillText('WHO 10⁻⁶', x(-6)+(x(-6)>L+W-70?-5:5), T+6);
  }
  [[r.p05,'5th'],[r.median,'median'],[r.p95,'95th']].forEach(([v,lab])=>{
    if(v<=0) return; const px=x(Math.log10(v)); if(px<L||px>L+W) return;
    c.strokeStyle=css('--ink-2'); c.lineWidth=1; c.beginPath(); c.moveTo(px,T+H); c.lineTo(px,T+H+7); c.stroke();
    c.fillStyle=css('--muted'); c.font='10px Inter,sans-serif'; c.textAlign='center'; c.fillText(lab,px,T+H+18);
  });
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif'; c.textAlign='center';
  for(let e=lo;e<=hi;e++) c.fillText(String(e),x(e),T+H+32);
  c.fillText('log₁₀ annual probability of infection per consumer',L+W/2,T+H+46);
  c.textAlign='right'; c.fillText(String(mx),L-6,T+10); c.fillText('0',L-6,T+H+3);
}

function chartBarsLog(cv,rows,opts){
  opts=opts||{};
  const h=52+rows.length*34, s=setup(cv,h); if(!s) return; const {c,w}=s;
  const L=Math.min(152,w*0.34),T=12,W=w-L-62,H=h-T-40;
  const vals=rows.reduce((a,r)=>a.concat([r.v,r.lo,r.hi].filter(v=>v>0)),[]);
  if(opts.ref) vals.push(opts.ref);
  const lo=Math.floor(Math.log10(Math.min.apply(null,vals)))-0.2,
        hi=Math.ceil(Math.log10(Math.max.apply(null,vals)))+0.2;
  const x=v=>L+(Math.log10(v)-lo)/(hi-lo)*W, bh=Math.min(20,H/rows.length*0.5);
  c.strokeStyle=css('--line'); c.setLineDash([2,4]);
  for(let e=Math.ceil(lo);e<=Math.floor(hi);e++){
    c.beginPath(); c.moveTo(x(Math.pow(10,e)),T); c.lineTo(x(Math.pow(10,e)),T+H); c.stroke();
    c.setLineDash([]); c.fillStyle=css('--muted'); c.textAlign='center';
    c.fillText('10'+sup(e),x(Math.pow(10,e)),T+H+16); c.setLineDash([2,4]);
  }
  c.setLineDash([]);
  rows.forEach((r,i)=>{
    const y=T+(i+0.5)*(H/rows.length);
    c.fillStyle=css('--ink-2'); c.font='12px Inter,sans-serif'; c.textAlign='right';
    c.fillText(r.label.length>26?r.label.slice(0,25)+'…':r.label,L-10,y+4);
    c.fillStyle=r.colour||css('--brand'); c.globalAlpha=(r.lo>0&&r.hi>0)?0.32:0.85;
    c.fillRect(L,y-bh/2,Math.max(x(r.v)-L,2),bh); c.globalAlpha=1;
    c.fillRect(Math.max(x(r.v)-1.5,L),y-bh/2-3,3,bh+6);
    if(r.lo>0&&r.hi>0){
      c.strokeStyle=css('--ink-2'); c.lineWidth=1.3; c.beginPath();
      c.moveTo(x(r.lo),y); c.lineTo(x(r.hi),y);
      c.moveTo(x(r.lo),y-5); c.lineTo(x(r.lo),y+5);
      c.moveTo(x(r.hi),y-5); c.lineTo(x(r.hi),y+5); c.stroke();
    }
    c.fillStyle=css('--muted'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
    c.fillText(sci(r.v,2),Math.min(x(r.hi>0?r.hi:r.v)+8,L+W+4),y+3.5);
  });
  if(opts.ref){
    const px=x(opts.ref);
    c.strokeStyle=css('--high'); c.lineWidth=1.8; c.setLineDash([5,4]);
    c.beginPath(); c.moveTo(px,T); c.lineTo(px,T+H); c.stroke(); c.setLineDash([]);
    c.fillStyle=css('--high'); c.font='600 10px Inter,sans-serif'; c.textAlign='center';
    c.fillText(opts.refLabel||'reference',px,T+H+30);
  }
  c.strokeStyle=css('--line'); c.lineWidth=1; c.beginPath(); c.moveTo(L,T); c.lineTo(L,T+H); c.stroke();
}

function chartTornado(cv,terms){
  const rows=terms.slice(0,9);
  const h=42+rows.length*29, s=setup(cv,h); if(!s) return; const {c,w}=s;
  const L=Math.min(196,w*0.42),T=8,W=w-L-54,H=h-T-30;
  const mx=Math.max(Math.max.apply(null,rows.map(r=>Math.abs(r.src))),0.1)*1.1;
  const x=v=>L+Math.abs(v)/mx*W;
  c.strokeStyle=css('--line'); c.setLineDash([2,4]);
  for(let f=0.2;f<=1.001;f+=0.2){c.beginPath();c.moveTo(L+f*W/1.1*mx/mx,T);c.lineTo(L+f*W,T+H);c.stroke();}
  c.setLineDash([]);
  rows.forEach((r,i)=>{
    const y=T+(i+0.5)*(H/rows.length);
    c.fillStyle=css('--ink-2'); c.font='12px Inter,sans-serif'; c.textAlign='right';
    c.fillText(r.name.length>32?r.name.slice(0,31)+'…':r.name,L-10,y+4);
    c.fillStyle=i===0?css('--high'):(r.src>=0?css('--brand'):css('--mod'));
    c.fillRect(L,y-8,Math.max(x(r.src)-L,2),16);
    c.fillStyle=css('--muted'); c.font='600 11px Inter,sans-serif'; c.textAlign='left';
    c.fillText(r.src.toFixed(3),x(r.src)+7,y+4);
  });
  c.strokeStyle=css('--line'); c.beginPath(); c.moveTo(L,T); c.lineTo(L,T+H); c.stroke();
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif'; c.textAlign='center';
  c.fillText('absolute standardised regression coefficient',L+W/2,T+H+20);
}

function chartDecay(cv,o,r){
  const s=setup(cv,270); if(!s) return; const {c,w,h}=s;
  const L=54,T=14,W=w-L-18,H=h-T-46;
  const tMax=Math.max(365,(o.maturationFixed||120)*1.3);
  const c0=r.meanBtm*((o.curdMin+4*o.curdMode+o.curdMax)/6)*((o.concMin+4*o.concMode+o.concMax)/6);
  const yTop=Math.ceil(Math.log10(Math.max(c0,1e-9))), yBot=yTop-8;
  const x=t=>L+t/tMax*W, y=v=>T+H-(v-yBot)/(yTop-yBot)*H;
  grid(c,L,T,W,H);
  const curve=(D,col,wid,dash)=>{
    c.strokeStyle=col; c.lineWidth=wid; c.setLineDash(dash||[]); c.beginPath();
    for(let i=0;i<=200;i++){ const t=tMax*i/200, v=Math.log10(c0)-t/D;
      i?c.lineTo(x(t),y(Math.max(v,yBot))):c.moveTo(x(t),y(v)); }
    c.stroke(); c.setLineDash([]);
  };
  curve(o.dValue+o.dValueSd, css('--high'), 1.6, [5,4]);
  curve(o.dValue, css('--brand'), 2.6);
  curve(Math.max(o.dValue-o.dValueSd,5), css('--mod'), 1.6, [5,4]);
  const tm=o.maturationFixed||120;
  c.strokeStyle=css('--ink-2'); c.lineWidth=1.4; c.setLineDash([3,3]);
  c.beginPath(); c.moveTo(x(tm),T); c.lineTo(x(tm),T+H); c.stroke(); c.setLineDash([]);
  c.fillStyle=css('--ink-2'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
  c.fillText('sale at '+tm+' d',x(tm)+5,T+12);
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif'; c.textAlign='right';
  for(let e=yBot;e<=yTop;e+=2) c.fillText('10'+sup(e),L-6,y(e)+4);
  c.textAlign='center';
  for(let t=0;t<=tMax;t+=90) c.fillText(String(t),x(t),T+H+16);
  c.fillText('maturation time (days)',L+W/2,T+H+34);
  c.save(); c.translate(13,T+H/2); c.rotate(-Math.PI/2); c.textAlign='center';
  c.fillText('CFU/g in cheese',0,0); c.restore();
}

function chartDR(cv,o,r){
  const s=setup(cv,270); if(!s) return; const {c,w,h}=s;
  const L=56,T=14,W=w-L-18,H=h-T-46;
  const lo=-6,hi=3,ylo=-12,yhi=0;
  const x=v=>L+(v-lo)/(hi-lo)*W, y=v=>T+H-(v-ylo)/(yhi-ylo)*H;
  grid(c,L,T,W,H);
  const f=(o.suscA/(o.suscA+o.suscB))*(2-o.bcgA/(o.bcgA+o.bcgB));
  const curve=(rr,col,wid,dash)=>{
    c.strokeStyle=col; c.lineWidth=wid; c.setLineDash(dash||[]); c.beginPath();
    for(let i=0;i<=240;i++){ const ld=lo+(hi-lo)*i/240, p=1-Math.exp(-rr*f*Math.pow(10,ld));
      const ly=Math.max(Math.log10(Math.max(p,1e-13)),ylo);
      i?c.lineTo(x(ld),y(ly)):c.moveTo(x(ld),y(ly)); }
    c.stroke(); c.setLineDash([]);
  };
  curve(o.rHi,css('--high'),1.8,[5,4]);
  curve(o.rMean,css('--brand'),2.6);
  curve(o.rLo,css('--mod'),1.8,[5,4]);
  if(r&&r.meanDose>0){
    const ld=Math.log10(r.meanDose);
    if(ld>lo){ c.strokeStyle=css('--ink-2'); c.lineWidth=1.4; c.setLineDash([3,3]);
      c.beginPath(); c.moveTo(x(ld),T); c.lineTo(x(ld),T+H); c.stroke(); c.setLineDash([]);
      c.fillStyle=css('--ink-2'); c.font='600 10.5px Inter,sans-serif'; c.textAlign='left';
      c.fillText('modelled serving dose',x(ld)+5,T+12); }
  }
  c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif'; c.textAlign='center';
  for(let e=lo;e<=hi;e++) c.fillText(String(e),x(e),T+H+16);
  c.fillText('log₁₀ ingested dose (CFU per serving)',L+W/2,T+H+34);
  c.textAlign='right'; for(let e=ylo;e<=yhi;e+=2) c.fillText(String(e),L-7,y(e)+4);
  c.save(); c.translate(13,T+H/2); c.rotate(-Math.PI/2); c.textAlign='center';
  c.fillText('log₁₀ P(infection)',0,0); c.restore();
  c.font='11px Inter,sans-serif'; c.textAlign='left';
  [['r upper truncation',css('--high')],['r mean',css('--brand')],['r lower truncation',css('--mod')]]
    .forEach(([t,col],i)=>{ const yy=T+16+i*15, xx=L+W-150;
      c.strokeStyle=col; c.lineWidth=2.4; c.beginPath(); c.moveTo(xx,yy-4); c.lineTo(xx+20,yy-4); c.stroke();
      c.fillStyle=css('--muted'); c.fillText(t,xx+26,yy); });
}

function chartWaterfall(cv,o,r){
  const s=setup(cv,250); if(!s) return; const {c,w,h}=s;
  const L=44,T=18,W=w-L-18,H=h-T-56;
  const curd=(o.curdMin+4*o.curdMode+o.curdMax)/6*((o.concMin+4*o.concMode+o.concMax)/6);
  const steps=[
    {n:'Bulk tank', v:Math.log10(Math.max(r.meanBtm,1e-12)), col:css('--ink-2')},
    {n:'Curd partition', v:Math.log10(Math.max(r.meanBtm*curd,1e-12)), col:css('--mod')},
    {n:'Maturation', v:Math.log10(Math.max(r.meanBtm*curd*r.meanSurv,1e-12)), col:css('--brand')},
    {n:'At consumption', v:Math.log10(Math.max(r.meanConc,1e-12)), col:css('--low')}
  ];
  const vs=steps.map(s2=>s2.v);
  const yTop=Math.ceil(Math.max.apply(null,vs))+0.5, yBot=Math.floor(Math.min.apply(null,vs))-0.5;
  const y=v=>T+H-(v-yBot)/(yTop-yBot)*H, bw=W/steps.length*0.52;
  grid(c,L,T,W,H);
  steps.forEach((s2,i)=>{
    const cx=L+(i+0.5)*W/steps.length;
    c.fillStyle=s2.col; c.globalAlpha=.85;
    c.fillRect(cx-bw/2,y(s2.v),bw,T+H-y(s2.v)); c.globalAlpha=1;
    c.fillStyle=css('--ink-2'); c.font='600 11px Inter,sans-serif'; c.textAlign='center';
    c.fillText(sci(Math.pow(10,s2.v),1),cx,y(s2.v)-7);
    c.fillStyle=css('--muted'); c.font='11px Inter,sans-serif';
    c.fillText(s2.n,cx,T+H+16);
    if(i>0){ c.strokeStyle=css('--faint'); c.setLineDash([3,3]); c.beginPath();
      c.moveTo(L+(i-0.5)*W/steps.length+bw/2,y(steps[i-1].v));
      c.lineTo(cx-bw/2,y(steps[i-1].v)); c.stroke(); c.setLineDash([]); }
  });
  c.fillStyle=css('--muted'); c.textAlign='right';
  for(let e=Math.ceil(yBot);e<=yTop;e++) c.fillText('10'+sup(e),L-6,y(e)+4);
  c.textAlign='center'; c.fillText('concentration per gram of cheese (per mL for bulk tank)',L+W/2,T+H+36);
}

/* ------------------------------------------------------------ components */
const tile=(k,v,s,accent)=>`<div class="tile${accent?' accent':''}"><div class="k">${k}</div>
  <div class="v num">${v}</div><div class="s">${s||''}</div></div>`;

const pill=(cls,txt)=>`<span class="pill ${cls}">${txt}</span>`;

function logoMark(size){
  const s=size||40;
  return `<svg class="logomark" width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">
    <defs><linearGradient id="lgm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--brand-2)"/><stop offset="1" stop-color="var(--brand)"/>
    </linearGradient></defs>
    <rect width="40" height="40" rx="11" fill="url(#lgm)"/>
    <path d="M8.5 26.5 L20 11 L31.5 26.5 Z" fill="#fff" opacity=".96"/>
    <circle cx="16.4" cy="22.6" r="2" fill="var(--brand)"/>
    <circle cx="24" cy="23.4" r="1.4" fill="var(--brand)"/>
    <rect x="18.2" y="16.4" width="6.6" height="2.8" rx="1.4" fill="var(--brand)" transform="rotate(-24 21.5 17.8)"/>
  </svg>`;
}

function tickerItems(){
  const r=RESULT, l=NATIONAL[NATIONAL.length-1];
  const hi=COUNTIES[0], lo=COUNTIES[COUNTIES.length-1];
  const items=[
    ['National herd incidence 2024', l.inc.toFixed(2)+'%'],
    ['Reactors 2024', l.reactors.toLocaleString()],
    ['Restricted herds', l.restricted.toLocaleString()],
    ['Highest RVO', hi.n+' '+hi.inc.toFixed(2)+'%'],
    ['Lowest RVO', lo.n+' '+lo.inc.toFixed(2)+'%'],
    ['Surveillance series', '2010 to 2024'],
    ['Regional Veterinary Offices', '29'],
    ['Mean annual risk', r?sci(r.meanRisk):'—'],
    ['WHO reference ratio', r?fix(r.whoRatio,3):'—'],
    ['Log reduction', r?fix(r.meanLr,2)+' log₁₀':'—'],
    ['Iterations', r?r.n.toLocaleString():'—']
  ];
  return items.map(([k,v])=>`<span class="tk-i"><em>${k}</em><b>${v}</b></span>`).join('');
}

function siteFooter(){
  return `<footer class="sitefoot">
    <div class="sf-l">
      <div class="sf-dev">Developed by <strong>Gopi Talari</strong>, Teagasc Food Research Centre, Moorepark</div>
    </div>
    <div class="sf-r">
      <a href="https://www.teagasc.ie" target="_blank" rel="noopener" aria-label="Teagasc">
        <img src="assets/teagasc.png" alt="Teagasc"></a>
      <a href="https://www.gov.ie/en/organisation/department-of-agriculture-food-and-the-marine/"
         target="_blank" rel="noopener" aria-label="Department of Agriculture, Food and the Marine">
        <img src="assets/dafm.png" alt="Department of Agriculture, Food and the Marine"></a>
    </div>
  </footer>`;
}

/* Regional Veterinary Office areas aggregate into 26 counties for mapping.
   Cork, Tipperary and Wicklow are each split into two RVOs; their herd-weighted
   mean incidence is used for the county. */
const CTY_ABBR={'Carlow':'CW','Cavan':'CN','Clare':'CE','Cork':'CO','Donegal':'DL','Dublin':'D',
 'Galway':'G','Kerry':'KY','Kildare':'KE','Kilkenny':'KK','Laois':'LS','Leitrim':'LM',
 'Limerick':'LK','Longford':'LD','Louth':'LH','Mayo':'MO','Meath':'MH','Monaghan':'MN',
 'Offaly':'OY','Roscommon':'RN','Sligo':'SO','Tipperary':'TA','Waterford':'WD',
 'Westmeath':'WH','Wexford':'WX','Wicklow':'WW'};

const RVO_TO_CTY={'Cork North':'Cork','Cork South':'Cork','Tipperary North':'Tipperary',
 'Tipperary South':'Tipperary','Wicklow W':'Wicklow','Wicklow E':'Wicklow'};

function countyStats(){
  const m={};
  COUNTIES.forEach(c=>{
    const n=RVO_TO_CTY[c.n]||c.n;
    if(!m[n]) m[n]={n, herds:0, w:0, rvos:[]};
    m[n].herds+=c.herds; m[n].w+=c.inc*c.herds; m[n].rvos.push(c);
  });
  Object.values(m).forEach(x=>{ x.inc=x.w/x.herds; x.mult=x.inc/TIERS.NATIONAL.mean; });
  return m;
}
const CTY_STATS=countyStats();

/* sequential green ramp, pale for low incidence through to deep bottle green */
const IE_RAMP=[
  {max:3,  f:'#e4f3e7', t:'#14402b'},
  {max:4,  f:'#bbe3c5', t:'#14402b'},
  {max:5,  f:'#8bcc9f', t:'#10351f'},
  {max:7,  f:'#55ac79', t:'#ffffff'},
  {max:9,  f:'#2d885a', t:'#ffffff'},
  {max:99, f:'#15603c', t:'#ffffff'}
];
const rampFor=v=>IE_RAMP.find(b=>v<b.max)||IE_RAMP[IE_RAMP.length-1];

function irelandMapSVG(selectedRvo){
  const selCty = selectedRvo ? (RVO_TO_CTY[selectedRvo]||selectedRvo) : null;
  let paths='', labels='';
  Object.keys(IE_COUNTIES).forEach(name=>{
    const geo=IE_COUNTIES[name], st=CTY_STATS[name];
    const inc=st?st.inc:0, col=rampFor(inc), on=name===selCty;
    const detail = st ? (st.rvos.length>1
      ? st.rvos.map(r=>`${r.n} ${r.inc.toFixed(2)}%`).join(', ')
      : `${st.herds.toLocaleString()} herds`) : 'no data';
    paths+=`<path d="${geo.d}" fill="${col.f}" stroke="${on?'var(--ink)':'rgba(255,255,255,.75)'}"
      stroke-width="${on?2.6:0.9}" class="iec${on?' on':''}" stroke-linejoin="round">
      <title>${esc(name)}: ${inc.toFixed(2)}% herd incidence, ${detail}</title></path>`;
    labels+=`<text x="${geo.c[0]}" y="${geo.c[1]+(on?-2:3)}" class="iel" fill="${col.t}"
      font-weight="${on?700:600}">${CTY_ABBR[name]||''}</text>`;
    if(on) labels+=`<text x="${geo.c[0]}" y="${geo.c[1]+10}" class="ielv" fill="${col.t}">${inc.toFixed(1)}%</text>`;
  });
  const selSt = selCty?CTY_STATS[selCty]:null;
  return `<div class="iewrap"><svg viewBox="0 0 ${IE_VIEW.w} ${IE_VIEW.h}" class="iemap" role="img"
    aria-label="Choropleth map of Irish counties coloured by 2024 bovine tuberculosis herd incidence">
    <g>${paths}</g><g>${labels}</g></svg></div>
  <div class="maplegend">
    <span class="mlk">Herd incidence 2024</span>
    ${IE_RAMP.map((b,i)=>`<span><i style="background:${b.f}"></i>${i===0?'under 3%':
      i===IE_RAMP.length-1?'9% and over':(IE_RAMP[i-1].max+' to '+b.max+'%')}</span>`).join('')}
  </div>
  ${selSt?`<div class="mapsel">Selected: <b>${esc(selectedRvo)}</b>
    ${RVO_TO_CTY[selectedRvo]?`&middot; mapped to County ${esc(selCty)}, herd-weighted ${selSt.inc.toFixed(2)}%`:''}
    </div>`:''}`;
}

function pathwaySVG(){
  const st=[
    ['Herd','infected cows'],['Bulk tank','dilution'],['Cheese make','curd partition'],
    ['Maturation','D-value kill'],['Retail and home','storage'],['Consumer','dose and risk']
  ];
  const W=1080,H=120, gap=W/st.length;
  let g='';
  st.forEach((s,i)=>{
    const cx=gap*i+gap/2;
    g+=`<g><circle cx="${cx}" cy="46" r="21" class="pw-node" style="animation-delay:${i*0.18}s"/>
      <text x="${cx}" y="51" class="pw-num">${i+1}</text>
      <text x="${cx}" y="88" class="pw-t">${s[0]}</text>
      <text x="${cx}" y="104" class="pw-s">${s[1]}</text></g>`;
    if(i<st.length-1) g+=`<line x1="${cx+23}" y1="46" x2="${gap*(i+1)+gap/2-23}" y2="46" class="pw-link"/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="pathway" role="img"
    aria-label="Six-stage farm to fork pathway from infected herd to consumer dose">
    <line x1="${gap/2}" y1="46" x2="${W-gap/2}" y2="46" class="pw-rail"/>
    <circle r="5" class="pw-dot"><animateMotion dur="7s" repeatCount="indefinite"
      path="M ${gap/2} 46 L ${W-gap/2} 46"/></circle>
    ${g}</svg>`;
}

function windowTimeline(W){
  if(!W||!W.valid) return '';
  const pos=Math.min(Math.max(W.elapsed,0),1)*100;
  return `<div class="tl">
    <div class="tl-bar"><div class="tl-fill" style="width:${pos}%"></div>
      <div class="tl-marker" style="left:${pos}%"><span>cheese made</span></div></div>
    <div class="tl-ends"><span>Last clear test<br><b>${val('dateClear')}</b></span>
      <span style="text-align:right">Status loss<br><b>${val('dateLoss')}</b></span></div>
    <div class="tl-stat"><span>${W.windowDays} day window</span>
      <span>${W.daysAfterClear} days after clear test</span>
      <span>${fix(W.elapsed*100,1)}% elapsed</span></div></div>`;
}

/* ---------------------------------------------------------------- views */
const NAV=[
  {g:'Overview'},
  {id:'home', t:'Home'},
  {id:'project', t:'The project'},
  {id:'how',  t:'How it works'},
  {g:'Assessment'},
  {id:'case', t:'Case setup'},
  {id:'window', t:'Retrospective window'},
  {id:'results', t:'Risk characterisation'},
  {id:'scenarios', t:'Scenario comparison'},
  {id:'sensitivity', t:'Sensitivity analysis'},
  {g:'Models'},
  {id:'primary', t:'Primary models'},
  {id:'secondary', t:'Secondary models'},
  {id:'spec', t:'Model specification'},
  {g:'Evidence'},
  {id:'params', t:'Parameters and distributions'},
  {id:'surveillance', t:'CSO surveillance data'},
  {id:'legislation', t:'Legislation and standards'},
  {id:'validation', t:'Validation and limitations'},
  {g:'Output'},
  {id:'report', t:'DAFM decision report'},
  {id:'about', t:'About and citation'}
];

const V={};

/* ---------- home ---------- */
V.home=()=>{
  const r=ensure(), b=band(r.meanRisk), o=gather();
  const c=PROFILES.concat(COUNTIES).find(x=>x.n===P.county.v)||PROFILES[0];
  return `
  <div class="hero">
    <div class="ht">
      <div class="brandblock">${logoMark(62)}
        <div><h1>bTB-RISK Studio</h1>
          <div class="sub">Quantitative microbial risk assessment of <em>Mycobacterium bovis</em>
          in unpasteurised cheese</div></div></div>
      <div class="projline">DAFM PSSRC Topic 8.1 &middot; Teagasc Food Research Centre, Moorepark</div>
      <div class="herobtns">
        <button class="btn" data-go="case">Start an assessment</button>
        <button class="btn ghost light" data-go="project">About the project</button>
      </div>
    </div>
    <div class="hi"><img src="assets/hero.jpg" alt="Irish dairy herd, raw milk and cheese"></div>
  </div>

  <div class="ticker" aria-hidden="true"><div class="tk-track">${tickerItems()}${tickerItems()}</div></div>

  <div class="statusbar reveal">
    <div><span class="k">Case</span><b>${esc(c.n)}</b> &middot; ${o.herdSize} cows &middot; ${CHEESETYPES[o.cheese].label}</div>
    <div><span class="k">Window</span><b>${WIN.position}</b></div>
    <div><span class="k">Verdict</span>${pill(b.cls,b.k)}</div>
    <button class="btn sm" id="run">Run simulation</button>
  </div>
  <div class="progwrap" id="progwrap" hidden>
    <div class="progbar"><div class="progfill" id="progfill"></div></div>
    <div class="progtxt" id="progtxt">Preparing</div>
  </div>

  <div class="grid g4 reveal" style="margin-top:14px">
    ${tile('Mean annual risk',sci(r.meanRisk),'per consumer per year',true)}
    ${tile('Risk per serving',sci(r.riskServing),'single eating occasion')}
    ${tile('90% interval',sci(r.p05,1)+' &ndash; '+sci(r.p95,1),'5th to 95th percentile')}
    ${tile('Expected cases',fix(r.cases,4),Math.round(r.pop).toLocaleString()+' consumers')}
  </div>

  <div class="card pathcard reveal">
    <div class="pathhead"><h3>Exposure pathway</h3>
      <span class="small">Means across ${r.n.toLocaleString()} iterations</span></div>
    ${pathwaySVG()}
    <div class="pathvals">
      <div><span>Bulk tank</span><b>${sci(r.meanBtm)} CFU/mL</b></div>
      <div><span>Log reduction</span><b>${fix(r.meanLr,2)} log&#8321;&#8320;</b></div>
      <div><span>At consumption</span><b>${sci(r.meanConc)} CFU/g</b></div>
      <div><span>Dose per serving</span><b>${sci(r.meanDose)} CFU</b></div>
      <div><span>Annual risk</span><b>${sci(r.meanRisk)}</b></div>
      <div><span>WHO ratio</span><b>${fix(r.whoRatio,3)}</b></div>
    </div>
  </div>

  <div class="split reveal">
    <div class="chartbox"><h3>Where this case sits</h3>
      <div class="cap">Counties by 2024 herd incidence. Cork, Tipperary and Wicklow each combine two
      Regional Veterinary Offices at their herd-weighted mean.</div>
      ${irelandMapSVG(COUNTIES.find(c=>c.n===P.county.v)?P.county.v:null)}</div>
    <div class="chartbox"><h3>Distribution of annual risk</h3>
      <div class="cap">Teal below the WHO 10&#8315;&#8310; reference, amber to 10&#8315;&#8309;, red above.</div>
      <canvas id="c-hist"></canvas></div>
    <div class="chartbox"><h3>National bTB trend</h3>
      <div class="cap">Herd incidence, 2010 to 2024, against reactor numbers.</div>
      <canvas id="c-trend"></canvas></div>
  </div>

  ${siteFooter()}`;
};
V.home.after=()=>{ const r=ensure(); chartHist(document.getElementById('c-hist'),r);
  chartTrend(document.getElementById('c-trend')); };

/* ---------- the project ---------- */
V.project=()=>`
  <div class="eyebrow">Background</div>
  <h1>The project</h1>
  <p class="lead">A twelve-month study funded by the Department of Agriculture, Food and the Marine
  under the Public Service Support and Research Contract, to quantify consumer risk from
  unpasteurised cheese made during the bovine tuberculosis retrospective window.</p>

  <div class="grid g4 reveal" style="margin-top:16px">
    ${tile('Funder','DAFM','PSSRC 2023PSSRC916',true)}
    ${tile('Topic','8.1','Farm-to-fork QMRA')}
    ${tile('Host','Teagasc','Moorepark Food Research Centre')}
    ${tile('Scope','29 RVOs','All Irish veterinary office areas')}
  </div>

  <h2>Why the question arises</h2>
  <p>Unpasteurised cheese production has expanded across Europe, and Ireland now has more than sixty
  registered farmhouse and artisanal producers. Because these cheeses receive no thermal
  pasteurisation, any pathogen present in the milk may survive into the finished product.</p>
  <p><em>Mycobacterium bovis</em>, the agent of bovine tuberculosis, remains relevant wherever the
  disease is endemic in cattle. Ireland reports roughly six notified zoonotic tuberculosis cases each
  year, and national herd incidence has deteriorated from a fifteen-year low of 3.27 per cent in 2016
  to 6.04 per cent in 2024, with 41,682 reactors recorded in that year.</p>

  <h2>The regulatory gap</h2>
  <div class="grid g3 reveal">
    <div class="card"><div class="stepno">1</div><h3>Clear test</h3><p class="small">The herd passes the
    single intradermal comparative tuberculin test. Milk enters the vat under normal rules and cheese
    is made and sold.</p></div>
    <div class="card" style="border-left:3px solid var(--mod)"><div class="stepno" style="background:color-mix(in srgb,var(--mod) 18%,transparent);color:var(--mod)">2</div>
    <h3>Risk window</h3><p class="small">Infection is present but undetected. The test has a
    herd-level sensitivity near 0.75 and infection takes time to produce a detectable response.
    Cheese made in this interval is often matured and sold before anyone knows.</p></div>
    <div class="card"><div class="stepno">3</div><h3>Detection</h3><p class="small">A later test removes
    TB-free status. Because artisan maturation runs from sixty to three hundred and sixty-five days,
    product from the window can still be in circulation.</p></div>
  </div>
  <p>Regulation (EC) No 853/2004 prohibits milk from restricted herds entering the food chain without
  heat treatment, but it governs the period after detection. Neither European nor national frameworks
  address product already made from milk collected before detection. That is the gap this project
  addresses.</p>

  <h2>Aim</h2>
  <div class="note">To develop a quantitative microbial risk assessment that estimates human exposure
  to <em>M. bovis</em> from raw-milk cheese produced by herds that subsequently lose bovine
  tuberculosis-free status, and to deliver it as a transparent, reusable decision-support tool for
  the competent authority.</div>

  <h2>Objectives</h2>
  <div class="tablewrap"><table>
    <tr><th>#</th><th>Objective</th><th>Delivered as</th></tr>
    <tr><td>1</td><td>Map the farm-to-fork exposure pathway from herd to plate</td><td>Six-module model structure</td></tr>
    <tr><td>2</td><td>Integrate official CSO and DAFM surveillance data into parameterisation</td>
      <td>Fitted distributions from DAA01, DAQ01 and DAQ02, 2010 to 2024</td></tr>
    <tr><td>3</td><td>Model <em>M. bovis</em> survival through curd, maturation and storage</td>
      <td>Log-linear D-value kinetics with temperature-adjusted post-ripening decay</td></tr>
    <tr><td>4</td><td>Quantify uncertainty and identify dominant assumptions</td>
      <td>Latin hypercube Monte Carlo with standardised regression sensitivity analysis</td></tr>
    <tr><td>5</td><td>Compare raw milk against pasteurisation and across county risk profiles</td>
      <td>Scenario engine covering all 29 Regional Veterinary Office areas</td></tr>
    <tr><td>6</td><td>Deliver a reusable decision-support template for DAFM</td>
      <td>This tool and its decision report</td></tr>
  </table></div>

  <h2>Approach</h2>
  <p>The assessment follows the four-step framework endorsed by the European Food Safety Authority
  and Codex Alimentarius CAC/GL 30-1999: hazard identification, hazard characterisation, exposure
  assessment and risk characterisation. The reference implementation was built in Microsoft Excel
  with the @RISK add-in. This tool reimplements that model in the browser so that a case can be run
  without specialist software and the full parameter set stays visible to a reviewer.</p>

  <h2>What the tool adds</h2>
  <div class="grid g3 reveal">
    <div class="card"><h3>Irish data throughout</h3><p class="small">Herd size, herd incidence and
    county multipliers are fitted to official returns rather than borrowed from elsewhere.</p></div>
    <div class="card"><h3>Uncertainty kept visible</h3><p class="small">Every input is a distribution.
    Results are reported as percentile bands because the dominant parameter has no validated human
    estimate.</p></div>
    <div class="card"><h3>An auditable trail</h3><p class="small">Each input carries its source and a
    provenance class, and the decision report reproduces the full set beside the result.</p></div>
  </div>

  <h2>Key message</h2>
  <p>Hazard, then exposure, then health impact, then a proportionate decision. The tool supplies the
  first three so that the fourth rests on evidence rather than judgement alone.</p>

  <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
    <button class="btn" data-go="case">Start an assessment</button>
    <button class="btn ghost" data-go="how">How the model works</button>
  </div>
  ${siteFooter()}`;

/* ---------- how it works ---------- */
V.how=()=>`
  <div class="eyebrow">Orientation</div>
  <h1>How it works</h1>
  <p class="lead">Six modules carry a herd's TB status through to a probability of human infection.
  Each module is a published equation with Irish parameters attached.</p>

  <div class="card" style="margin:16px 0">${pathwaySVG()}</div>

  <div class="tablewrap"><table>
    <tr><th>Module</th><th>Question it answers</th><th>Core computation</th><th>Output</th></tr>
    <tr><td>1. Herd infection</td><td>How many cows are infected and undetected?</td>
      <td>N<sub>herd</sub> × P<sub>herd</sub> × P<sub>within</sub> × prevalence multiplier</td><td>Infected cows</td></tr>
    <tr><td>2. Milk shedding and bulk tank</td><td>What concentration reaches the vat?</td>
      <td>infected × [P<sub>within</sub>·Shed<sub>pos</sub> + (1−P<sub>within</sub>)·Shed<sub>neg</sub>] ÷ volume</td><td>CFU/mL</td></tr>
    <tr><td>3. Cheese manufacture</td><td>How far do cells concentrate into curd?</td>
      <td>× curd retention × concentration factor</td><td>CFU/g fresh curd</td></tr>
    <tr><td>4. Maturation</td><td>How much is inactivated before sale?</td>
      <td>LR = t ÷ D; S = 10<sup>−LR</sup></td><td>Surviving fraction</td></tr>
    <tr><td>5. Storage and handling</td><td>What is added or lost after the make?</td>
      <td>temperature-adjusted decay plus P<sub>cross</sub> × C<sub>cross</sub></td><td>CFU/g at consumption</td></tr>
    <tr><td>6. Exposure and dose-response</td><td>What is the probability of infection?</td>
      <td>Dose = C × m; P = 1 − exp(−r<sub>eff</sub>·Dose)</td><td>Annual risk, cases, DALYs</td></tr>
  </table></div>

  <h2>Three things to set before you run</h2>
  <div class="grid g3">
    <div class="card"><div class="stepno">1</div><h3>The herd and its county</h3><p class="small">County
    selection applies a multiplier taken from that Regional Veterinary Office's 2024 herd incidence
    relative to the national herd-weighted mean of 6.06%.</p></div>
    <div class="card"><div class="stepno">2</div><h3>The four dates</h3><p class="small">Last clear test,
    cheese production, status loss and assessment date. These place the batch inside or outside the
    retrospective window and set the maturation age.</p></div>
    <div class="card"><div class="stepno">3</div><h3>The product</h3><p class="small">Cheese type selects
    the D-value. Maturation age drives the log reduction, which is the single largest controllable
    term in the model.</p></div>
  </div>

  <h2>Reading the provenance tags</h2>
  <p>Every parameter is classified so a reviewer can separate measured values from working assumptions.</p>
  <div class="legend">
    <span><i style="background:var(--navy-2)"></i><b>CSO surveillance</b> fitted to official returns</span>
    <span><i style="background:var(--brand)"></i><b>Literature</b> from a cited published source</span>
    <span><i style="background:var(--mod)"></i><b>Calibrated</b> a working assumption, not a measurement</span>
    <span><i style="background:var(--muted)"></i><b>Case input</b> facts you supply</span>
  </div>
  <div class="note" style="margin-top:16px">Nothing you enter is transmitted. The simulation runs in
  this browser tab and the decision report is assembled locally.</div>
  <div style="margin-top:18px"><button class="btn" data-go="case">Open case setup</button></div>`;

/* ---------- case setup ---------- */
const GROUPS=[
  {id:'case',  t:'A. Herd and county',   keys:['county','herdSize','herdType','useSeason']},
  {id:'dates', t:'B. Testing and dates', keys:['dateClear','dateMake','dateLoss','dateAssess','seTst','spTst','retroWeight']},
  {id:'cheese',t:'C. Product and exposure', keys:['cheese','pasteurised','maturationFixed','serving','servingSd','servingsFixed','consumers','pConsume']},
  {id:'farm',  t:'D. Farm distributions', keys:['nHerdMin','nHerdMode','nHerdMax','pHerdA','pHerdB','pWithinA','pWithinB','yieldMin','yieldMode','yieldMax']},
  {id:'shed',  t:'E. Shedding',          keys:['shedPosMin','shedPosMode','shedPosMax','shedNegMin','shedNegMode','shedNegMax']},
  {id:'proc',  t:'F. Processing',        keys:['curdMin','curdMode','curdMax','concMin','concMode','concMax','dValue','dValueSd','matMin','matMode','matMax','pastLr','pastLrSd','retailMin','retailMode','retailMax','domMin','domMode','domMax','domTempMin','domTempMode','domTempMax']},
  {id:'cc',    t:'G. Cross-contamination', keys:['ccPMin','ccPMode','ccPMax','ccCMin','ccCMode','ccCMax','ccPastFactor']},
  {id:'dr',    t:'H. Dose-response',     keys:['rMean','rSd','rLo','rHi','suscA','suscB','bcgA','bcgB','daly']},
  {id:'link',  t:'I. Scenario linkage',  keys:['herdFactor','procFactor','iters']}
];

function field(k){
  const p=P[k], id='f-'+k;
  let ctrl;
  if(k==='county'){
    ctrl=`<select id="${id}" data-k="${k}">
      <optgroup label="Aggregate profiles">${PROFILES.map(c=>
        `<option value="${esc(c.n)}"${p.v===c.n?' selected':''}>${esc(c.n)} — ${c.inc.toFixed(2)}%</option>`).join('')}</optgroup>
      <optgroup label="Regional Veterinary Offices, 2024">${COUNTIES.map(c=>
        `<option value="${esc(c.n)}"${p.v===c.n?' selected':''}>${esc(c.n)} — ${c.inc.toFixed(2)}% (${c.tier})</option>`).join('')}</optgroup></select>`;
  } else if(k==='cheese'){
    ctrl=`<select id="${id}" data-k="${k}">${Object.entries(CHEESETYPES).map(([v,o])=>
      `<option value="${v}"${p.v===v?' selected':''}>${o.label} — D ${o.d} d</option>`).join('')}</select>`;
  } else if(k==='herdType'){
    ctrl=`<select id="${id}" data-k="${k}">${['Dairy raw milk supplier','Mixed dairy and beef','Farmhouse cheesemaker']
      .map(v=>`<option${p.v===v?' selected':''}>${v}</option>`).join('')}</select>`;
  } else if(k==='pasteurised'||k==='useSeason'){
    const yes=k==='pasteurised'?'Yes, pasteurised':'Yes, apply month factor';
    const no =k==='pasteurised'?'No, raw milk':'No';
    ctrl=`<select id="${id}" data-k="${k}"><option value="0"${+p.v===0?' selected':''}>${no}</option>
      <option value="1"${+p.v===1?' selected':''}>${yes}</option></select>`;
  } else if(k.startsWith('date')){
    ctrl=`<input type="date" id="${id}" data-k="${k}" value="${p.v}">`;
  } else {
    ctrl=`<input type="number" id="${id}" data-k="${k}" value="${p.v}" step="${p.step||'any'}">`;
  }
  return `<div class="field">
    <label for="${id}">${p.label} <span class="src ${p.cls}">${CLS[p.cls]}</span></label>${ctrl}
    ${p.dist?`<div class="hint"><b>${p.dist}</b></div>`:''}
    ${p.src?`<div class="hint">${p.src}</div>`:''}</div>`;
}

V.case=()=>{
  const gi=Math.max(0,GROUPS.findIndex(x=>x.id===GROUP));
  const g=GROUPS[gi];
  const r=RESULT, o=gather();
  return `
  <div class="eyebrow">Assessment</div>
  <h1>Case setup</h1>
  <p class="lead">Groups A to C are the case facts a risk manager supplies. Groups D to I expose every
  distribution in the model for review or sensitivity work. Defaults are the published values.</p>
  <div class="steps">${GROUPS.map(x=>
    `<button data-grp="${x.id}" class="${x.id===GROUP?'on':''}">${x.t}</button>`).join('')}</div>
  <div class="card">
    <h3 style="margin-top:0">${g.t}</h3>
    ${groupIntro(g.id)}
    <div class="grid g2" style="margin-top:14px">${g.keys.map(field).join('')}</div>
    ${groupReadout(g.id,o)}
  </div>
  <div class="stepnav">
    <button class="btn ghost" data-grp="${GROUPS[Math.max(0,gi-1)].id}"${gi===0?' disabled':''}>&larr; ${gi===0?'Previous':GROUPS[gi-1].t}</button>
    <span class="stepcount">Step ${gi+1} of ${GROUPS.length}</span>
    <button class="btn ghost" data-grp="${GROUPS[Math.min(GROUPS.length-1,gi+1)].id}"${gi===GROUPS.length-1?' disabled':''}>${gi===GROUPS.length-1?'Next':GROUPS[gi+1].t} &rarr;</button>
  </div>
  <div class="progwrap" id="progwrap" hidden>
    <div class="progbar"><div class="progfill" id="progfill"></div></div>
    <div class="progtxt" id="progtxt">Preparing</div>
  </div>
  <div class="runbar">
    <button class="btn" id="run">Run ${o.iters.toLocaleString()} iterations</button>
    <div class="st" id="runstate">${r?`Mean annual risk ${sci(r.meanRisk)} · median ${sci(r.median)} · 95th ${sci(r.p95)}`:'Not yet run.'}</div>
    <button class="btn ghost" data-go="results" style="margin-left:auto">Results</button>
    <button class="btn ghost" data-go="report">Report</button>
  </div>`;
};

function groupIntro(id){
  const t={
    case:'County selection applies that Regional Veterinary Office’s 2024 herd incidence as a multiplier against the national herd-weighted mean of 6.06%. The seasonal factor, when enabled, adjusts for housing and testing patterns in the month of production.',
    dates:'The four dates place the batch relative to the retrospective window and set the maturation age. Test sensitivity governs how much undetected infection the model carries, through the retrospective uncertainty factor.',
    cheese:'Cheese type selects the D-value used for maturation inactivation. Setting maturation age to 0 replaces the fixed value with the Pert(30, 120, 365) distribution for Irish artisan cheese.',
    farm:'Herd size and herd incidence are fitted to CSO returns. Within-herd prevalence follows Collins and More. These are the inputs behind the infected-cow count.',
    shed:'Shedding is split between animals that would react to the tuberculin test and animals that would not. The weighted mix is what enters the bulk tank.',
    proc:'Curd partitioning concentrates cells; maturation inactivates them. Post-ripening storage adds a small temperature-dependent reduction at retail and in the home.',
    cc:'Post-process contamination bypasses maturation. In a well-matured cheese it becomes the dominant term in the final concentration, which is why it ranks so high in the sensitivity analysis.',
    dr:'No validated human oral dose-response model exists for M. bovis. The infectivity parameter is a truncated lognormal spanning three orders of magnitude and it dominates output variance.',
    link:'Scenario multipliers from the workbook configuration, plus the iteration count. Latin hypercube sampling is used for every input with a closed-form inverse.'
  };
  return `<p class="small" style="max-width:74ch">${t[id]||''}</p>`;
}

function groupReadout(id,o){
  if(id==='case'){
    const c=PROFILES.concat(COUNTIES).find(x=>x.n===o.county)||{inc:0,mult:1,tier:'—'};
    return `<dl class="kv"><dt>County herd incidence, 2024</dt><dd>${fix(c.inc,2)}%</dd>
      <dt>Multiplier against national mean</dt><dd>${fix(c.mult,4)}×</dd>
      <dt>Tier</dt><dd>${c.tier}</dd>
      <dt>Seasonal factor</dt><dd>${o.useSeason?SEASON[WIN?WIN.month:0].f.toFixed(2)+'× ('+SEASON[WIN?WIN.month:0].m+')':'not applied'}</dd></dl>`;
  }
  if(id==='dates'){
    const W=windowAnalysis(o);
    return windowTimeline(W)+`<dl class="kv"><dt>Position</dt><dd>${W.position}</dd>
      <dt>Retrospective uncertainty factor</dt><dd>${fix(1+W.elapsed*(1-o.seTst)*o.retroWeight,4)}×</dd>
      <dt>Date check</dt><dd>${W.msg}</dd></dl>`;
  }
  if(id==='cheese'){
    const lr=(o.maturationFixed||120)/o.dValue;
    return `<dl class="kv"><dt>Maturation log reduction</dt><dd>${fix(lr,2)} log₁₀</dd>
      <dt>Surviving fraction</dt><dd>${sci(Math.pow(10,-lr))}</dd>
      <dt>Effective consumers</dt><dd>${Math.round(o.consumers*o.pConsume).toLocaleString()}</dd>
      <dt>Annual servings</dt><dd>${o.servingsFixed||'Poisson(1.8)/week'}</dd></dl>`;
  }
  if(id==='farm'){
    const nh=(o.nHerdMin+4*o.nHerdMode+o.nHerdMax)/6;
    return `<dl class="kv"><dt>Herd size distribution mean</dt><dd>${fix(nh,1)} cows</dd>
      <dt>Herd incidence mean</dt><dd>${fix(100*o.pHerdA/(o.pHerdA+o.pHerdB),3)}%</dd>
      <dt>Within-herd prevalence mean</dt><dd>${fix(100*o.pWithinA/(o.pWithinA+o.pWithinB),2)}%</dd></dl>`;
  }
  if(id==='shed'){
    const sp=(o.shedPosMin+4*o.shedPosMode+o.shedPosMax)/6, sn=(o.shedNegMin+4*o.shedNegMode+o.shedNegMax)/6;
    const pw=o.pWithinA/(o.pWithinA+o.pWithinB);
    return `<dl class="kv"><dt>Reactor shedding mean</dt><dd>${sci(sp)} CFU/mL</dd>
      <dt>Non-reactor shedding mean</dt><dd>${sci(sn)} CFU/mL</dd>
      <dt>Weighted mix</dt><dd>${sci(pw*sp+(1-pw)*sn)} CFU/mL</dd></dl>`;
  }
  if(id==='proc'){
    const cf=(o.curdMin+4*o.curdMode+o.curdMax)/6*((o.concMin+4*o.concMode+o.concMax)/6);
    return `<dl class="kv"><dt>Net concentration factor</dt><dd>${fix(cf,2)}× per gram vs per mL</dd>
      <dt>D-value</dt><dd>Normal(${o.dValue}, ${o.dValueSd}) days</dd>
      <dt>Post-ripening reduction</dt><dd>about ${fix(0.002*Math.exp(0.05*(o.domTempMode-5))*((o.retailMode+o.domMode))/2.303,3)} log₁₀</dd></dl>`;
  }
  if(id==='cc'){
    const e=((o.ccPMin+4*o.ccPMode+o.ccPMax)/6)*((o.ccCMin+4*o.ccCMode+o.ccCMax)/6);
    return `<dl class="kv"><dt>Expected contribution</dt><dd>${sci(e)} CFU/g averaged over all servings</dd></dl>`;
  }
  if(id==='dr'){
    const f=(o.suscA/(o.suscA+o.suscB))*(2-o.bcgA/(o.bcgA+o.bcgB));
    return `<dl class="kv"><dt>Susceptibility mean</dt><dd>${fix(o.suscA/(o.suscA+o.suscB),3)}</dd>
      <dt>BCG protection mean</dt><dd>${fix(o.bcgA/(o.bcgA+o.bcgB),3)}</dd>
      <dt>Effective infectivity mean</dt><dd>${sci(o.rMean*f)}</dd></dl>`;
  }
  return '';
}

/* ---------- retrospective window ---------- */
V.window=()=>{
  const r=ensure(), W=WIN, o=gather();
  return `
  <div class="eyebrow">Assessment</div>
  <h1>Retrospective window</h1>
  <p class="lead">The policy question is whether this batch was produced between the last clear herd
  test and the subsequent loss of TB-free status, and how far into that interval it sits.</p>

  <div class="verdictcard ${W.inside?'mod':'low'}">
    <div class="vc-k">${W.position}</div>
    <p>${W.plain}</p>
  </div>

  <div class="card" style="margin-top:16px">${windowTimeline(W)}</div>

  <div class="grid g4" style="margin-top:14px">
    ${tile('Window length',W.windowDays+' days','last clear test to status loss')}
    ${tile('Production offset',W.daysAfterClear+' days','after the last clear test')}
    ${tile('Elapsed fraction',fix(W.elapsed*100,1)+'%','position within the window')}
    ${tile('Uncertainty factor',fix(r.ruf,3)+'×','applied to herd prevalence')}
  </div>

  <h2>Why position in the window matters</h2>
  <p>The tuberculin test has a herd-level sensitivity near 0.75, and infection takes time to produce a
  detectable immune response. A batch made shortly after a clear test carries less undetected
  infection than one made shortly before the herd failed. The tool represents this with a
  retrospective uncertainty factor applied to herd prevalence.</p>
  <div class="eq">RUF = 1 + elapsed fraction × (1 − Se<sub>SICTT</sub>) × k</div>
  <dl class="kv">
    <dt>Elapsed fraction</dt><dd>${fix(W.elapsed,4)}</dd>
    <dt>1 − Se</dt><dd>${fix(1-o.seTst,4)}</dd>
    <dt>Weighting coefficient k</dt><dd>${fix(o.retroWeight,2)}</dd>
    <dt>Resulting factor</dt><dd>${fix(r.ruf,4)}×</dd>
    <dt>Prevalence multiplier fed to the model</dt><dd>${fix(r.prevMult,4)}×</dd>
    <dt>Shedding multiplier, square root scaling</dt><dd>${fix(r.shedMult,4)}×</dd>
  </dl>
  <div class="warn">The coefficient k is calibrated so that the reference workbook case reproduces its
  recorded factor of 1.507. It is a working assumption rather than a measured quantity, and it should
  be revisited if better evidence on within-window seroconversion becomes available.</div>

  <h2>Regulatory position</h2>
  <div class="tablewrap"><table>
    <tr><th>Batch position</th><th>Regulatory reading</th><th>Typical action</th></tr>
    <tr><td>Before the last clear test</td><td>Outside the scope of this assessment. The herd held
      TB-free status throughout the relevant period.</td><td>No retrospective action indicated</td></tr>
    <tr><td>Inside the window</td><td>Not addressed explicitly by Regulation (EC) No 853/2004, which
      governs prospective controls on milk from restricted herds.</td><td>Case-by-case risk-manager
      judgement, informed by this assessment</td></tr>
    <tr><td>After loss of status</td><td>Milk from a restricted herd should not have entered raw-milk
      cheese production without heat treatment.</td><td>Compliance question, not a QMRA question</td></tr>
  </table></div>`;
};

/* ---------- results ---------- */
V.results=()=>{
  const r=ensure(), o=gather(), b=band(r.meanRisk);
  const above6=count(r.risk,1e-6), above5=count(r.risk,1e-5);
  return `
  <div class="eyebrow">Assessment</div>
  <h1>Risk characterisation</h1>
  <p class="lead">${esc(o.county)}, ${o.herdSize} cows, ${CHEESETYPES[o.cheese].label} at
  ${o.maturationFixed||'distributed'} days${o.pasteurised?', pasteurised milk':''}.
  ${r.n.toLocaleString()} iterations with Latin hypercube sampling.</p>

  <div style="margin:14px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${pill(b.cls,b.t)}${pill('','WHO ratio '+fix(r.whoRatio,3))}
    ${pill('',fix(100*above6/r.n,1)+'% of iterations above 10⁻⁶')}
  </div>

  <div class="grid g4">
    ${tile('Mean annual risk',sci(r.meanRisk),'per consumer per year',true)}
    ${tile('Median',sci(r.median),'50th percentile')}
    ${tile('5th – 95th',sci(r.p05,1)+' – '+sci(r.p95,1),'90% uncertainty interval')}
    ${tile('Standard deviation',sci(r.sd),'across iterations')}
  </div>
  <div class="grid g4" style="margin-top:14px">
    ${tile('Risk per serving',sci(r.riskServing),'single eating occasion')}
    ${tile('Expected cases',fix(r.cases,4),'95th percentile '+fix(r.cases95,4))}
    ${tile('Disease burden',fix(r.dalys,4),'DALYs at '+o.daly+' per case')}
    ${tile('Maximum iteration',sci(r.max),'worst sampled combination')}
  </div>

  <div class="chartbox" style="margin-top:18px"><h3>Distribution of annual risk</h3>
    <div class="cap">${r.n.toLocaleString()} iterations. ${fix(100*above6/r.n,1)}% exceed 10⁻⁶ and
    ${fix(100*above5/r.n,1)}% exceed 10⁻⁵.</div><canvas id="c-hist2"></canvas></div>

  <div class="split" style="margin-top:16px">
    <div class="chartbox"><h3>Concentration through the chain</h3>
      <div class="cap">Curd partitioning raises concentration; maturation is the dominant reduction.</div>
      <canvas id="c-water"></canvas></div>
    <div class="chartbox"><h3>Maturation kinetics</h3>
      <div class="cap">First-order inactivation at the D-value mean and ± one standard deviation.</div>
      <canvas id="c-decay"></canvas></div>
  </div>

  <h2>Pathway values</h2>
  <div class="tablewrap"><table>
    <tr><th>Stage</th><th>Quantity</th><th>This run</th><th>Reference workbook</th></tr>
    <tr><td>Farm</td><td>Prevalence multiplier</td><td class="num">${fix(r.prevMult,4)}×</td><td class="num">${fix(REF.prevMult,4)}×</td></tr>
    <tr><td>Bulk tank</td><td>Mean concentration</td><td class="num">${sci(r.meanBtm)} CFU/mL</td><td class="num">${sci(REF.btm)} CFU/mL</td></tr>
    <tr><td>Processing</td><td>Total log reduction</td><td class="num">${fix(r.meanLr,3)}</td><td class="num">${fix(REF.lr,3)}</td></tr>
    <tr><td>Processing</td><td>Surviving fraction</td><td class="num">${sci(r.meanSurv)}</td><td class="num">—</td></tr>
    <tr><td>Product</td><td>Concentration at consumption</td><td class="num">${sci(r.meanConc)} CFU/g</td><td class="num">—</td></tr>
    <tr><td>Exposure</td><td>Dose per serving</td><td class="num">${sci(r.meanDose)} CFU</td><td class="num">${sci(REF.dose)} CFU</td></tr>
    <tr><td>Risk</td><td>Per serving</td><td class="num">${sci(r.riskServing)}</td><td class="num">${sci(REF.serving)}</td></tr>
    <tr><td>Risk</td><td>Annual per consumer</td><td class="num">${sci(r.meanRisk)}</td><td class="num">${sci(REF.annual)}</td></tr>
    <tr><td>Population</td><td>Expected annual cases</td><td class="num">${fix(r.cases,4)}</td><td class="num">${fix(REF.cases,4)}</td></tr>
  </table></div>
  <p class="small">The reference column records the @RISK workbook base run, which used the low-tier
  county profile with no retrospective factor. Load that configuration on the validation page to
  compare like with like.</p>

  <h2>Interpretation</h2>
  <p>${b.note} The spread is governed by the infectivity parameter, which is bounded by expert
  reasoning rather than measured in humans, so the percentile range carries more information than the
  point estimate. Treat the result as evidence about the plausible magnitude of exposure.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
    <button class="btn ghost" data-go="sensitivity">What drives this estimate</button>
    <button class="btn" data-go="report">Generate the decision report</button>
  </div>`;
};
const count=(a,t)=>{let c=0;for(let i=0;i<a.length;i++) if(a[i]>t) c++; return c;};
V.results.after=()=>{ const r=ensure(), o=gather();
  chartHist(document.getElementById('c-hist2'),r);
  chartWaterfall(document.getElementById('c-water'),o,r);
  chartDecay(document.getElementById('c-decay'),o,r); };

/* ---------- scenarios ---------- */
let SCEN=null;
V.scenarios=()=>{
  const base=gather(), W=WIN||windowAnalysis(base);
  const it=Math.min(base.iters,6000);
  SCEN=PROFILES.map(p=>({p, r:runModel({...base,countyMult:p.mult,iters:it},W)}));
  const past=runModel({...base,pasteurised:1,iters:it},W);
  const raw=SCEN[0].r;
  return `
  <div class="eyebrow">Policy analysis</div>
  <h1>Scenario comparison</h1>
  <p class="lead">The same case run against each county tier. Multipliers are the herd-weighted 2024
  incidence of that tier divided by the national mean of 6.06%, taken directly from CSO DAA01.</p>

  <div class="tablewrap" style="margin-top:14px"><table>
    <tr><th>Profile</th><th>Counties</th><th>Herd incidence</th><th>Multiplier</th>
      <th>Mean annual risk</th><th>95th percentile</th><th>Cases</th><th>Band</th></tr>
    ${SCEN.map(({p,r})=>{const b=band(r.meanRisk);return `<tr>
      <td><strong>${esc(p.n)}</strong><div class="small">${esc(p.note)}</div></td>
      <td class="num">${p.n==='National average'?29:TIERS[p.tier].counties}</td>
      <td class="num">${fix(p.inc,2)}%</td><td class="num">${fix(p.mult,4)}×</td>
      <td class="num">${sci(r.meanRisk)}</td><td class="num">${sci(r.p95)}</td>
      <td class="num">${fix(r.cases,4)}</td><td>${pill(b.cls,b.k)}</td></tr>`;}).join('')}
  </table></div>

  <div class="chartbox" style="margin-top:18px"><h3>Annual risk by county profile</h3>
    <div class="cap">Bar and vertical rule mark the mean; whiskers span the 5th to 95th percentile.</div>
    <canvas id="c-scen"></canvas>
    <p class="small" style="margin-bottom:0">Risk does not scale linearly with county incidence. Once a
    cheese is well matured, most of the dose arrives after processing, and post-process contamination
    is independent of herd status. County incidence governs what enters the vat; facility hygiene
    governs what reaches the plate.</p></div>

  <h2>Individual Regional Veterinary Offices</h2>
  <p>All 29 areas, 2024 herd incidence. Your current selection is outlined in both views.</p>
  <div class="split" style="margin-top:0">
    <div class="chartbox"><h3>Geographic layout</h3>
      <div class="cap">Counties shaded by 2024 herd incidence. The selected area is outlined.</div>
      ${irelandMapSVG(COUNTIES.find(c=>c.n===base.county)?base.county:null)}</div>
    <div class="chartbox"><h3>Ranked</h3>
      <div class="cap">The dashed rule is the national herd-weighted mean of 6.06%.</div>
      <canvas id="c-cty"></canvas></div>
  </div>

  <h2>Raw milk against pasteurisation</h2>
  <div class="tablewrap"><table>
    <tr><th>Metric</th><th>Raw milk</th><th>Pasteurised</th><th>Difference</th></tr>
    <tr><td>Total log reduction</td><td class="num">${fix(raw.meanLr,2)}</td>
      <td class="num">${fix(past.meanLr,2)}</td><td class="num">${fix(past.meanLr-raw.meanLr,2)} log more</td></tr>
    <tr><td>Concentration at consumption</td><td class="num">${sci(raw.meanConc)} CFU/g</td>
      <td class="num">${sci(past.meanConc)} CFU/g</td>
      <td class="num">${fix(raw.meanConc/Math.max(past.meanConc,1e-30),1)}× lower</td></tr>
    <tr><td>Mean dose per serving</td><td class="num">${sci(raw.meanDose)} CFU</td>
      <td class="num">${sci(past.meanDose)} CFU</td>
      <td class="num">${fix(raw.meanDose/Math.max(past.meanDose,1e-30),1)}× lower</td></tr>
    <tr><td>Mean annual risk</td><td class="num">${sci(raw.meanRisk)}</td>
      <td class="num">${sci(past.meanRisk)}</td>
      <td class="num">${fix(raw.meanRisk/Math.max(past.meanRisk,1e-30),1)}× lower</td></tr>
  </table></div>
  <div class="note" style="margin-top:14px">Pasteurisation at 65 °C for 35 s delivers about 4.5 log₁₀
  (Hammer et al. 2015). It removes what arrives through the milk, so the residual risk is set by what
  reaches the cheese afterwards.</div>

  <h2>Seasonal factors</h2>
  <p>When enabled on the case setup page, the month of production applies a factor reflecting housing
  density and testing activity.</p>
  <div class="tablewrap"><table>
    <tr><th>Month</th><th>Factor</th><th>Housing</th><th>Testing activity</th><th>Milk production index</th></tr>
    ${SEASON.map(s=>`<tr><td>${s.m}</td><td class="num">${s.f.toFixed(2)}×</td><td>${s.housing}</td>
      <td>${s.testing}</td><td class="num">${s.milk.toFixed(2)}</td></tr>`).join('')}
  </table></div>`;
};
V.scenarios.after=()=>{
  if(!SCEN) return;
  chartBarsLog(document.getElementById('c-scen'),
    SCEN.map(({p,r})=>({label:p.n.replace(' average',''), v:r.meanRisk, lo:r.p05, hi:r.p95,
      colour:band(r.meanRisk).cls==='low'?css('--brand'):band(r.meanRisk).cls==='mod'?css('--mod'):css('--high')})),
    {ref:1e-6,refLabel:'WHO 10⁻⁶'});
  chartCounties(document.getElementById('c-cty'),P.county.v);
};

/* ---------- sensitivity ---------- */
V.sensitivity=()=>{
  const r=ensure(), top=r.src.terms[0];
  const tot=r.src.terms.reduce((s,t)=>s+t.src*t.src,0)||1;
  return `
  <div class="eyebrow">Assessment</div>
  <h1>Sensitivity analysis</h1>
  <p class="lead">Standardised regression coefficients of annual risk on every sampled input. A
  coefficient is the change in output, in standard deviations, for a one standard deviation change in
  that input with the others held still.</p>

  <div class="chartbox" style="margin-top:14px"><h3>Tornado</h3>
    <div class="cap">Model R² = ${fix(r.src.r2,3)} across ${r.n.toLocaleString()} iterations.</div>
    <canvas id="c-tor"></canvas></div>

  <div class="tablewrap" style="margin-top:16px"><table>
    <tr><th>Rank</th><th>Input</th><th>SRC</th><th>Share of explained variance</th><th>Controllable</th></tr>
    ${r.src.terms.map((t,i)=>`<tr><td>${i+1}</td><td>${t.name}</td>
      <td class="num">${t.src.toFixed(3)}</td>
      <td class="num">${fix(100*t.src*t.src/tot,1)}%</td>
      <td>${CONTROL[t.key]||'—'}</td></tr>`).join('')}
  </table></div>

  <h2>What follows</h2>
  <div class="grid g2" style="margin-top:12px">
    <div class="card"><h3>Dominant driver</h3><p class="small"><strong>${top.name}</strong> carries an SRC
    of ${top.src.toFixed(3)}. Where that is the infectivity parameter, the ranking reflects a research
    gap rather than a control point: no validated human oral dose-response model exists for
    <em>M. bovis</em>, and the truncated lognormal used here spans three orders of magnitude.</p></div>
    <div class="card"><h3>What a risk manager can move</h3><p class="small">Maturation age and the
    cross-contamination terms are the levers that exist in practice. Herd and county terms describe the
    situation rather than offer a control. Facility hygiene and age at sale are where an intervention
    changes the answer.</p></div>
  </div>
  <div class="warn" style="margin-top:16px">R² below 1 means the linear regression does not capture all
  the variance. The model is multiplicative, so part of the spread is interaction rather than main
  effect. Read the ranking as an ordering of importance, not as a variance budget.</div>`;
};
const CONTROL={ r:'No, research gap', ccC:'Yes, facility hygiene', ccP:'Yes, facility hygiene',
  pHerd:'No, epidemiology', serving:'No, consumer behaviour', shedPos:'No, biology',
  dVal:'Partly, via cheese type', matur:'Yes, age at sale', susc:'No, host factor',
  bcg:'No, population immunity', pWithin:'No, epidemiology', nHerd:'No, case fact' };
V.sensitivity.after=()=>chartTornado(document.getElementById('c-tor'),ensure().src.terms);

/* ---------- primary models ---------- */
V.primary=()=>{
  const o=gather(), r=ensure();
  return `
  <div class="eyebrow">Models</div>
  <h1>Primary models</h1>
  <p class="lead">A primary model describes how the organism behaves over time or dose under fixed
  conditions. This assessment uses three, plus two mass-balance relationships.</p>

  <h2>1. Thermal and maturation inactivation: log-linear D-value model</h2>
  <p>Survival during ripening is modelled as first-order decay. The decimal reduction time D is the
  time for a tenfold loss of viable organisms at the maturation temperature of that cheese.</p>
  <div class="eq">LR = t<sub>maturation</sub> ÷ D &nbsp;&nbsp;&nbsp; S = 10<sup>−LR</sup></div>
  <dl class="kv">
    <dt>Form</dt><dd>Log-linear, no shoulder and no tail</dd>
    <dt>D in use</dt><dd>Normal(${o.dValue}, ${o.dValueSd}) days, ${CHEESETYPES[o.cheese].label}</dd>
    <dt>Current log reduction</dt><dd>${fix(r.meanLr,3)} log₁₀, surviving fraction ${sci(r.meanSurv)}</dd>
    <dt>Source</dt><dd>Forgrave et al. 2016; independent replicate in Starikoff et al. 2016</dd>
  </dl>
  <div class="chartbox"><h3>Inactivation curves</h3>
    <div class="cap">Central curve at the D-value mean, dashed at ± one standard deviation.</div>
    <canvas id="c-decay2"></canvas></div>
  <div class="tablewrap" style="margin-top:14px"><table>
    <tr><th>Matrix</th><th>Inoculum level</th><th>D-value (days)</th><th>Source</th></tr>
    ${DVALUES.map(d=>`<tr><td>${d.type}</td><td>${d.level}, ${d.inoc}</td>
      <td class="num">${d.d}</td><td>${d.src}</td></tr>`).join('')}
    <tr><td>Pasteurisation</td><td>65 °C for 35 s</td><td class="num">4.1 – 4.9 log₁₀</td><td>Hammer et al. 2015</td></tr>
  </table></div>
  <p class="small">High-inoculum D-values are used as the default because slower inactivation is the
  conservative choice for a risk assessment.</p>

  <h2>2. Post-ripening decay during storage</h2>
  <p>A small additional reduction occurs at retail and domestic temperatures. The rate is
  temperature-adjusted around a 5 °C reference.</p>
  <div class="eq">k = 0.002 × exp[0.05 × (T<sub>domestic</sub> − 5)] &nbsp;&nbsp;&nbsp;
    LR<sub>storage</sub> = k × (t<sub>retail</sub> + t<sub>domestic</sub>) ÷ 2.303</div>
  <p class="small">This term contributes roughly 0.02 log₁₀ in the base case. It is retained because it
  carries the temperature dependence that matters in warmer domestic refrigeration.</p>

  <h2>3. Dose-response: exponential single-hit model</h2>
  <p>Each ingested organism is assumed to have an independent probability of initiating infection, with
  no threshold.</p>
  <div class="eq">P(infection) = 1 − exp(−r<sub>eff</sub> × Dose)</div>
  <div class="eq">r<sub>eff</sub> = r × Susceptibility × (2 − BCG<sub>factor</sub>)</div>
  <div class="chartbox"><h3>Infection probability against dose</h3>
    <div class="cap">Both axes log₁₀. The modelled serving dose is marked.</div>
    <canvas id="c-dr2"></canvas></div>
  <div class="warn" style="margin-top:14px">No validated human oral dose-response model exists for
  <em>M. bovis</em>. Published work covers animal challenge by respiratory and intratracheal routes,
  and human data come from aerosol BCG studies. The parameter r is therefore an uncertainty term, and
  the result should be read as a range rather than a prediction.</div>

  <h2>4. Mass balance: bulk tank dilution</h2>
  <div class="eq">C<sub>BTM</sub> = (N<sub>infected</sub> × Shedding) ÷ V<sub>milk</sub> × 1000</div>
  <p class="small">Shedding is the prevalence-weighted mix of reactor and non-reactor animals. Milk
  volume is herd size times daily yield times the scenario farm-size factor.</p>

  <h2>5. Mass balance: curd partitioning and annual accumulation</h2>
  <div class="eq">C<sub>curd</sub> = C<sub>BTM</sub> × f<sub>retention</sub> × F<sub>concentration</sub></div>
  <div class="eq">P<sub>annual</sub> = 1 − (1 − P<sub>serving</sub>)<sup>n<sub>servings</sub></sup></div>
  <p class="small">Curd retention follows Forgrave et al. 2016, which reported 4.8-fold concentration in
  Cheddar and 2.3-fold in Caerphilly. Annual risk accumulates across independent eating occasions.</p>`;
};
V.primary.after=()=>{ const o=gather(), r=ensure();
  chartDecay(document.getElementById('c-decay2'),o,r);
  chartDR(document.getElementById('c-dr2'),o,r); };

/* ---------- secondary models ---------- */
V.secondary=()=>{
  const r=ensure(), o=gather();
  return `
  <div class="eyebrow">Models</div>
  <h1>Secondary models</h1>
  <p class="lead">A secondary model describes how a primary-model parameter changes with conditions.
  Four operate here, and together they turn a national assessment into a case-specific one.</p>

  <h2>1. County prevalence multiplier</h2>
  <p>Herd prevalence is scaled by the ratio of that Regional Veterinary Office's 2024 herd incidence to
  the national herd-weighted mean.</p>
  <div class="eq">M<sub>county</sub> = Incidence<sub>RVO</sub> ÷ Incidence<sub>national</sub></div>
  <div class="tablewrap"><table>
    <tr><th>Tier</th><th>Counties</th><th>Herds</th><th>Herd-weighted mean</th><th>Multiplier</th></tr>
    ${['HIGH','MED','LOW','NATIONAL'].map(k=>`<tr><td>${k==='MED'?'MEDIUM':k}</td>
      <td class="num">${TIERS[k].counties}</td><td class="num">${TIERS[k].herds.toLocaleString()}</td>
      <td class="num">${fix(TIERS[k].mean,2)}%</td><td class="num">${fix(TIERS[k].mult,4)}×</td></tr>`).join('')}
  </table></div>
  <p class="small">Range across individual areas is five-fold, from Mayo at 2.51% to Wicklow West at
  16.38%.</p>

  <h2>2. Shedding multiplier: sub-linear scaling</h2>
  <p>Shedding intensity is assumed to rise with prevalence but less than proportionally, because a
  higher-prevalence herd contains proportionally more early-stage animals.</p>
  <div class="eq">M<sub>shedding</sub> = √M<sub>prevalence</sub></div>
  <dl class="kv"><dt>Current prevalence multiplier</dt><dd>${fix(r.prevMult,4)}×</dd>
    <dt>Resulting shedding multiplier</dt><dd>${fix(r.shedMult,4)}×</dd>
    <dt>Basis</dt><dd>Collins systematic review and meta-analysis 2021</dd></dl>

  <h2>3. Retrospective uncertainty factor</h2>
  <p>Position within the window modifies how much undetected infection the model carries, through
  tuberculin test sensitivity.</p>
  <div class="eq">RUF = 1 + f<sub>elapsed</sub> × (1 − Se<sub>SICTT</sub>) × k</div>
  <dl class="kv"><dt>Elapsed fraction</dt><dd>${fix(r.window.elapsed,4)}</dd>
    <dt>Test sensitivity</dt><dd>${fix(o.seTst,4)}</dd>
    <dt>Current factor</dt><dd>${fix(r.ruf,4)}×</dd></dl>

  <h2>4. Seasonal factor</h2>
  <p>Housing density and testing activity vary across the year. When enabled, the month of production
  applies a factor between 0.70 in June and 1.30 in February.</p>
  <dl class="kv"><dt>Status</dt><dd>${o.useSeason?'Applied, '+SEASON[r.window.month].m+' at '+SEASON[r.window.month].f.toFixed(2)+'×':'Not applied'}</dd>
    <dt>Annual mean factor</dt><dd>${fix(SEASON.reduce((s,x)=>s+x.f,0)/12,3)}×</dd></dl>

  <h2>Composition</h2>
  <p>The multipliers compose multiplicatively before entering the farm module.</p>
  <div class="eq">M<sub>prevalence</sub> = M<sub>county</sub> × RUF × M<sub>season</sub></div>
  <dl class="kv">
    <dt>County</dt><dd>${fix(r.countyMult,4)}×</dd>
    <dt>Retrospective</dt><dd>${fix(r.ruf,4)}×</dd>
    <dt>Seasonal</dt><dd>${fix(r.seasonMult,4)}×</dd>
    <dt>Combined</dt><dd><b>${fix(r.prevMult,4)}×</b></dd>
  </dl>

  <h2>Not implemented</h2>
  <p>The workbook records processing temperature, processing time, final pH and water activity as a
  response-surface framework. Those variables are sampled but no secondary model currently links them
  to the D-value, because no published surface exists for <em>M. bovis</em> in cheese. They are listed
  here so the gap is explicit rather than hidden.</p>`;
};

/* ---------- specification ---------- */
V.spec=()=>{
  const o=gather(), r=ensure();
  return `
  <div class="eyebrow">Models</div>
  <h1>Model specification</h1>
  <p class="lead">A six-module stochastic farm-to-fork assessment following the EFSA four-step
  framework and Codex CAC/GL 30-1999, implemented as ${o.iters.toLocaleString()} Latin hypercube
  iterations in the browser.</p>

  <h2>Computation order</h2>
  <div class="tablewrap"><table>
    <tr><th>#</th><th>Step</th><th>Expression</th><th>Units</th></tr>
    <tr><td>1</td><td>Infected cows</td><td>N<sub>herd</sub> × P<sub>herd</sub> × P<sub>within</sub> × M<sub>prevalence</sub></td><td>cows</td></tr>
    <tr><td>2</td><td>Shedding</td><td>[P<sub>within</sub>·Shed<sub>pos</sub> + (1−P<sub>within</sub>)·Shed<sub>neg</sub>] × M<sub>shedding</sub></td><td>CFU/mL</td></tr>
    <tr><td>3</td><td>Milk volume</td><td>N<sub>herd</sub> × Y<sub>milk</sub> × F<sub>farm size</sub></td><td>L/day</td></tr>
    <tr><td>4</td><td>Bulk tank</td><td>(1) × (2) ÷ (3) × 1000</td><td>CFU/mL</td></tr>
    <tr><td>5</td><td>Fresh curd</td><td>(4) × f<sub>retention</sub> × F<sub>concentration</sub></td><td>CFU/g</td></tr>
    <tr><td>6</td><td>Log reduction</td><td>t ÷ D + k(T)·(t<sub>retail</sub>+t<sub>domestic</sub>)/2.303</td><td>log₁₀</td></tr>
    <tr><td>7</td><td>At consumption</td><td>[(5) × 10<sup>−(6)</sup> + P<sub>cross</sub>·C<sub>cross</sub>] × F<sub>processing</sub></td><td>CFU/g</td></tr>
    <tr><td>8</td><td>Dose</td><td>(7) × m<sub>serving</sub></td><td>CFU</td></tr>
    <tr><td>9</td><td>Risk per serving</td><td>1 − exp(−r<sub>eff</sub> × (8))</td><td>probability</td></tr>
    <tr><td>10</td><td>Annual risk</td><td>1 − (1 − (9))<sup>n</sup></td><td>probability</td></tr>
    <tr><td>11</td><td>Cases</td><td>(10) × N<sub>consumers</sub> × P<sub>consume</sub></td><td>cases/year</td></tr>
    <tr><td>12</td><td>Burden</td><td>(11) × DALYs per case</td><td>DALYs/year</td></tr>
  </table></div>

  <h2>Sampling</h2>
  <p>Inputs with a closed-form inverse cumulative distribution are drawn by Latin hypercube over
  stratified uniforms, independently shuffled for each variable. Pert and Beta inputs are drawn by the
  Marsaglia and Tsang gamma method. Sensitivity is computed as standardised regression coefficients of
  annual risk on all sampled inputs, solved through the normal equations.</p>
  <div class="tablewrap"><table>
    <tr><th>Distribution</th><th>Used for</th><th>Sampling route</th></tr>
    <tr><td>Pert(min, mode, max)</td><td>Herd size, shedding, curd retention, concentration factor, storage, cross-contamination</td><td>Scaled Beta, gamma method</td></tr>
    <tr><td>Beta(α, β)</td><td>Herd incidence, within-herd prevalence, susceptibility, BCG</td><td>Gamma method</td></tr>
    <tr><td>Normal(μ, σ)</td><td>D-value, serving size, pasteurisation log reduction</td><td>Latin hypercube, inverse normal</td></tr>
    <tr><td>Lognormal truncated</td><td>Infectivity r</td><td>Latin hypercube, inverse normal</td></tr>
    <tr><td>Triangular</td><td>Milk yield bounds where used</td><td>Latin hypercube, closed-form inverse</td></tr>
    <tr><td>Poisson(λ)</td><td>Consumption frequency when not fixed</td><td>Inversion</td></tr>
  </table></div>

  <h2>Current configuration</h2>
  <dl class="kv">
    <dt>Iterations</dt><dd>${r.n.toLocaleString()}</dd>
    <dt>Sampling</dt><dd>Latin hypercube with independent shuffling</dd>
    <dt>Prevalence multiplier</dt><dd>${fix(r.prevMult,4)}×</dd>
    <dt>Shedding multiplier</dt><dd>${fix(r.shedMult,4)}×</dd>
    <dt>Effective consumers</dt><dd>${Math.round(r.pop).toLocaleString()}</dd>
    <dt>Servings per consumer per year</dt><dd>${fix(r.servings,1)}</dd>
  </dl>

  <h2>Deliberate simplifications</h2>
  <ul class="refs">
    <li>Inputs are sampled independently. Correlation between herd size, yield and prevalence is not modelled.</li>
    <li>No growth is modelled at any stage. <em>M. bovis</em> does not grow in cheese, so the chain is inactivation and physical concentration only.</li>
    <li>The response-surface variables are sampled but not yet linked to the D-value.</li>
    <li>Cross-contamination is treated as independent of herd status, which is the reason risk does not scale linearly with county incidence.</li>
  </ul>`;
};

/* ---------- parameters ---------- */
V.params=()=>{
  const byGroup={};
  for(const k in P){ (byGroup[P[k].g]=byGroup[P[k].g]||[]).push(k); }
  const names={case:'Herd and county',dates:'Testing and dates',cheese:'Product and exposure',
    farm:'Farm distributions',shed:'Shedding',proc:'Processing',cc:'Cross-contamination',
    dr:'Dose-response',link:'Scenario linkage'};
  return `
  <div class="eyebrow">Evidence</div>
  <h1>Parameters and distributions</h1>
  <p class="lead">Every input in the model, with its distribution, its current value, its source and
  its provenance class. This is the register a reviewer should read first.</p>
  <div class="legend" style="margin:14px 0">
    <span><i style="background:var(--navy-2)"></i>CSO surveillance</span>
    <span><i style="background:var(--brand)"></i>Literature</span>
    <span><i style="background:var(--mod)"></i>Calibrated</span>
    <span><i style="background:var(--muted)"></i>Case input</span>
  </div>
  ${Object.keys(names).map(g=>!byGroup[g]?'':`
    <h2>${names[g]}</h2>
    <div class="tablewrap"><table>
      <tr><th>Parameter</th><th>Value</th><th>Distribution</th><th>Source</th><th>Class</th></tr>
      ${byGroup[g].map(k=>{const p=P[k];return `<tr><td>${p.label}</td>
        <td class="num">${typeof p.v==='number'?sci(p.v,3):esc(p.v)}</td>
        <td>${p.dist||'<span class="small">fixed</span>'}</td>
        <td class="small">${p.src||'Case input'}</td>
        <td><span class="src ${p.cls}">${CLS[p.cls]}</span></td></tr>`;}).join('')}
    </table></div>`).join('')}

  <h2>Adjustments recorded in the reference workbook</h2>
  <div class="tablewrap"><table>
    <tr><th>Date</th><th>Parameter</th><th>Change</th><th>Reason</th></tr>
    <tr><td>19 May 2026</td><td>Infectivity r</td><td>Lognormal(1×10⁻⁴, 1.5×10⁻⁴) to Lognormal(2×10⁻⁵, 3×10⁻⁵)</td>
      <td>The original sat at the conservative high end of the oral dose-response literature. Truncation at [10⁻⁶, 10⁻³] retained.</td></tr>
    <tr><td>19 May 2026</td><td>Cross-contamination probability</td><td>Pert(0.01, 0.068, 0.15) to Pert(0.005, 0.02, 0.08)</td>
      <td>Tightened to reflect HACCP-compliant Irish artisan dairies under Regulation (EC) No 852/2004.</td></tr>
    <tr><td>19 May 2026</td><td>Cross-contamination level</td><td>Pert(0, 0.001, 0.01) to Pert(0, 0.0003, 0.003)</td>
      <td>Tightened to post-pasteurisation environmental loads in compliant facilities.</td></tr>
    <tr><td>19 May 2026</td><td>Herd size</td><td>Pert(49, 57, 82) to Pert(21.1, 62.6, 124.2)</td>
      <td>Widened to the empirical range across all 29 Regional Veterinary Offices.</td></tr>
  </table></div>

  <h2>Open evidence gaps</h2>
  <div class="grid g2" style="margin-top:12px">
    <div class="card"><h3>Oral infectivity in humans</h3><p class="small">The decisive gap. A defensible
    estimate would narrow the output by orders of magnitude and change what the tool can support.</p></div>
    <div class="card"><h3>Shedding into bulk milk</h3><p class="small">Irish isolate data on how often
    and at what level infected cows shed into milk would replace an elicited range with a measured
    one.</p></div>
    <div class="card"><h3>Facility cross-contamination</h3><p class="small">Environmental swab data from
    Irish farmhouse cheese facilities would move the second and third ranked drivers out of the
    calibrated class.</p></div>
    <div class="card"><h3>Response surface for D-value</h3><p class="small">No published surface links
    pH, water activity and temperature to <em>M. bovis</em> inactivation in cheese, so cheese type
    currently stands in for matrix conditions.</p></div>
  </div>`;
};

/* ---------- surveillance ---------- */
V.surveillance=()=>{
  const l=NATIONAL[NATIONAL.length-1], f=NATIONAL[0];
  const min=NATIONAL.reduce((a,b)=>b.inc<a.inc?b:a);
  return `
  <div class="eyebrow">Evidence</div>
  <h1>CSO surveillance data</h1>
  <p class="lead">The model is parameterised directly on Central Statistics Office returns for the
  Bovine Tuberculosis Eradication Programme: tables DAA01 annual, DAQ01 and DAQ02 quarterly, across
  all 29 Regional Veterinary Office areas.</p>

  <div class="grid g4" style="margin-top:14px">
    ${tile('2024 herd incidence',l.inc.toFixed(2)+'%','highest in over a decade',true)}
    ${tile('Reactors, 2024',l.reactors.toLocaleString(),'up from '+NATIONAL[13].reactors.toLocaleString()+' in 2023')}
    ${tile('Restricted herds',l.restricted.toLocaleString(),'at end of year')}
    ${tile('15-year low',min.inc.toFixed(2)+'%','in '+min.y)}
  </div>

  <div class="chartbox" style="margin-top:18px"><h3>National trend, 2010 to 2024</h3>
    <div class="cap">Line is herd incidence against the left axis. Bars are reactor numbers against the
    right axis.</div><canvas id="c-trend2"></canvas></div>

  <div class="tablewrap" style="margin-top:16px"><table>
    <tr><th>Year</th><th>Herds</th><th>Restricted</th><th>Herd incidence</th><th>Reactors</th>
      <th>Reactors per 1,000 tests</th><th>Average herd size</th></tr>
    ${NATIONAL.map(d=>`<tr><td>${d.y}</td><td class="num">${d.herds.toLocaleString()}</td>
      <td class="num">${d.restricted.toLocaleString()}</td><td class="num">${d.inc.toFixed(2)}%</td>
      <td class="num">${d.reactors.toLocaleString()}</td>
      <td class="num">${(d.reactors/d.tests*1000).toFixed(2)}</td>
      <td class="num">${d.herdSize.toFixed(1)}</td></tr>`).join('')}
  </table></div>
  <p class="small">Herd incidence rose 22.3% between 2023 and 2024. The compound annual growth rate
  across the full series is 1.89%.</p>

  <h2>County league table, 2024</h2>
  <div class="split" style="margin-top:0">
    <div class="chartbox"><h3>Geographic layout</h3>
      <div class="cap">Counties shaded by 2024 herd incidence, herd-weighted where an area splits.</div>
      ${irelandMapSVG(COUNTIES.find(c=>c.n===P.county.v)?P.county.v:null)}</div>
    <div class="chartbox"><h3>Ranked</h3>
      <div class="cap">Dashed rule marks the national herd-weighted mean.</div>
      <canvas id="c-cty2"></canvas></div>
  </div>
  <div class="tablewrap" style="margin-top:14px"><table>
    <tr><th>Rank</th><th>Regional Veterinary Office</th><th>Herds</th><th>Herd incidence</th>
      <th>Tier</th><th>Multiplier</th></tr>
    ${COUNTIES.map((c,i)=>`<tr><td>${i+1}</td><td>${esc(c.n)}</td>
      <td class="num">${c.herds.toLocaleString()}</td><td class="num">${c.inc.toFixed(2)}%</td>
      <td>${pill(c.tier==='HIGH'?'high':c.tier==='MED'?'mod':'low',c.tier)}</td>
      <td class="num">${c.mult.toFixed(4)}×</td></tr>`).join('')}
  </table></div>

  <h2>Fitted distributions</h2>
  <div class="tablewrap"><table>
    <tr><th>Variable</th><th>Method</th><th>n</th><th>Mean</th><th>Fit</th><th>Goodness of fit</th></tr>
    <tr><td>National herd incidence, 2010 to 2023</td><td>Beta, method of moments</td><td class="num">14</td>
      <td class="num">3.99%</td><td>Beta(58.02, 1394.92)</td><td class="num">KS p = 0.42</td></tr>
    <tr><td>Average animals per herd, 29 RVOs</td><td>Pert anchored on CSO</td><td class="num">29</td>
      <td class="num">62.6</td><td>Pert(21.1, 62.6, 124.2)</td><td>empirical range</td></tr>
    <tr><td>County incidence cross-section</td><td>Beta, method of moments</td><td class="num">29</td>
      <td class="num">6.95%</td><td>Beta(5.11, 68.41)</td><td class="num">KS p = 0.61</td></tr>
  </table></div>
  <p class="small">The longitudinal fit excludes 2024 so that the surge year does not dominate the
  distribution used for herd incidence. The cross-sectional fit is reported as a cross-check and is
  wider, as expected.</p>

  <h2>Source</h2>
  <p>Central Statistics Office, Bovine Tuberculosis Eradication Programme statistics. Table DAA01
  covers annual herd-level data from 2010 to 2024. DAQ01 covers quarterly skin-test data. DAQ02 adds
  gamma-interferon testing from the second quarter of 2023. Data were compiled into the reference
  workbook and are embedded here so the tool runs without a network connection.</p>`;
};
V.surveillance.after=()=>{ chartTrend(document.getElementById('c-trend2'));
  chartCounties(document.getElementById('c-cty2'),P.county.v); };

/* ---------- legislation ---------- */
V.legislation=()=>{
  const r=ensure();
  return `
  <div class="eyebrow">Evidence</div>
  <h1>Legislation and standards</h1>
  <p class="lead">What governs this product, what the comparison thresholds mean, and where the
  retrospective window sits relative to each.</p>

  <h2>Instruments that apply</h2>
  <div class="tablewrap"><table>
    <tr><th>Instrument</th><th>What it governs</th><th>Relevance to this case</th></tr>
    <tr><td>Regulation (EC) No 853/2004</td><td>Specific hygiene rules for food of animal origin,
      including raw milk and raw-milk products</td><td>Milk from a herd that has lost TB-free status
      may not enter the food chain without heat treatment. The regulation addresses the period after
      detection, not the retrospective window before it.</td></tr>
    <tr><td>Regulation (EC) No 852/2004</td><td>General hygiene of foodstuffs, HACCP</td>
      <td>Governs the facility controls that determine the cross-contamination terms, which rank second
      and third in the sensitivity analysis.</td></tr>
    <tr><td>Regulation (EC) No 178/2002</td><td>General food law, traceability and withdrawal</td>
      <td>Provides the legal basis for a withdrawal or recall decision if a risk manager concludes one
      is warranted.</td></tr>
    <tr><td>Regulation (EU) 2016/429, Animal Health Law</td><td>Disease categorisation and herd status</td>
      <td>Defines officially tuberculosis-free status and the consequences of its loss.</td></tr>
    <tr><td>S.I. Bovine Tuberculosis (Attestation of the State) Orders</td><td>National bTB eradication
      programme</td><td>Sets the testing regime and restriction procedure that create the window.</td></tr>
    <tr><td>Codex CAC/GL 30-1999</td><td>Principles and guidelines for microbiological risk assessment</td>
      <td>The structure this assessment follows.</td></tr>
  </table></div>

  <h2>Comparison thresholds</h2>
  <div class="tablewrap"><table>
    <tr><th>Reference</th><th>Level</th><th>Origin</th><th>This assessment</th></tr>
    <tr><td>WHO tolerable risk</td><td class="num">10⁻⁶ per person per year</td>
      <td>Drinking-water guidelines, widely borrowed for food</td>
      <td class="num">${sci(r.meanRisk)} (ratio ${fix(r.whoRatio,3)})</td></tr>
    <tr><td>One in 100,000</td><td class="num">10⁻⁵ per person per year</td>
      <td>Common upper comparison in food risk work</td>
      <td class="num">${fix(100*count(r.risk,1e-5)/r.n,1)}% of iterations exceed it</td></tr>
    <tr><td>95th percentile of this run</td><td class="num">${sci(r.p95)}</td>
      <td>Upper uncertainty bound</td><td>${r.p95>1e-6?'Exceeds the WHO reference':'Below the WHO reference'}</td></tr>
  </table></div>
  <div class="warn" style="margin-top:14px">The 10⁻⁶ convention is a comparator, not a standard for
  this product. A result below it does not authorise sale and a result above it does not by itself
  require withdrawal. Both are inputs to a judgement that also weighs detection timing, batch volume,
  traceability and the consumer profile.</div>

  <h2>The gap this tool addresses</h2>
  <p>Current EU and national frameworks focus on prospective control: once a herd is restricted, its
  milk is excluded. Neither addresses product already made and matured from milk collected before
  detection. Because artisan maturation commonly runs from 60 to 365 days, that product can still be in
  circulation when the herd fails. The assessment supplies quantitative evidence for a decision that
  the legislation leaves to the competent authority.</p>

  <h2>Guidance and opinions consulted</h2>
  <ul class="refs">
    <li>EFSA BIOHAZ Panel opinions on the public health risks of raw milk and raw-milk products.</li>
    <li>Advisory Committee on the Microbiological Safety of Food (2015), risks from unpasteurised milk and dairy products.</li>
    <li>WHO, FAO and WOAH roadmap for zoonotic tuberculosis.</li>
    <li>Food Safety Authority of Ireland guidance on raw-milk products and on environmental monitoring.</li>
    <li>Ministry for Primary Industries, New Zealand (2009), risk profile for <em>M. bovis</em> in raw milk.</li>
  </ul>`;
};

/* ---------- validation ---------- */
V.validation=()=>{
  const r=ensure();
  const rows=[
    ['Bulk tank concentration (CFU/mL)',r.meanBtm,REF.btm],
    ['Total log reduction',r.meanLr,REF.lr],
    ['Dose per serving (CFU)',r.meanDose,REF.dose],
    ['Risk per serving',r.riskServing,REF.serving],
    ['Annual risk per consumer',r.meanRisk,REF.annual],
    ['Annual risk, median',r.median,REF.median],
    ['Annual risk, 5th percentile',r.p05,REF.p05],
    ['Annual risk, 95th percentile',r.p95,REF.p95],
    ['Expected annual cases',r.cases,REF.cases],
    ['Annual cases, 95th percentile',r.cases95,REF.cases95],
    ['Total annual DALYs',r.dalys,REF.dalys]
  ];
  return `
  <div class="eyebrow">Evidence</div>
  <h1>Validation and limitations</h1>
  <p class="lead">This engine is an independent reimplementation of the @RISK workbook of 19 May 2026.
  The table compares the current run against the values recorded in that workbook.</p>

  <div class="note" style="margin:14px 0">The workbook's base run used the low-tier county profile with
  no retrospective uncertainty factor. Load that configuration to compare like with like.
  <div style="margin-top:10px"><button class="btn sm" id="loadref">Load the reference configuration</button>
  <button class="btn sm ghost" id="loaddefault">Restore defaults</button></div></div>

  <div class="tablewrap"><table>
    <tr><th>Output</th><th>This run</th><th>Reference workbook</th><th>Ratio</th><th>Agreement</th></tr>
    ${rows.map(([n,a,b])=>{const q=a/b;
      const cls=Math.abs(Math.log10(q))<0.0458?'low':Math.abs(Math.log10(q))<0.176?'mod':'high';
      const lab=cls==='low'?'within 10%':cls==='mod'?'within 50%':'differs';
      return `<tr><td>${n}</td><td class="num">${sci(a,3)}</td><td class="num">${sci(b,3)}</td>
        <td class="num">${fix(q,3)}×</td><td>${pill(cls,lab)}</td></tr>`;}).join('')}
  </table></div>
  <p class="small">Differences arise from sampling variation and from the browser engine drawing Pert
  and Beta variates by the gamma method rather than by @RISK's internal routine. Headline outputs agree
  within about ten per cent. The lower tail is the weakest match.</p>

  <h2>Verification carried out</h2>
  <ul class="refs">
    <li>Window arithmetic checked against the workbook: 152-day window, 91 days after the clear test, elapsed fraction 0.5987.</li>
    <li>Retrospective uncertainty factor reproduces 1.507 at the workbook's test sensitivity.</li>
    <li>Shedding multiplier confirmed as the square root of the prevalence multiplier.</li>
    <li>Log reduction reproduces 2.70 for Caerphilly at 153 days with a D-value of 59 days.</li>
    <li>Effective infectivity confirmed as r × susceptibility × (2 − BCG factor), as implemented in the workbook.</li>
    <li>Sensitivity ranking reproduces the workbook's top three drivers in the same order.</li>
  </ul>

  <h2>Limitations</h2>
  <div class="tablewrap"><table>
    <tr><th>Limitation</th><th>Effect on the result</th><th>What would resolve it</th></tr>
    <tr><td>No validated human oral dose-response model</td><td>Dominates output variance. The result is
      a range spanning orders of magnitude.</td><td>Human oral challenge evidence, or a defensible
      analogue from a related organism</td></tr>
    <tr><td>Cross-contamination parameters are elicited, not measured</td><td>Second and third ranked
      drivers rest on assumption. They set the risk floor in well-matured cheese.</td>
      <td>Environmental swab data from Irish farmhouse cheese facilities</td></tr>
    <tr><td>Retrospective weighting coefficient is calibrated</td><td>Scales prevalence within the window.
      A different coefficient moves the result proportionally.</td>
      <td>Within-window seroconversion data</td></tr>
    <tr><td>Inputs sampled independently</td><td>Ignores correlation between herd size, yield and
      prevalence. Probably widens the interval.</td><td>A fitted correlation matrix from CSO microdata</td></tr>
    <tr><td>No response surface for the D-value</td><td>Cheese type stands in for pH, water activity and
      temperature.</td><td>Inactivation trials across a matrix of cheese conditions</td></tr>
    <tr><td>Exposed population is an order-of-magnitude estimate</td><td>Scales cases and DALYs linearly;
      does not affect per-consumer risk.</td><td>Market data on raw-milk cheese consumption in Ireland</td></tr>
  </table></div>

  <h2>Reproducibility</h2>
  <p>The engine is deterministic in structure and stochastic in sampling. Running the same
  configuration twice gives results that differ only by Monte Carlo error, which falls as the square
  root of the iteration count. At 10,000 iterations the mean annual risk is stable to about two
  significant figures. The full parameter set is reproduced in the decision report so any run can be
  recreated.</p>`;
};
V.validation.after=()=>{
  const lr=document.getElementById('loadref');
  if(lr) lr.addEventListener('click',()=>{
    P.county.v='LOW tier average'; P.retroWeight.v=0; P.useSeason.v=0;
    recompute(); route();
  });
  const ld=document.getElementById('loaddefault');
  if(ld) ld.addEventListener('click',()=>{
    P.county.v='National average'; P.retroWeight.v=3.40;
    recompute(); route();
  });
};

/* ---------- decision report ---------- */
function options(r,W){
  const b=band(r.meanRisk);
  const base=[
    {k:'Take no product action',
     when:'Mean and 95th percentile both sit below the WHO reference, the cheese was well matured and the facility has no adverse environmental findings.',
     basis:'Regulation (EC) No 178/2002 requires action proportionate to risk. A modelled risk below the comparison threshold does not establish a risk requiring withdrawal.',
     cost:'No commercial impact. Carries the residual uncertainty of the infectivity parameter.',
     fit:r.p95<1e-6},
    {k:'Monitor and document, no recall',
     when:'Mean is below the reference but the 95th percentile approaches or exceeds it.',
     basis:'Proportionate response under Regulation (EC) No 178/2002, supported by a documented assessment and by enhanced environmental monitoring under Regulation (EC) No 852/2004.',
     cost:'Low commercial impact. Requires a written record and a defined monitoring period.',
     fit:r.meanRisk<1e-6&&r.p95>=1e-6},
    {k:'Restrict the affected batches pending further information',
     when:'The mean exceeds the reference, or key facility information is missing.',
     basis:'Precautionary hold while traceability, maturation records and environmental results are obtained.',
     cost:'Moderate commercial impact, reversible. Preserves the option to release.',
     fit:r.meanRisk>=1e-6&&r.meanRisk<1e-5},
    {k:'Withdraw the affected batches',
     when:'The mean exceeds the reference by an order of magnitude, or the cheese was short-matured, or milk entered production after the loss of status.',
     basis:'Regulation (EC) No 178/2002 Article 19. Where milk entered production after restriction, this is a compliance matter under Regulation (EC) No 853/2004 rather than a risk-assessment outcome.',
     cost:'High commercial impact, difficult to reverse.',
     fit:r.meanRisk>=1e-5||W.after}
  ];
  return base.map(o=>({...o, rec:o.fit}));
}

function criticalPoints(r,o,W){
  const pts=[];
  const lr=r.meanLr;
  pts.push({n:'Maturation age at sale',v:(o.maturationFixed||'distributed')+' days',
    s:lr>=2?'ok':lr>=1?'watch':'alert',
    c:lr>=2?'Delivers '+fix(lr,2)+' log₁₀, above the 2 log₁₀ that separates well-matured product.'
      :'Delivers only '+fix(lr,2)+' log₁₀. Short maturation is the single largest controllable weakness in this case.'});
  pts.push({n:'Position in the retrospective window',v:fix(W.elapsed*100,0)+'% elapsed',
    s:W.after?'alert':W.elapsed>0.75?'watch':'ok',
    c:W.after?'Production followed the loss of TB-free status. This is a compliance question before it is a risk question.'
      :W.elapsed>0.75?'Production sits late in the window, when undetected infection is most likely to have been present.'
      :'Production sits early in the window, when undetected infection is least likely.'});
  pts.push({n:'County herd incidence',v:fix(r.countyMult,2)+'× national',
    s:r.countyMult>1.5?'alert':r.countyMult>1?'watch':'ok',
    c:r.countyMult>1.5?'A high-incidence Regional Veterinary Office. Herd infection probability is materially above the national picture.'
      :'Herd infection probability is at or below the national picture.'});
  pts.push({n:'Post-process cross-contamination',v:'ranked '+(r.src.terms.findIndex(t=>t.key==='ccC')+1)+' of '+r.src.terms.length,
    s:'watch',
    c:'Independent of herd status and not reduced by maturation. Confirm environmental monitoring results and handling practice before relying on the modelled value.'});
  pts.push({n:'Pasteurisation',v:o.pasteurised?'applied':'not applied',
    s:o.pasteurised?'ok':'watch',
    c:o.pasteurised?'Adds about 4.5 log₁₀. Residual risk is set by post-process contamination.'
      :'Raw milk product. Maturation is the only inactivation step in the chain.'});
  return pts;
}

V.report=()=>{
  const r=ensure(), o=gather(), W=WIN, b=band(r.meanRisk);
  const c=PROFILES.concat(COUNTIES).find(x=>x.n===o.county)||{inc:0,mult:1,tier:'—'};
  const stamp=new Date().toISOString().slice(0,16).replace('T',' ');
  const opts=options(r,W), crit=criticalPoints(r,o,W);
  const rec=opts.find(x=>x.rec)||opts[1];
  return `
  <div class="eyebrow">Output</div>
  <h1>DAFM decision report</h1>
  <p class="lead">A self-contained record of this assessment: the case, the inputs and their sources,
  the result, the critical points and the management options with their legal basis.</p>
  <div class="noprint" style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0">
    <button class="btn" id="printrec">Print or save as PDF</button>
    <button class="btn ghost" id="copyrec">Copy as text</button>
    <button class="btn ghost" data-go="case">Change the case</button>
  </div>
  <div class="small" id="copymsg"></div>

  <div class="report" id="reportbody">
    <div class="rephead">
      <div><div class="eyebrow">Quantitative microbial risk assessment</div>
        <h2 style="border:0;padding:0;margin:4px 0 0">M. bovis in unpasteurised cheese</h2></div>
      <div class="small mono">Generated ${stamp} UTC<br>bTB-RISK Studio, Teagasc Moorepark</div>
    </div>

    <h3>1. Assessment question</h3>
    <p>What risk did consumers face from unpasteurised cheese produced by this herd during the interval
    between its last clear tuberculin test and the subsequent loss of TB-free status?</p>

    <h3>2. Case facts</h3>
    <div class="tablewrap"><table>
      <tr><th>Item</th><th>Value</th><th>Source</th></tr>
      <tr><td>Regional Veterinary Office</td><td>${esc(o.county)}</td><td>Case input, multiplier from CSO DAA01 2024</td></tr>
      <tr><td>County herd incidence, 2024</td><td class="num">${fix(c.inc,2)}% (${c.tier})</td><td>CSO DAA01</td></tr>
      <tr><td>Herd type and size</td><td>${esc(o.herdType)}, ${o.herdSize} milking cows</td><td>Case input</td></tr>
      <tr><td>Last clear TB test</td><td>${o.dateClear}</td><td>Case input</td></tr>
      <tr><td>Cheese production date</td><td>${o.dateMake}</td><td>Case input</td></tr>
      <tr><td>Loss of TB-free status</td><td>${o.dateLoss}</td><td>Case input</td></tr>
      <tr><td>Assessment date</td><td>${o.dateAssess}</td><td>Case input</td></tr>
      <tr><td>Product</td><td>${CHEESETYPES[o.cheese].label}, ${o.pasteurised?'pasteurised':'raw'} milk</td><td>Case input</td></tr>
      <tr><td>Maturation at sale</td><td>${o.maturationFixed||'distributed'} days</td><td>Case input</td></tr>
      <tr><td>Test type and sensitivity</td><td>SICTT, Se ${fix(o.seTst,3)}, Sp ${fix(o.spTst,3)}</td><td>Clegg et al. 2011</td></tr>
    </table></div>

    <h3>3. Geographic context</h3>
    <div class="repmap">
      <div>${irelandMapSVG(COUNTIES.find(x=>x.n===o.county)?o.county:null)}</div>
      <div>
        <p class="small">${COUNTIES.find(x=>x.n===o.county)
          ? `This case sits in <strong>${esc(o.county)}</strong>, which recorded ${fix(c.inc,2)}% herd
             incidence in 2024 against a national herd-weighted mean of ${fix(TIERS.NATIONAL.mean,2)}%.
             That places it in the <strong>${c.tier==='MED'?'MEDIUM':c.tier}</strong> tier and applies a
             prevalence multiplier of ${fix(c.mult,3)}.`
          : `This assessment uses the <strong>${esc(o.county)}</strong> profile rather than a single
             Regional Veterinary Office. The map shows the 29 areas for context; the national
             herd-weighted mean is ${fix(TIERS.NATIONAL.mean,2)}%.`}</p>
        <div class="tablewrap"><table>
          <tr><th>Tier</th><th>Areas</th><th>Herd-weighted mean</th><th>Multiplier</th></tr>
          ${['HIGH','MED','LOW'].map(k=>`<tr><td>${k==='MED'?'MEDIUM':k}</td>
            <td class="num">${TIERS[k].counties}</td><td class="num">${fix(TIERS[k].mean,2)}%</td>
            <td class="num">${fix(TIERS[k].mult,3)}×</td></tr>`).join('')}
        </table></div>
      </div>
    </div>

    <h3>4. Retrospective window determination</h3>
    <p><strong>${W.position}.</strong> ${W.plain}</p>
    <dl class="kv"><dt>Window length</dt><dd>${W.windowDays} days</dd>
      <dt>Production offset</dt><dd>${W.daysAfterClear} days after the last clear test</dd>
      <dt>Elapsed fraction</dt><dd>${fix(W.elapsed,4)}</dd>
      <dt>Retrospective uncertainty factor</dt><dd>${fix(r.ruf,4)}×</dd></dl>

    <h3>5. Model and data sources</h3>
    <div class="tablewrap"><table>
      <tr><th>Module</th><th>Basis</th><th>Source</th></tr>
      <tr><td>Herd infection</td><td>Beta(58.02, 1394.92) herd incidence; Beta(2.8, 25.7) within-herd prevalence</td>
        <td>CSO DAA01 2010–2023; Collins and More 2022</td></tr>
      <tr><td>Milk shedding</td><td>Pert reactor and non-reactor shedding, prevalence weighted</td>
        <td>Collins 2021; Nuñez-Garcia et al. 2017</td></tr>
      <tr><td>Cheese manufacture</td><td>Curd retention Pert(0.75, 0.84, 0.95); concentration factor Pert(3, 6, 10)</td>
        <td>Forgrave et al. 2016; Walstra et al.</td></tr>
      <tr><td>Maturation</td><td>Log-linear D-value, Normal(${o.dValue}, ${o.dValueSd}) days</td>
        <td>Forgrave et al. 2016; Starikoff et al. 2016</td></tr>
      <tr><td>Cross-contamination</td><td>Pert probability and level, post-process</td>
        <td>Tiwari et al. 2014; Falkinham 2009; FSAI environmental data</td></tr>
      <tr><td>Consumption</td><td>Serving ${o.serving} g, ${fix(r.servings,1)} servings per year, ${fix(o.pConsume,2)} consumption probability</td>
        <td>IUNA National Adult Nutrition Survey 2021</td></tr>
      <tr><td>Dose-response</td><td>Exponential, truncated lognormal infectivity</td>
        <td>ACMSF 2015; EFSA BIOHAZ 2014; Pérez-Lago 2014</td></tr>
      <tr><td>Simulation</td><td>${r.n.toLocaleString()} iterations, Latin hypercube sampling</td>
        <td>bTB-RISK Studio engine, reimplementing the @RISK workbook of 19 May 2026</td></tr>
    </table></div>

    <h3>6. Exposure assessment</h3>
    <div class="tablewrap"><table>
      <tr><th>Stage</th><th>Mean</th><th>Unit</th></tr>
      <tr><td>Prevalence multiplier applied</td><td class="num">${fix(r.prevMult,4)}</td><td>×</td></tr>
      <tr><td>Bulk tank concentration</td><td class="num">${sci(r.meanBtm)}</td><td>CFU/mL</td></tr>
      <tr><td>Total log reduction</td><td class="num">${fix(r.meanLr,3)}</td><td>log₁₀</td></tr>
      <tr><td>Surviving fraction</td><td class="num">${sci(r.meanSurv)}</td><td>proportion</td></tr>
      <tr><td>Concentration at consumption</td><td class="num">${sci(r.meanConc)}</td><td>CFU/g</td></tr>
      <tr><td>Dose per serving</td><td class="num">${sci(r.meanDose)}</td><td>CFU</td></tr>
    </table></div>

    <h3>7. Risk characterisation</h3>
    <div class="tablewrap"><table>
      <tr><th>Output</th><th>Mean</th><th>Median</th><th>5th to 95th percentile</th></tr>
      <tr><td>Risk per serving</td><td class="num">${sci(r.riskServing)}</td><td class="num">—</td><td class="num">—</td></tr>
      <tr><td>Annual risk per consumer</td><td class="num">${sci(r.meanRisk)}</td><td class="num">${sci(r.median)}</td>
        <td class="num">${sci(r.p05)} to ${sci(r.p95)}</td></tr>
      <tr><td>Expected annual cases</td><td class="num">${fix(r.cases,4)}</td><td class="num">—</td>
        <td class="num">95th ${fix(r.cases95,4)}</td></tr>
      <tr><td>Total annual DALYs</td><td class="num">${fix(r.dalys,4)}</td><td class="num">—</td><td class="num">—</td></tr>
      <tr><td>Ratio to WHO 10⁻⁶</td><td class="num">${fix(r.whoRatio,3)}</td><td class="num">—</td><td class="num">—</td></tr>
    </table></div>
    <p><strong>Risk band: ${b.t}.</strong> ${b.note} ${fix(100*count(r.risk,1e-6)/r.n,1)}% of iterations
    exceed the WHO reference level.</p>

    <h3>8. Critical points for the risk manager</h3>
    <div class="tablewrap"><table>
      <tr><th>Point</th><th>This case</th><th>Status</th><th>Comment</th></tr>
      ${crit.map(p=>`<tr><td>${p.n}</td><td class="num">${p.v}</td>
        <td>${pill(p.s==='ok'?'low':p.s==='watch'?'mod':'high',p.s==='ok'?'Satisfactory':p.s==='watch'?'Review':'Attention')}</td>
        <td class="small">${p.c}</td></tr>`).join('')}
    </table></div>

    <h3>9. Management options</h3>
    <div class="optlist">
      ${opts.map((x,i)=>`<div class="opt${x.rec?' on':''}">
        <div class="opt-h"><span class="opt-n">Option ${i+1}</span><b>${x.k}</b>
          ${x.rec?'<span class="pill low">Indicated by this assessment</span>':''}</div>
        <dl class="kv"><dt>When appropriate</dt><dd>${x.when}</dd>
          <dt>Legal and policy basis</dt><dd>${x.basis}</dd>
          <dt>Consequence</dt><dd>${x.cost}</dd></dl></div>`).join('')}
    </div>

    <h3>10. Recommendation</h3>
    <p>On the inputs recorded above, the assessment indicates <strong>${rec.k.toLowerCase()}</strong>.
    ${rec.basis} This is a scientific risk-assessment output. The decision rests with the competent
    authority and should also weigh batch volume, traceability, the consumer profile and any facility
    findings that sit outside this model.</p>

    <h3>11. Uncertainty statement</h3>
    <p>The dominant source of uncertainty is the infectivity parameter, which carries a standardised
    regression coefficient of ${r.src.terms[0].src.toFixed(3)} and for which no validated human oral
    dose-response model exists. The cross-contamination terms rank next and rest on elicited rather than
    measured values. The reported interval reflects parameter uncertainty within the model structure and
    does not include structural uncertainty about the model itself.</p>

    <div class="repfoot">Produced with bTB-RISK Studio, Teagasc Food Research Centre Moorepark, under
    DAFM PSSRC Topic 8.1, reference 2023PSSRC916.</div>
  </div>`;
};
V.report.after=()=>{
  const pr=document.getElementById('printrec');
  if(pr) pr.addEventListener('click',()=>{
    if(window.self!==window.top){
      toast('Printing is blocked inside this preview. Open the published site to print or save as PDF.');
      return;
    }
    window.print();
  });
  const b=document.getElementById('copyrec'); if(!b) return;
  b.addEventListener('click',()=>{
    const t=document.getElementById('reportbody').innerText;
    const m=document.getElementById('copymsg');
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(()=>{m.textContent='Report copied to the clipboard.';},
        ()=>{m.textContent='The browser refused the copy. Select the report and copy it.';});
    } else m.textContent='Select the report below and copy it.';
  });
};

/* ---------- about ---------- */
V.about=()=>`
  <div class="eyebrow">About</div>
  <h1>About and citation</h1>
  <p class="lead">bTB-RISK Studio accompanies a quantitative microbial risk assessment of
  <em>Mycobacterium bovis</em> in unpasteurised cheese produced by Irish dairy herds that subsequently
  lose bovine tuberculosis-free status.</p>

  <h2>Project</h2>
  <dl class="kv">
    <dt>Funder</dt><dd>Department of Agriculture, Food and the Marine, PSSRC reference 2023PSSRC916</dd>
    <dt>Topic</dt><dd>PSSRC Topic 8.1, farm-to-fork QMRA of raw-milk cheese and bTB risk to consumers</dd>
    <dt>Host institute</dt><dd>Teagasc Food Research Centre, Moorepark, Fermoy, Co. Cork</dd>
    <dt>Reference model</dt><dd>Teagasc bTB QMRA DAFM decision tool, @RISK workbook of 19 May 2026</dd>
  </dl>

  <h2>Authors</h2>
  <div class="authors">
    ${[
      {n:'Gopaiah Talari', a:'Teagasc Food Research Centre, Moorepark', aff:1,
       role:'Model development and tool author', mail:'talarigopiniper@gmail.com',
       link:'https://people.ucd.ie/gopi.talari', linkt:'UCD profile', corr:true},
      {n:'Önay Burak Doğan', a:'Middle East Technical University (METU), Ankara', aff:4, role:'Quantitative risk modelling'},
      {n:'Uma Tiwari', a:'Technological University Dublin', aff:3, role:'Exposure assessment'},
      {n:'Tríona O’Brien', a:'Teagasc Food Research Centre, Moorepark', aff:1,
       role:'Dairy processing', mail:'Triona.OBrien@teagasc.ie'},
      {n:'Diarmuid Sheehan', a:'Teagasc Food Research Centre, Moorepark', aff:1,
       role:'Cheese science', mail:'Diarmuid.Sheehan@teagasc.ie'},
      {n:'Geraldine Duffy', a:'Teagasc Food Research Centre, Ashtown', aff:2,
       role:'Food safety', mail:'Geraldine.Duffy@teagasc.ie'},
      {n:'Prabin Lamichhane', a:'Teagasc Food Research Centre, Moorepark', aff:1,
       role:'Project manager', mail:'Prabin.Lamichhane@teagasc.ie'}
    ].map(x=>`<div class="author">
      <div class="au-n">${x.n}<sup>${x.aff}</sup>${x.corr?'<span class="pill low">Corresponding</span>':''}</div>
      <div class="au-r">${x.role}</div>
      <div class="au-a">${x.a}</div>
      ${x.mail?`<div class="au-m mono">${x.mail}</div>`:''}
      ${x.link?`<a class="au-l" href="${x.link}" target="_blank" rel="noopener">${x.linkt} →</a>`:''}
    </div>`).join('')}
  </div>

  <h2>Affiliations</h2>
  <ol class="refs">
    <li>Teagasc Food Research Centre, Moorepark, Fermoy, Co. Cork, Ireland</li>
    <li>Teagasc Food Research Centre, Ashtown, Dublin, Ireland</li>
    <li>School of Food Science and Environmental Health, Technological University Dublin, Ireland</li>
    <li>Middle East Technical University (METU), Ankara, Türkiye</li>
  </ol>

  <h2>How to cite the tool</h2>
  <div class="card"><p class="small" style="max-width:none">Talari, G., Doğan, Ö.B., Tiwari, U.,
  O’Brien, T., Sheehan, J., Duffy, G. and Lamichhane, P. (2026) <em>bTB-RISK Studio: a farm-to-fork
  quantitative microbial risk assessment tool for Mycobacterium bovis in unpasteurised cheese</em>.
  Teagasc Food Research Centre, Moorepark, for the Department of Agriculture, Food and the Marine,
  PSSRC Topic 8.1.</p></div>

  <h2>Key references</h2>
  <ul class="refs">
    <li>Codex Alimentarius Commission (1999) <em>Principles and guidelines for the conduct of microbiological risk assessment</em>, CAC/GL 30-1999.</li>
    <li>Clegg, T.A. et al. (2011) Sensitivity and specificity of the single intradermal comparative tuberculin test.</li>
    <li>Collins, Á. (2021) Systematic review and meta-analysis of <em>M. bovis</em> shedding.</li>
    <li>Collins, Á. and More, S.J. (2022) <em>Microbial Risk Analysis</em>, within-herd prevalence of bovine tuberculosis.</li>
    <li>Falkinham, J.O. (2009) Environmental sources of nontuberculous mycobacteria.</li>
    <li>Forgrave, K. et al. (2016) <em>Journal of Applied Microbiology</em>, survival of <em>M. bovis</em> in cheese.</li>
    <li>Hammer, P. et al. (2015) Thermal inactivation of <em>M. bovis</em> in milk.</li>
    <li>Irish Universities Nutrition Alliance (2021) National Adult Nutrition Survey.</li>
    <li>Nuñez-Garcia, J. et al. (2017) Meta-analysis of bovine tuberculosis diagnostic test performance.</li>
    <li>Pérez-Lago, L. et al. (2014) Whole genome sequencing of <em>M. bovis</em> in human infection.</li>
    <li>Starikoff, K. et al. (2016) Independent D-value estimate for <em>M. bovis</em> in cheese.</li>
    <li>Tiwari, U. et al. (2014) Cross-contamination modelling in dairy processing.</li>
    <li>Central Statistics Office, tables DAA01, DAQ01 and DAQ02, Bovine Tuberculosis Eradication Programme.</li>
  </ul>

  <h2>Scope and disclaimer</h2>
  <div class="warn">This is a research decision-support tool produced for a departmental project. It is
  not a regulatory decision tool, does not constitute a safety determination and should not be the sole
  basis for a product action. Calibrated parameters must be replaced with case-specific and
  facility-specific evidence before operational use.</div>

  <div class="logos">
    <img src="assets/teagasc.png" alt="Teagasc">
    <img src="assets/dafm.png" alt="Department of Agriculture, Food and the Marine">
  </div>
  <p class="small">The simulation runs entirely in your browser. No case data is transmitted or stored.</p>`;

/* ---------------------------------------------------------------- router */
function buildNav(){
  document.getElementById('navlinks').innerHTML = NAV.map(n=>n.g
    ? `<div class="grp">${n.g}</div>`
    : `<a class="nav" href="#${n.id}" data-id="${n.id}"><span class="dot"></span>${n.t}</a>`).join('');
  document.getElementById('mobnav').innerHTML = NAV.filter(n=>!n.g)
    .map(n=>`<a href="#${n.id}" data-id="${n.id}">${n.t}</a>`).join('');
}

function route(){
  const id=(location.hash||'#home').slice(1), page=V[id]?id:'home';
  ensure();
  document.getElementById('view').innerHTML=V[page]();
  document.querySelectorAll('[data-id]').forEach(a=>a.classList.toggle('on',a.dataset.id===page));
  document.getElementById('mobnav').classList.remove('open');
  if(V[page].after) requestAnimationFrame(()=>{ try{V[page].after();}catch(e){console.error(e);} });
}

document.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');
  if(go){ location.hash='#'+go.dataset.go; return; }
  const grp=e.target.closest('[data-grp]');
  if(grp && !grp.disabled){ GROUP=grp.dataset.grp; route(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(e.target.id==='mobtoggle'){
    const m=document.getElementById('mobnav'); m.classList.toggle('open');
    e.target.setAttribute('aria-expanded',m.classList.contains('open')); return;
  }
  if(e.target.id==='run'){ startRun(e.target); }
});

function toast(msg, action){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const d=document.createElement('div');
  d.className='toast';
  d.innerHTML=`<span class="tk">&#10003;</span><div><b>${msg}</b></div>
    ${action?`<button class="btn sm" data-go="${action}">View results</button>`:''}
    <button class="tx" aria-label="Dismiss">&times;</button>`;
  document.body.appendChild(d);
  requestAnimationFrame(()=>d.classList.add('in'));
  d.querySelector('.tx').addEventListener('click',()=>d.remove());
  setTimeout(()=>{ d.classList.remove('in'); setTimeout(()=>d.remove(),400); },7000);
}

let RUNNING=false;
function startRun(btn){
  if(RUNNING) return;
  RUNNING=true;
  const lbl=btn?btn.textContent:'';
  if(btn){ btn.disabled=true; btn.textContent='Running'; }
  const wrap=document.getElementById('progwrap'), fill=document.getElementById('progfill'),
        txt=document.getElementById('progtxt');
  if(wrap){ wrap.hidden=false; if(fill) fill.style.width='0%'; }
  const o=gather(); WIN=windowAnalysis(o);
  const t0=performance.now();
  runModel(o, WIN,
    p=>{ if(fill) fill.style.width=(p*100).toFixed(1)+'%';
         if(txt) txt.textContent=`Sampling iteration ${Math.round(p*o.iters).toLocaleString()} of ${o.iters.toLocaleString()}`; },
    res=>{
      RESULT=res; RUNNING=false;
      const ms=Math.round(performance.now()-t0);
      if(fill) fill.style.width='100%';
      if(txt) txt.textContent=`Completed ${res.n.toLocaleString()} iterations in ${ms} ms`;
      if(btn){ btn.disabled=false; btn.textContent=lbl; }
      const s=document.getElementById('runstate');
      if(s) s.textContent=`Mean annual risk ${sci(res.meanRisk)} \u00b7 median ${sci(res.median)} \u00b7 95th ${sci(res.p95)}`;
      setTimeout(()=>{ if(wrap) wrap.hidden=true; },2200);
      toast(`Simulation complete. Mean annual risk ${sci(res.meanRisk)}.`,'results');
      const page=(location.hash||'#home').slice(1);
      if(page==='home') route();
    });
}

document.addEventListener('change',e=>{
  const k=e.target.dataset&&e.target.dataset.k; if(!k) return;
  P[k].v=e.target.value;
  if(!TEXT_KEYS.has(k)&&k!=='pasteurised'&&k!=='useSeason') P[k].cls='usr';
  if(k==='cheese'){ const c=CHEESETYPES[e.target.value];
    P.dValue.v=c.d; P.dValueSd.v=c.sd; P.maturationFixed.v=c.mat; }
  if(k==='dateMake'||k==='dateClear'||k==='dateLoss'||k==='dateAssess'){
    const o=gather(), W=windowAnalysis(o);
    if(W.maturationFromDates>0) P.maturationFixed.v=W.maturationFromDates;
  }
  recompute(); route();
});

window.addEventListener('hashchange',route);
let rz; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(()=>{
  const id=(location.hash||'#home').slice(1);
  if(V[id]&&V[id].after){ try{V[id].after();}catch(e){} } },180); });

['railmark','topmark'].forEach(id=>{const el=document.getElementById(id); if(el) el.innerHTML=logoMark(34);});
buildNav(); route();
