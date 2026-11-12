# bTB-RISK Studio

A farm-to-fork quantitative microbial risk assessment (QMRA) decision-support tool for
*Mycobacterium bovis* in unpasteurised cheese produced by Irish dairy herds that subsequently
lose bovine tuberculosis-free status.

**Live tool:** https://talarigopi.github.io/btb-risk-studio/

Teagasc Food Research Centre, Moorepark · Department of Agriculture, Food and the Marine,
PSSRC Topic 8.1 (reference 2023PSSRC916).

## What it does

Enter a herd, its Regional Veterinary Office, the four TB status dates and the product, and the
tool runs a stochastic farm-to-fork assessment in the browser. It returns a risk band, the full
exposure pathway, a sensitivity ranking and a DAFM-format decision report with management options
and their legal basis.

Nothing is transmitted. The Monte Carlo simulation runs client side.

## Model

Six modules, Latin hypercube sampling, 10,000 iterations by default.

| Step | Expression |
|---|---|
| Infected cows | N_herd x P_herd x P_within x M_prevalence |
| Shedding | [P_within·Shed_pos + (1-P_within)·Shed_neg] x M_shedding |
| Bulk tank | infected x shedding / milk volume x 1000 |
| Fresh curd | bulk tank x f_retention x F_concentration |
| Log reduction | t / D + k(T)(t_retail + t_domestic) / 2.303 |
| At consumption | (curd x 10^-LR + P_cross·C_cross) x F_processing |
| Dose | concentration x serving mass |
| Risk per serving | 1 - exp(-r_eff x dose) |
| Annual risk | 1 - (1 - P_serving)^n |

Primary models: log-linear D-value inactivation, temperature-adjusted post-ripening decay,
exponential single-hit dose-response, and two mass-balance relationships.

Secondary models: county prevalence multiplier, square-root shedding scaling, retrospective
uncertainty factor, seasonal factor.

## Data

Central Statistics Office Bovine Tuberculosis Eradication Programme statistics, tables DAA01
(annual, 2010-2024), DAQ01 and DAQ02 (quarterly), covering all 29 Regional Veterinary Office
areas. Consumption from the IUNA National Adult Nutrition Survey 2021. Inactivation kinetics from
Forgrave et al. 2016 and Starikoff et al. 2016.

The engine reimplements the Teagasc bTB QMRA DAFM decision-support workbook of 19 May 2026 and
reproduces its recorded outputs within about ten per cent. See the Validation page in the tool.

## Files

```
index.html    page shell, styles, navigation
data.js       embedded CSO surveillance data, D-value table, seasonal factors
model.js      distributions, Monte Carlo engine, sensitivity analysis
params.js     parameter register with sources and provenance classes
app.js        views, charts, routing, report generation
assets/       hero image, Teagasc and DAFM logos
```

No build step and no dependencies. Open `index.html` or serve the directory.

## Deployment

GitHub Pages serves the repository root. A Cloudflare Workers configuration is also provided:

```
npx wrangler@latest deploy
```

## Authors

Gopaiah Talari (corresponding, gopaiah.talari@teagasc.ie), Önay Burak Doğan, Uma Tiwari,
Tríona O'Brien, Jeremiah Sheehan, Geraldine Duffy, Prabin Lamichhane.

1. Teagasc Food Research Centre, Moorepark, Fermoy, Co. Cork, Ireland
2. Teagasc Food Research Centre, Ashtown, Dublin, Ireland
3. School of Food Science and Environmental Health, Technological University Dublin, Ireland

## Citation

Talari, G., Doğan, Ö.B., Tiwari, U., O'Brien, T., Sheehan, J., Duffy, G. and Lamichhane, P.
(2026) bTB-RISK Studio: a farm-to-fork quantitative microbial risk assessment tool for
*Mycobacterium bovis* in unpasteurised cheese. Teagasc Food Research Centre, Moorepark, for the
Department of Agriculture, Food and the Marine, PSSRC Topic 8.1.

## Disclaimer

A research decision-support tool. Not a regulatory decision tool, not a safety determination, and
not a basis for a product action on its own. Calibrated parameters must be replaced with
case-specific and facility-specific evidence before operational use.

## Licence

Code released under the MIT Licence. Surveillance data remain the property of the Central
Statistics Office. Logos are the property of their respective owners.
