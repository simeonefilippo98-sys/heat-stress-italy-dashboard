# Heat Stress Italy Interactive Dashboard

Interactive companion dashboard for the study *Heat stress, labour productivity and value-added losses across Italian provinces: climate uncertainty, occupational heterogeneity and adaptation*.

**Created and maintained by Filippo Simeone.**

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
- province research profiles, multi-entity comparisons and scenario deltas through the Explore & Compare view;
- validated A/B comparisons through the Scenario Lab.

The interface does not introduce additional model estimates beyond the documented analytical pipeline. Equivalent workers lost represent annual-equivalent productive capacity, not predicted layoffs. Value-added losses are first-order accounting exposures, not causal or general-equilibrium GDP forecasts.

## Scientific provenance

The live dashboard includes a **Methods & citations** view that reports the main formulas and distinguishes among literature-derived relationships, literature-informed implementations and study-specific scenario/accounting choices.

Key references include:

- Stull, R. (2011), *Wet-Bulb Temperature from Relative Humidity and Air Temperature*, Journal of Applied Meteorology and Climatology 50(11), 2267–2269. DOI: 10.1175/JAMC-D-11-0143.1.
- Pilcher, J.J., Nadler, E. & Busch, C. (2002), *Effects of hot and cold temperature exposure on performance: a meta-analytic review*, Ergonomics 45(10), 682–698. DOI: 10.1080/00140130210158419.
- NIOSH (2016), *Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments*, DHHS (NIOSH) Publication 2016-106.
- ISO 7243:2017, *Ergonomics of the thermal environment — Assessment of heat stress using the WBGT index*.
- Szewczyk, W., Mongelli, I. & Ciscar, J.-C. (2021), *Heat stress, labour productivity and adaptation in Europe—a regional and occupational analysis*, Environmental Research Letters 16, 105002. DOI: 10.1088/1748-9326/ac24cf.

The project-specific direct-sun proxy (`WBGT_sun = WBGT_shade + 3°C`), ATECO5 outdoor-share mapping, mixed-exposure weighting, annual-equivalent accounting and stylised adaptation uptake scenarios are explicitly labelled as modelling choices rather than presented as universal empirical constants.

## Linked scientific interactions

Several charts also act as navigation controls. The P1–P4 trajectory can update the active climate period in the province explorer; the uncertainty trajectory can update the robustness period; and methodological robustness bars open a dedicated inspector reporting the ensemble mean, P05–P95 and the difference from the main ISO specification. These interactions reuse validated outputs only.

## Explore & Compare

The Explore & Compare view provides province research profiles, P1–P4 comparison of up to six provinces, branches or activities, accounting decompositions of provincial losses, scenario-delta charts, and deterministic descriptive summaries. These summaries are generated from the validated outputs and should not be interpreted causally.

### Province Research Profile

The **Province Research Profile** combines the main provincial evidence in one scientific profile rather than requiring the reader to move across separate charts. For the selected province, period and adaptation state it reports:

- authoritative provincial value-added loss and P05–P95 climate-model dispersion;
- value-added-loss intensity and rank among the 103 harmonised provinces;
- equivalent workers lost and worker-loss intensity;
- P1–P4 value-added-loss trajectory;
- adaptive-capacity score and descriptive Just Resilience quadrant/priority context;
- P4 direct-sun WBGT proxy and P4−P1 WBGT change;
- observed 2023 workforce composition alongside the separately labelled CEDEFOP 2035 composition-only sensitivity;
- no-adaptation, Combined 50% and Combined 75% adaptation outcomes;
- the largest branch contributions to provincial value-added loss;
- the largest detailed ATECO5 contributions, with agriculture retained only as aggregate branch A.

The headline KPI values are taken from the authoritative province-level adaptation/ensemble outputs and fixed provincial economic denominators. The ATECO5 microdata are used only for the accounting decomposition of drivers. This avoids reconstructing headline provincial estimates from a detailed layer when a validated aggregate result already exists.

For performance, the profile does no microdata scan while Explore & Compare is hidden. The selected province's detailed rows are cached on first use and reused thereafter; the workforce file is fetched lazily once; and only the two principal profile charts use Plotly. Buttons link the profile directly to Scenario Lab, the detailed climate-hazard view, the workforce explorer and Methods & citations.

## Scenario Lab

The **Scenario Lab** compares two validated model states side by side. For the main ISO specification it can compare Italy, individual provinces, economic branches and observed ATECO5 activities across P1–P4 and the archived no-adaptation / Combined 50% / Combined 75% states. It reports Scenario A, Scenario B, the absolute and relative B−A change, P1–P4 trajectories under the two selected definitions, and an accounting decomposition of the largest drivers of the difference.

The Scenario Lab uses a **lazy, lightweight architecture**: only a tiny launcher is loaded with the main dashboard; the comparison module is fetched on first click and builds compact cached indices once, in small idle-time chunks. Subsequent interactions reuse those indices rather than repeatedly scanning the full province–ATECO5 microdata. Province-by-activity driver decomposition is intentionally left to Explore & Compare so that Scenario Lab does not reintroduce a heavy full-microdata computation.

Alternative NIOSH, Hothaps and low/high outdoor-share sensitivities are deliberately restricted to national, no-adaptation comparisons because that is the resolution at which the robustness outputs are archived. The Scenario Lab does not interpolate uncomputed combinations. Agriculture remains available as aggregate branch A and is not represented as a five-digit activity.

## Working-paper citation

> Simeone, F. (2026). *Heat stress, labour productivity and value-added losses across Italian provinces: climate uncertainty, occupational heterogeneity and adaptation*. Working manuscript, August 2026.

## Dashboard citation

For manuscript submission, the live dashboard should be cited together with a frozen archived release of this repository. The planned citation form is:

> Simeone, F. (2026). *Interactive companion dashboard for Heat stress, labour productivity and value-added losses across Italian provinces*. Version 1.0. Zenodo. DOI: to be assigned.

The live Vercel URL may be reported alongside the DOI for interactive use, while the archived release provides the persistent version of record.
