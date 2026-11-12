/* bTB-RISK Studio — embedded surveillance data
   Source: Central Statistics Office (CSO) Bovine Tuberculosis Eradication Programme,
   tables DAA01 (annual), DAQ01 and DAQ02 (quarterly), as compiled in the Teagasc
   bTB QMRA DAFM decision tool workbook (19 May 2026). */

'use strict';

/* National annual series, 2010-2024. inc = herd incidence (%). */
const NATIONAL = [
  {y:2010, herds:116815, tested:114011, restricted:2849, inc:4.65, animals:5751564, tests:8390750, reactors:20211, herdSize:49.24},
  {y:2011, herds:116061, tested:114333, restricted:2578, inc:4.18, animals:5819281, tests:8332285, reactors:18531, herdSize:50.14},
  {y:2012, herds:115787, tested:113887, restricted:2665, inc:4.26, animals:6145469, tests:8534677, reactors:18476, herdSize:53.08},
  {y:2013, herds:115765, tested:114051, restricted:2512, inc:3.88, animals:6146958, tests:8474961, reactors:15612, herdSize:53.10},
  {y:2014, herds:114508, tested:112937, restricted:2177, inc:3.64, animals:6115528, tests:8445262, reactors:16145, herdSize:53.41},
  {y:2015, herds:115091, tested:113331, restricted:2091, inc:3.37, animals:6321196, tests:8429602, reactors:15317, herdSize:54.92},
  {y:2016, herds:114705, tested:112595, restricted:2035, inc:3.27, animals:6455934, tests:8635824, reactors:16914, herdSize:56.28},
  {y:2017, herds:113697, tested:111901, restricted:2180, inc:3.47, animals:6513273, tests:8882933, reactors:17266, herdSize:57.29},
  {y:2018, herds:112105, tested:110454, restricted:2176, inc:3.51, animals:6398745, tests:8869856, reactors:17491, herdSize:57.08},
  {y:2019, herds:111004, tested:109175, restricted:2273, inc:3.72, animals:6363409, tests:8827682, reactors:17058, herdSize:57.33},
  {y:2020, herds:110216, tested:108407, restricted:2673, inc:4.38, animals:7202987, tests:9086934, reactors:22614, herdSize:65.35},
  {y:2021, herds:109836, tested:107916, restricted:2721, inc:4.33, animals:7103401, tests:9275921, reactors:20931, herdSize:64.67},
  {y:2022, herds:108292, tested:106196, restricted:2731, inc:4.31, animals:6999922, tests:9582389, reactors:23393, herdSize:64.64},
  {y:2023, herds:107621, tested:104630, restricted:3144, inc:4.94, animals:6953046, tests:9883797, reactors:28901, herdSize:64.61},
  {y:2024, herds:106166, tested:103483, restricted:3985, inc:6.04, animals:6646526, tests:10130200, reactors:41682, herdSize:62.61}
];

/* 29 Regional Veterinary Office areas, 2024 herd incidence (%).
   mult = county incidence / national herd-weighted mean (6.0595%). */
const COUNTIES = [
  {n:'Wicklow W',       herds:484,   inc:16.38, tier:'HIGH', mult:2.7032},
  {n:'Tipperary North', herds:3327,  inc:10.97, tier:'HIGH', mult:1.8104},
  {n:'Wicklow E',       herds:1032,  inc:10.62, tier:'HIGH', mult:1.7526},
  {n:'Meath',           herds:3699,  inc:10.32, tier:'HIGH', mult:1.7031},
  {n:'Cork North',      herds:5346,  inc:9.46,  tier:'HIGH', mult:1.5612},
  {n:'Cork South',      herds:5608,  inc:8.73,  tier:'HIGH', mult:1.4407},
  {n:'Longford',        herds:2300,  inc:8.49,  tier:'HIGH', mult:1.4011},
  {n:'Kilkenny',        herds:2888,  inc:8.39,  tier:'HIGH', mult:1.3846},
  {n:'Dublin',          herds:331,   inc:7.96,  tier:'HIGH', mult:1.3136},
  {n:'Louth',           herds:1204,  inc:7.89,  tier:'HIGH', mult:1.3021},
  {n:'Monaghan',        herds:4107,  inc:7.63,  tier:'HIGH', mult:1.2592},
  {n:'Offaly',          herds:2823,  inc:7.54,  tier:'HIGH', mult:1.2443},
  {n:'Westmeath',       herds:2828,  inc:7.46,  tier:'HIGH', mult:1.2311},
  {n:'Wexford',         herds:2991,  inc:7.03,  tier:'HIGH', mult:1.1602},
  {n:'Laois',           herds:2593,  inc:6.98,  tier:'MED',  mult:1.1519},
  {n:'Tipperary South', herds:3328,  inc:6.97,  tier:'MED',  mult:1.1503},
  {n:'Kildare',         herds:1689,  inc:6.72,  tier:'MED',  mult:1.1090},
  {n:'Cavan',           herds:4655,  inc:6.21,  tier:'MED',  mult:1.0248},
  {n:'Waterford',       herds:2055,  inc:5.99,  tier:'MED',  mult:0.9885},
  {n:'Limerick',        herds:5052,  inc:5.34,  tier:'MED',  mult:0.8813},
  {n:'Kerry',           herds:6106,  inc:5.12,  tier:'MED',  mult:0.8450},
  {n:'Clare',           herds:5827,  inc:4.29,  tier:'MED',  mult:0.7080},
  {n:'Sligo',           herds:3216,  inc:4.23,  tier:'MED',  mult:0.6981},
  {n:'Leitrim',         herds:2764,  inc:4.05,  tier:'MED',  mult:0.6684},
  {n:'Donegal',         herds:4886,  inc:3.67,  tier:'LOW',  mult:0.6057},
  {n:'Carlow',          herds:1282,  inc:3.60,  tier:'LOW',  mult:0.5941},
  {n:'Galway',          herds:10305, inc:3.58,  tier:'LOW',  mult:0.5908},
  {n:'Roscommon',       herds:5189,  inc:3.38,  tier:'LOW',  mult:0.5578},
  {n:'Mayo',            herds:8251,  inc:2.51,  tier:'LOW',  mult:0.4142}
];

/* Aggregate profiles offered alongside the 29 named RVOs */
const PROFILES = [
  {n:'National average',    herds:106166, inc:6.06, tier:'NATIONAL', mult:1.0000, note:'All 29 RVOs, herd-weighted, 2024'},
  {n:'HIGH tier average',   herds:38968,  inc:8.82, tier:'HIGH',     mult:1.4557, note:'14 counties above 7% herd incidence'},
  {n:'MEDIUM tier average', herds:37285,  inc:5.42, tier:'MED',      mult:0.8936, note:'10 counties, 4% to 7%'},
  {n:'LOW tier average',    herds:29913,  inc:3.27, tier:'LOW',      mult:0.5389, note:'5 counties below 4%. Base run of the reference workbook'}
];

/* Herd-weighted tier means, 2024 */
const TIERS = {
  HIGH:     {counties:14, herds:38968,  mean:8.8207, mult:1.4557},
  MED:      {counties:10, herds:37285,  mean:5.4150, mult:0.8936},
  LOW:      {counties:5,  herds:29913,  mean:3.2657, mult:0.5389},
  NATIONAL: {counties:29, herds:106166, mean:6.0595, mult:1.0000}
};

/* Seasonal bTB risk factors applied by month of cheese production */
const SEASON = [
  {m:'January',  f:1.25, housing:'Full housing',   testing:'Low',    milk:0.85},
  {m:'February', f:1.30, housing:'Peak housing',   testing:'Low',    milk:0.82},
  {m:'March',    f:1.15, housing:'Pre-turnout',    testing:'Medium', milk:0.90},
  {m:'April',    f:0.90, housing:'Turnout begins', testing:'High',   milk:1.05},
  {m:'May',      f:0.75, housing:'Full grazing',   testing:'High',   milk:1.15},
  {m:'June',     f:0.70, housing:'Pasture peak',   testing:'Medium', milk:1.20},
  {m:'July',     f:0.75, housing:'Summer grazing', testing:'Low',    milk:1.15},
  {m:'August',   f:0.85, housing:'Late summer',    testing:'Low',    milk:1.10},
  {m:'September',f:0.95, housing:'Autumn',         testing:'Medium', milk:1.00},
  {m:'October',  f:1.10, housing:'Housing prep',   testing:'Medium', milk:0.95},
  {m:'November', f:1.20, housing:'Housing starts', testing:'High',   milk:0.90},
  {m:'December', f:1.25, housing:'Full housing',   testing:'Medium', milk:0.85}
];

/* D-value reference table, decimal reduction time at maturation temperature */
const DVALUES = [
  {type:'Cheddar',    level:'high inoculum', d:57,   sd:8,  inoc:'10³–10⁵ CFU/mL', src:'Forgrave et al. 2016'},
  {type:'Cheddar',    level:'low inoculum',  d:41,   sd:8,  inoc:'10² CFU/mL',     src:'Forgrave et al. 2016'},
  {type:'Caerphilly', level:'high inoculum', d:59,   sd:10, inoc:'10³–10⁵ CFU/mL', src:'Forgrave et al. 2016'},
  {type:'Caerphilly', level:'low inoculum',  d:24,   sd:10, inoc:'10² CFU/mL',     src:'Forgrave et al. 2016'},
  {type:'Parmesan',   level:'hard, long',    d:37.5, sd:5.3,inoc:'10⁶ CFU/mL',     src:'Starikoff et al. 2016'}
];

const CHEESETYPES = {
  caerphilly: {label:'Caerphilly, semi-hard', d:59, sd:10, mat:153},
  cheddar:    {label:'Cheddar',               d:57, sd:8,  mat:120},
  parmesan:   {label:'Parmesan type, hard',   d:37.5, sd:5.3, mat:365}
};
