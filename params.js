/* bTB-RISK Studio — parameter register
   Every entry carries its distribution, its source and a provenance class, so a
   reviewer can separate published values from working assumptions.
   cls: 'cso' CSO surveillance | 'lit' published literature | 'cal' calibrated assumption | 'usr' case fact */

'use strict';

const P = {
  /* --- A. case and herd context --- */
  county:        {v:'National average', cls:'usr', g:'case', label:'County or Regional Veterinary Office'},
  herdSize:      {v:57,    cls:'usr', g:'case', label:'Milking cows in herd', step:1},
  herdType:      {v:'Dairy raw milk supplier', cls:'usr', g:'case', label:'Herd type'},
  useSeason:     {v:0,     cls:'usr', g:'case', label:'Apply seasonal bTB factor'},

  /* --- B. testing and status dates --- */
  dateClear:     {v:'2024-01-01', cls:'usr', g:'dates', label:'Last clear TB test'},
  dateMake:      {v:'2024-04-01', cls:'usr', g:'dates', label:'Cheese production date'},
  dateLoss:      {v:'2024-06-01', cls:'usr', g:'dates', label:'Date herd lost TB-free status'},
  dateAssess:    {v:'2024-09-01', cls:'usr', g:'dates', label:'Assessment or consumption date'},
  seTst:         {v:0.7506, cls:'lit', g:'dates', label:'SICTT herd sensitivity', step:0.001,
                  dist:'Beta(33.1, 11.0), mean 0.75', src:'Clegg et al. 2011; DAFM validation'},
  spTst:         {v:0.9890, cls:'lit', g:'dates', label:'SICTT herd specificity', step:0.001,
                  dist:'Beta(180, 2), mean 0.989', src:'Clegg et al. 2011'},
  retroWeight:   {v:3.40,  cls:'cal', g:'dates', label:'Retrospective weighting coefficient', step:0.05,
                  dist:'RUF = 1 + elapsed × (1 − Se) × k', src:'Calibrated to the reference workbook (RUF 1.507)'},

  /* --- C. cheese and exposure --- */
  cheese:        {v:'caerphilly', cls:'usr', g:'cheese', label:'Cheese type'},
  pasteurised:   {v:0,     cls:'usr', g:'cheese', label:'Milk pasteurised before make'},
  maturationFixed:{v:153,  cls:'usr', g:'cheese', label:'Maturation age at sale (days)', step:1,
                  dist:'Fixed, or Pert(30, 120, 365) when set to 0', src:'DAFM case input'},
  serving:       {v:27.09, cls:'lit', g:'cheese', label:'Serving size (g)', step:0.01,
                  dist:'Normal(27.09, 20.99), truncated at 1 g', src:'IUNA National Adult Nutrition Survey 2021'},
  servingSd:     {v:20.99, cls:'lit', g:'cheese', label:'Serving size, standard deviation (g)', step:0.01,
                  dist:'Normal(27.09, 20.99)', src:'IUNA 2021'},
  servingsFixed: {v:93.6,  cls:'lit', g:'cheese', label:'Annual servings per consumer', step:0.1,
                  dist:'Fixed, or Poisson(1.8)/week × 52 when set to 0', src:'IUNA 2021'},
  consumers:     {v:89855, cls:'lit', g:'cheese', label:'Population at risk', step:100,
                  dist:'Normal(89,855, 9,000) truncated [50,000, 150,000]', src:'IUNA 2021; Bord Bia market data'},
  pConsume:      {v:0.22,  cls:'lit', g:'cheese', label:'Consumption probability', step:0.01,
                  dist:'Beta(22, 78), mean 0.22', src:'IUNA 2021'},

  /* --- farm distributions --- */
  nHerdMin:      {v:21.1,  cls:'cso', g:'farm', label:'Herd size, Pert minimum', step:0.1,
                  dist:'Pert(21.1, 62.6, 124.2)', src:'CSO DAA01, 29 RVOs, 2024'},
  nHerdMode:     {v:62.6,  cls:'cso', g:'farm', label:'Herd size, Pert mode', step:0.1},
  nHerdMax:      {v:124.2, cls:'cso', g:'farm', label:'Herd size, Pert maximum', step:0.1},
  pHerdA:        {v:58.0245, cls:'cso', g:'farm', label:'Herd incidence, Beta α', step:0.01,
                  dist:'Beta(58.02, 1394.92), mean 3.99%', src:'CSO DAA01 2010–2023, method of moments, KS p = 0.42'},
  pHerdB:        {v:1394.9237, cls:'cso', g:'farm', label:'Herd incidence, Beta β', step:0.01},
  pWithinA:      {v:2.8,   cls:'lit', g:'farm', label:'Within-herd prevalence, Beta α', step:0.1,
                  dist:'Beta(2.8, 25.7), mean 9.82%', src:'CSO reactors per restricted herd; Collins and More 2022'},
  pWithinB:      {v:25.7,  cls:'lit', g:'farm', label:'Within-herd prevalence, Beta β', step:0.1},
  yieldMin:      {v:16,    cls:'lit', g:'farm', label:'Milk yield, Pert minimum (L/day)', step:0.1,
                  dist:'Pert(16, 19, 24)', src:'Teagasc National Farm Survey 2023'},
  yieldMode:     {v:19,    cls:'lit', g:'farm', label:'Milk yield, Pert mode', step:0.1},
  yieldMax:      {v:24,    cls:'lit', g:'farm', label:'Milk yield, Pert maximum', step:0.1},

  shedPosMin:    {v:1e-4,  cls:'lit', g:'shed', label:'Reactor shedding, minimum (CFU/mL)', step:1e-5,
                  dist:'Pert(1×10⁻⁴, 5×10⁻³, 5×10⁻²)', src:'Collins systematic review and meta-analysis 2021'},
  shedPosMode:   {v:5e-3,  cls:'lit', g:'shed', label:'Reactor shedding, mode', step:1e-4},
  shedPosMax:    {v:5e-2,  cls:'lit', g:'shed', label:'Reactor shedding, maximum', step:1e-3},
  shedNegMin:    {v:0,     cls:'lit', g:'shed', label:'Non-reactor shedding, minimum (CFU/mL)', step:1e-6,
                  dist:'Pert(0, 1×10⁻⁴, 1×10⁻³)', src:'Nuñez-Garcia et al. 2017; expert elicitation'},
  shedNegMode:   {v:1e-4,  cls:'lit', g:'shed', label:'Non-reactor shedding, mode', step:1e-5},
  shedNegMax:    {v:1e-3,  cls:'lit', g:'shed', label:'Non-reactor shedding, maximum', step:1e-4},

  /* --- processing distributions --- */
  curdMin:       {v:0.75,  cls:'lit', g:'proc', label:'Curd retention, minimum', step:0.01,
                  dist:'Pert(0.75, 0.84, 0.95)', src:'Forgrave et al. 2016'},
  curdMode:      {v:0.84,  cls:'lit', g:'proc', label:'Curd retention, mode', step:0.01},
  curdMax:       {v:0.95,  cls:'lit', g:'proc', label:'Curd retention, maximum', step:0.01},
  concMin:       {v:3,     cls:'lit', g:'proc', label:'Concentration factor, minimum', step:0.1,
                  dist:'Pert(3, 6, 10)', src:'Walstra et al.; moisture loss concentrates cells'},
  concMode:      {v:6,     cls:'lit', g:'proc', label:'Concentration factor, mode', step:0.1},
  concMax:       {v:10,    cls:'lit', g:'proc', label:'Concentration factor, maximum', step:0.1},
  dValue:        {v:59,    cls:'lit', g:'proc', label:'D-value, mean (days)', step:0.1,
                  dist:'Normal(59, 10) for Caerphilly; Normal(57, 8) for Cheddar',
                  src:'Forgrave et al. 2016, Journal of Applied Microbiology'},
  dValueSd:      {v:10,    cls:'lit', g:'proc', label:'D-value, standard deviation', step:0.1},
  matMin:        {v:30,    cls:'lit', g:'proc', label:'Maturation, Pert minimum (days)', step:1,
                  dist:'Pert(30, 120, 365)', src:'Irish artisan cheese range'},
  matMode:       {v:120,   cls:'lit', g:'proc', label:'Maturation, Pert mode', step:1},
  matMax:        {v:365,   cls:'lit', g:'proc', label:'Maturation, Pert maximum', step:1},
  pastLr:        {v:4.5,   cls:'lit', g:'proc', label:'Pasteurisation log reduction', step:0.1,
                  dist:'Normal(4.5, 0.2)', src:'Hammer et al. 2015; Collins and More 2022'},
  pastLrSd:      {v:0.2,   cls:'lit', g:'proc', label:'Pasteurisation, standard deviation', step:0.01},
  retailMin:     {v:3,     cls:'cal', g:'proc', label:'Retail storage, minimum (days)', step:1,
                  dist:'Pert(3, 14, 30)', src:'Supply chain estimate'},
  retailMode:    {v:14,    cls:'cal', g:'proc', label:'Retail storage, mode', step:1},
  retailMax:     {v:30,    cls:'cal', g:'proc', label:'Retail storage, maximum', step:1},
  domMin:        {v:1,     cls:'cal', g:'proc', label:'Domestic storage, minimum (days)', step:1,
                  dist:'Pert(1, 5, 14)', src:'Supply chain estimate'},
  domMode:       {v:5,     cls:'cal', g:'proc', label:'Domestic storage, mode', step:1},
  domMax:        {v:14,    cls:'cal', g:'proc', label:'Domestic storage, maximum', step:1},
  domTempMin:    {v:4,     cls:'lit', g:'proc', label:'Domestic temperature, minimum (°C)', step:0.1,
                  dist:'Pert(4, 7, 12)', src:'FSAI domestic refrigeration surveys'},
  domTempMode:   {v:7,     cls:'lit', g:'proc', label:'Domestic temperature, mode', step:0.1},
  domTempMax:    {v:12,    cls:'lit', g:'proc', label:'Domestic temperature, maximum', step:0.1},

  ccPMin:        {v:0.005, cls:'cal', g:'cc', label:'Cross-contamination probability, minimum', step:0.001,
                  dist:'Pert(0.005, 0.02, 0.08)', src:'Tiwari et al. 2014, tightened for HACCP-compliant Irish artisan dairies'},
  ccPMode:       {v:0.02,  cls:'cal', g:'cc', label:'Cross-contamination probability, mode', step:0.001},
  ccPMax:        {v:0.08,  cls:'cal', g:'cc', label:'Cross-contamination probability, maximum', step:0.001},
  ccCMin:        {v:0,     cls:'cal', g:'cc', label:'Cross-contamination level, minimum (CFU/g)', step:1e-5,
                  dist:'Pert(0, 3×10⁻⁴, 3×10⁻³)', src:'Falkinham 2009; FSAI environmental swabs'},
  ccCMode:       {v:3e-4,  cls:'cal', g:'cc', label:'Cross-contamination level, mode', step:1e-5},
  ccCMax:        {v:3e-3,  cls:'cal', g:'cc', label:'Cross-contamination level, maximum', step:1e-4},
  ccPastFactor:  {v:0.10,  cls:'cal', g:'cc', label:'Cross-contamination factor, closed system', step:0.01,
                  dist:'Multiplier applied when milk is pasteurised', src:'Working assumption'},

  /* --- dose-response --- */
  rMean:         {v:2e-5,  cls:'cal', g:'dr', label:'Infectivity r, mean', step:1e-6,
                  dist:'Lognormal(2×10⁻⁵, 3×10⁻⁵) truncated [10⁻⁶, 10⁻³]',
                  src:'Re-centred 19 May 2026 from Lognormal(1×10⁻⁴, 1.5×10⁻⁴). Pérez-Lago 2014; EFSA BIOHAZ 2014'},
  rSd:           {v:3e-5,  cls:'cal', g:'dr', label:'Infectivity r, standard deviation', step:1e-6},
  rLo:           {v:1e-6,  cls:'cal', g:'dr', label:'Infectivity r, lower truncation', step:1e-7},
  rHi:           {v:1e-3,  cls:'cal', g:'dr', label:'Infectivity r, upper truncation', step:1e-5},
  suscA:         {v:25,    cls:'lit', g:'dr', label:'Host susceptibility, Beta α', step:1,
                  dist:'Beta(25, 75), mean 0.25', src:'Non-immune fraction, population estimate'},
  suscB:         {v:75,    cls:'lit', g:'dr', label:'Host susceptibility, Beta β', step:1},
  bcgA:          {v:75,    cls:'lit', g:'dr', label:'BCG protection factor, Beta α', step:1,
                  dist:'Beta(75, 25), mean 0.75', src:'Irish neonatal BCG programme, historical cohorts'},
  bcgB:          {v:25,    cls:'lit', g:'dr', label:'BCG protection factor, Beta β', step:1},
  daly:          {v:15,    cls:'lit', g:'dr', label:'DALYs per case', step:0.1,
                  dist:'Triangular(10, 15, 20), mean 15', src:'Global Burden of Disease tuberculosis estimates'},

  /* --- scenario linkage --- */
  herdFactor:    {v:1.0,   cls:'usr', g:'link', label:'Farm size factor', step:0.01,
                  dist:'Scenario multiplier on daily milk volume', src:'Scenario configuration'},
  procFactor:    {v:1.0,   cls:'usr', g:'link', label:'Processing risk factor', step:0.01,
                  dist:'Scenario multiplier on final cheese concentration', src:'Scenario configuration'},

  iters:         {v:10000, cls:'usr', g:'link', label:'Monte Carlo iterations', step:1000}
};

const CLS = {cso:'CSO surveillance', lit:'Literature', cal:'Calibrated', usr:'Case input'};

/* values recorded by the reference workbook for the base case */
const REF = {
  btm:1.0906e-4, dose:5.5183e-4, serving:3.4904e-9, annual:3.2670e-7,
  cases:6.4582e-3, dalys:9.6873e-2, lr:2.7044, p05:1.2998e-8,
  median:1.3608e-7, p95:1.2650e-6, cases95:2.4921e-2, infProxy:0.13017,
  ruf:1.50720, prevMult:1.50720, shedMult:1.22768
};

const TEXT_KEYS = new Set(['county','herdType','cheese','dateClear','dateMake','dateLoss','dateAssess']);

function gather(){
  const o={};
  for(const k in P) o[k] = TEXT_KEYS.has(k) ? String(P[k].v) : Number(P[k].v);
  const c = PROFILES.concat(COUNTIES).find(x=>x.n===P.county.v);
  o.countyMult = c ? c.mult : 1;
  o.herdSizeFixed = Number(P.herdSize.v);
  return o;
}
