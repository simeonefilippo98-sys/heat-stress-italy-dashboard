# Occupational Heat & Economic Exposure in Italy

**Interactive research companion to *From climate hazard to economic exposure***

> Simeone, F. (2026). *From climate hazard to economic exposure: occupational heat, productivity losses and adaptation across 103 harmonised Italian territorial units and 821 observed ATECO5 activities*. Working manuscript, August 2026.

**Created and maintained by Filippo Simeone.**

Live research explorer: https://heat-stress-italy-dashboard.vercel.app

## Role in *From climate hazard to economic exposure*

This dashboard is not an ancillary illustration added after the analysis. It is the principal interactive dissemination and audit layer for *From climate hazard to economic exposure: occupational heat, productivity losses and adaptation across 103 harmonised Italian territorial units and 821 observed ATECO5 activities*. It exposes the same validated outputs used by the manuscript and its Supplementary Information, allowing readers to move from the national climate projections to territorial units, economic branches and observed five-digit ATECO activities without introducing new damage functions or interpolated model states.

The research companion supports interactive exploration of:

- P1-P4 occupational heat projections and WBGT threshold-day diagnostics;
- 103 harmonised Italian economic provinces;
- 821 five-digit ATECO activities actually observed in the ASIA-based non-agricultural analytical panel;
- agriculture, forestry and fishing as a separate aggregate branch rather than an artificial five-digit activity;
- clerical/cognitive, light, moderate and heavy work-intensity classes;
- activity-specific mixed indoor/outdoor exposure;
- annual-equivalent workers lost and direct value-added exposure;
- branch and detailed-activity incidence;
- climate-model-chain uncertainty and methodological robustness;
- stylised shade, space-cooling, exoskeleton and combined adaptation scenarios;
- observed 2018-2023 workforce composition and the CEDEFOP-based 2035 composition-only sensitivity;
- province research profiles, linked chart navigation, multi-entity comparison and validated A/B scenario analysis.

Version 1.1 adds a national **At a glance** entry point, P1–P4 headline indicators, a direct map-to-province research-profile workflow, Italian/English summary navigation, shareable URL state, full-screen map controls, a persistent interpretation warning and an explicit version/reproducibility panel. Version 1.1.1 also defers the overview map until its panel is visible and adds an adaptation catalogue that distinguishes the four modelled scenarios from policy-relevant candidate measures that are not separately parameterised. All choropleths are therefore sized from a visible container rather than initialised inside hidden tabs.

Version 1.2 improves delivery reliability without changing the scientific model or its outputs. The browser now downloads one codebook-compressed microdata payload (about 18 MB instead of two archives totalling about 36 MB), reconstructs the same 274,568 analytical rows locally, loads Plotly and Papa Parse from repository-pinned copies, retries transient requests and provides an explicit recovery action if loading fails. A deterministic build script in `tools/build_compact_payload.py` regenerates the transport payload from the two validated source archives. Version 1.3 adds deterministic module loading, removes duplicate chart redraws, corrects mobile Plotly resizing, introduces an accessible mobile view selector and ARIA tab navigation, and makes the exact 274,568-row source-to-payload validation visible in the interface.

Equivalent workers lost represent annual-equivalent productive capacity, not predicted layoffs. Value-added losses are first-order accounting exposures, not causal GDP, welfare or general-equilibrium forecasts.

## Economic and activity coverage

The detailed selector contains **821 observed ATECO5 activities in the ASIA-based non-agricultural panel**. This is not the complete universe of official ATECO categories. Agriculture is incorporated separately as branch A because the project data architecture does not contain a conceptually comparable public province-by-ATECO5 source combining both employment and allocable value added at the required resolution. The dashboard therefore follows the same conservative rule as *From climate hazard to economic exposure*: preserve detailed activity information where it is observed and do not manufacture unsupported agricultural ATECO5 allocations.

## Scientific provenance

The live **Methods & citations** view distinguishes three types of model ingredients:

- **Literature-derived relationships**, such as the Stull wet-bulb approximation and the Pilcher clerical performance mapping;
- **Literature-informed implementations**, including the main ISO-style workability architecture and the NIOSH/Hothaps sensitivity functions;
- **Study-specific choices**, including the simplified direct-sun proxy, activity-level outdoor shares, mixed-exposure accounting, annual-equivalent economic translation and stylised adaptation uptake.

The main references include Stull (2011), Pilcher, Nadler & Busch (2002), NIOSH (2016), ISO 7243:2017 and Szewczyk, Mongelli & Ciscar (2021). The manuscript and Supplementary Information provide the complete climate-model, economic-data and occupational-health bibliography.

## Linked scientific interactions

The visualisations are designed as research controls rather than static graphics. The P1-P4 trajectory can change the active climate period; the uncertainty trajectory can update the robustness period; methodological alternatives open an inspector with ensemble mean and P05-P95; province profiles link directly to the climate, workforce and scenario views; and Scenario Lab compares two archived model states side by side.

These interactions reuse validated outputs only. They do not estimate uncomputed combinations.

## Scenario Lab and performance

Scenario Lab uses a lazy architecture. Only a small launcher is loaded with the main dashboard; the comparison module is fetched on first use and builds cached compact indices. Province-by-activity decompositions remain in Explore & Compare so the scenario module does not repeatedly scan the full province-ATECO5 microdata.

Alternative NIOSH, Hothaps and low/high outdoor-share sensitivities are restricted to the resolution at which those robustness outputs are archived. The interface therefore favours methodological fidelity over unconstrained what-if simulation.

## Reproducibility and version of record

For journal submission, the live dashboard should be cited together with a frozen release of this repository and the machine-readable data required to reproduce its views. The planned archived citation is:

> Simeone, F. (2026). *From climate hazard to economic exposure: interactive research companion*. Version 1.3.0. Zenodo. DOI to be assigned.

The archived release will constitute the version of record; the Vercel deployment will remain the interactive endpoint.

## Relationship to *Unequal capacity to adapt*

*Unequal capacity to adapt: occupational heat, social vulnerability and territorial climate justice across 103 Italian provinces* develops the territorial climate-justice question using projected economic burden from *From climate hazard to economic exposure* as an input together with independent indicators of adaptive capacity and social vulnerability. It has its own analytical design and Supplementary Information. Adaptive-capacity, HOCV, OHJPI and climate-justice classifications are therefore deliberately excluded from this dashboard.
