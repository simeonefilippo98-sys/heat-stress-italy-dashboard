# Heat Stress Italy Interactive Dashboard

Interactive companion dashboard for the study *Heat stress, labour productivity and value-added losses across Italian provinces: climate uncertainty, occupational heterogeneity and adaptation*.

Live explorer: https://heat-stress-italy-dashboard.vercel.app

## Scope

The dashboard exposes the same validated outputs used by the manuscript and Supplementary Information. It supports interactive exploration of:

- climate hazard across P1–P4, including WBGT threshold-day diagnostics;
- 103 harmonised Italian economic provinces;
- 821 observed non-agricultural ATECO5 activities plus agriculture as a separate aggregate branch;
- work-intensity and indoor/outdoor exposure classes;
- value-added and equivalent-worker losses;
- stylised adaptation scenarios;
- climate-model uncertainty and methodological robustness;
- observed 2018–2023 workforce composition and the CEDEFOP-based 2035 composition-only scenario;
- province profiles, multi-entity comparisons and scenario deltas through the Explore & Compare view.

The interface does not introduce additional model estimates beyond the documented analytical pipeline. Equivalent workers lost represent annual-equivalent productive capacity, not predicted layoffs. Value-added losses are first-order accounting exposures, not causal or general-equilibrium GDP forecasts.

## Explore & Compare

The Explore & Compare view provides province profiles, P1–P4 comparison of up to six provinces, branches or activities, accounting decompositions of provincial losses, scenario-delta charts, and deterministic descriptive summaries. These summaries are generated from the validated outputs and should not be interpreted causally.

## Citation

For manuscript submission, the live dashboard should be cited together with a frozen archived release of this repository. The planned citation form is:

> Simeone, F. (2026). *Interactive companion dashboard for Heat stress, labour productivity and value-added losses across Italian provinces*. Version 1.0. Zenodo. DOI: to be assigned.

The live Vercel URL may be reported alongside the DOI for interactive use, while the archived release provides the persistent version of record.
