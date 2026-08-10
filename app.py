from pathlib import Path
import json
import gc

import pandas as pd
import plotly.express as px
import streamlit as st

st.set_page_config(
    page_title="Heat Stress Italy Explorer",
    page_icon="🌡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"

PERIOD_ORDER = [
    "P1_BASELINE_2006_2025",
    "P2_NEAR_2026_2050",
    "P3_MID_2051_2075",
    "P4_COMMON_2076_2099",
]
PERIOD_LABELS = {
    "P1_BASELINE_2006_2025": "P1 · Baseline 2006–2025",
    "P2_NEAR_2026_2050": "P2 · Near term 2026–2050",
    "P3_MID_2051_2075": "P3 · Mid century 2051–2075",
    "P4_COMMON_2076_2099": "P4 · Far future 2076–2099",
}
INTENSITY_LABELS = {
    "clerical": "Clerical / cognitive",
    "light_physical": "Light physical",
    "moderate_physical": "Moderate physical",
    "heavy_physical": "Heavy physical",
}
EXPOSURE_LABELS = {
    0.00: "Indoor / shade",
    0.25: "Mostly indoor / limited outdoor",
    0.50: "Mixed indoor–outdoor",
    0.75: "Mostly outdoor",
    1.00: "Outdoor / direct-sun",
}

MICRO_COLS = [
    "period_id", "period_label", "REF_AREA", "province_name",
    "sector_code", "sector_description", "VA_BRANCH_11", "VA_BRANCH_11_DESC",
    "work_intensity", "outdoor_share_main", "addetti", "VA_allocated_EUR",
    "workers_lost_mixed_main", "VA_loss_EUR_mixed_main",
    "workers_lost_combined_adapt_50", "VA_loss_EUR_combined_adapt_50",
    "VA_avoided_EUR_combined_adapt_50",
    "workers_lost_combined_adapt_75", "VA_loss_EUR_combined_adapt_75",
    "VA_avoided_EUR_combined_adapt_75",
]

@st.cache_resource(show_spinner="Loading compact province × ATECO5 data…")
def load_micro():
    df = pd.read_csv(
        DATA / "ATECO5_province_P1_P4_micro_results.csv.gz",
        compression="gzip",
        usecols=MICRO_COLS,
        dtype={
            "REF_AREA": "string",
            "sector_code": "string",
            "period_id": "category",
            "period_label": "category",
            "province_name": "category",
            "sector_description": "category",
            "VA_BRANCH_11": "category",
            "VA_BRANCH_11_DESC": "category",
            "work_intensity": "category",
        },
    )
    df["sector_code"] = df["sector_code"].str.zfill(5).astype("category")
    df["REF_AREA"] = df["REF_AREA"].astype("category")
    df["exposure_label"] = (
        df["outdoor_share_main"].round(2).map(EXPOSURE_LABELS).fillna("Other")
    ).astype("category")
    return df

@st.cache_resource(show_spinner=False)
def load_adaptation():
    prov = pd.read_csv(
        DATA / "ensemble_province_adaptation_losses.csv",
        dtype={"REF_AREA": "string"},
    )
    nat = pd.read_csv(DATA / "ensemble_national_adaptation_losses.csv")
    intensity = pd.read_csv(DATA / "ensemble_national_intensity_adaptation.csv")
    return prov, nat, intensity

@st.cache_resource(show_spinner=False)
def load_geojson():
    with open(
        DATA / "economic_geography_103_simplified.geojson",
        "r",
        encoding="utf-8",
    ) as f:
        return json.load(f)

micro = load_micro()
adapt_prov, adapt_nat, adapt_int = load_adaptation()
geojson = load_geojson()

st.title("Heat stress, labour productivity and value-added losses across Italian provinces")
st.caption(
    "Interactive companion · 103 harmonised economic provinces · "
    "821 ATECO5 activities · P1–P4 · adaptation scenarios"
)

with st.expander("How to interpret these outputs", expanded=False):
    st.markdown(
        """
        The dashboard visualises **modelled annual-equivalent labour-capacity and
        value-added exposure**. Equivalent workers lost are full-time-equivalent
        productive capacity, **not predicted layoffs**. Value-added losses are
        first-order accounting quantities, **not causal or general-equilibrium GDP
        forecasts**. P4 is the common ten-model window **2076–2099**.
        """
    )

view = st.sidebar.radio(
    "Dashboard section",
    ["ATECO5 micro explorer", "Adaptation explorer", "Data notes"],
)

def format_billions(x):
    return f"€{x/1e9:,.2f} bn"

def render_micro():
    st.subheader("Province × ATECO5 incidence")

    period = st.sidebar.selectbox(
        "Climate period",
        PERIOD_ORDER,
        index=3,
        format_func=lambda x: PERIOD_LABELS[x],
        key="micro_period",
    )
    scenario = st.sidebar.selectbox(
        "Adaptation state",
        ["No adaptation", "Combined · 50% uptake", "Combined · 75% uptake"],
        key="micro_scenario",
    )

    metric_options = [
        "Value-added loss (€ million)",
        "Value-added loss intensity (%)",
        "Equivalent workers lost",
        "Worker loss intensity (%)",
    ]
    if scenario != "No adaptation":
        metric_options.append("Avoided value added (%)")
    metric = st.sidebar.selectbox("Map outcome", metric_options, key="micro_metric")

    branches = (
        micro[["VA_BRANCH_11", "VA_BRANCH_11_DESC"]]
        .drop_duplicates()
        .sort_values("VA_BRANCH_11")
    )
    branch_options = {
        f"{str(r.VA_BRANCH_11)} · {str(r.VA_BRANCH_11_DESC)}": r.VA_BRANCH_11
        for r in branches.itertuples()
    }
    branch_label = st.sidebar.selectbox(
        "Economic branch",
        ["All branches"] + list(branch_options.keys()),
    )

    intensity = st.sidebar.selectbox(
        "Work intensity",
        ["All intensities"] + list(INTENSITY_LABELS.keys()),
        format_func=lambda x: INTENSITY_LABELS.get(x, x),
    )
    exposure = st.sidebar.selectbox(
        "Exposure class",
        ["All exposure classes"] + list(EXPOSURE_LABELS.values()),
    )

    mask = micro["period_id"] == period
    if branch_label != "All branches":
        mask &= micro["VA_BRANCH_11"] == branch_options[branch_label]
    if intensity != "All intensities":
        mask &= micro["work_intensity"] == intensity
    if exposure != "All exposure classes":
        mask &= micro["exposure_label"] == exposure

    tmp = micro.loc[mask, ["sector_code", "sector_description"]]
    ateco_lookup = tmp.drop_duplicates().sort_values("sector_code")
    ateco_options = ["All ATECO5"] + [
        f"{str(r.sector_code)} · {str(r.sector_description)}"
        for r in ateco_lookup.itertuples()
    ]
    ateco_sel = st.sidebar.selectbox("ATECO5 activity", ateco_options)

    if ateco_sel != "All ATECO5":
        ateco_code = ateco_sel.split(" · ", 1)[0]
        mask &= micro["sector_code"].astype("string") == ateco_code
    else:
        ateco_code = None

    df = micro.loc[mask]
    if df.empty:
        st.warning("No observations match the selected filters.")
        return

    if scenario == "No adaptation":
        va_col = "VA_loss_EUR_mixed_main"
        worker_col = "workers_lost_mixed_main"
        avoided_col = None
    elif scenario == "Combined · 50% uptake":
        va_col = "VA_loss_EUR_combined_adapt_50"
        worker_col = "workers_lost_combined_adapt_50"
        avoided_col = "VA_avoided_EUR_combined_adapt_50"
    else:
        va_col = "VA_loss_EUR_combined_adapt_75"
        worker_col = "workers_lost_combined_adapt_75"
        avoided_col = "VA_avoided_EUR_combined_adapt_75"

    agg = {
        "province_name": "first",
        "VA_allocated_EUR": "sum",
        "addetti": "sum",
        va_col: "sum",
        worker_col: "sum",
        "VA_loss_EUR_mixed_main": "sum",
    }
    if avoided_col:
        agg[avoided_col] = "sum"

    prov = (
        df.groupby("REF_AREA", observed=True, as_index=False)
        .agg(agg)
    )
    prov["REF_AREA"] = prov["REF_AREA"].astype("string")
    prov["province_name"] = prov["province_name"].astype("string")
    prov["VA_loss_mn"] = prov[va_col] / 1e6
    prov["VA_loss_intensity"] = 100 * prov[va_col] / prov["VA_allocated_EUR"].replace(0, pd.NA)
    prov["worker_loss_intensity"] = 100 * prov[worker_col] / prov["addetti"].replace(0, pd.NA)
    if avoided_col:
        prov["avoided_va_pct"] = 100 * prov[avoided_col] / prov["VA_loss_EUR_mixed_main"].replace(0, pd.NA)
    else:
        prov["avoided_va_pct"] = 0.0

    total_va_loss = float(prov[va_col].sum())
    total_workers = float(prov[worker_col].sum())
    total_va = float(prov["VA_allocated_EUR"].sum())
    total_emp = float(prov["addetti"].sum())

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("VA loss", format_billions(total_va_loss))
    k2.metric("VA loss intensity", f"{100*total_va_loss/total_va:,.2f}%" if total_va else "—")
    k3.metric("Equivalent workers lost", f"{total_workers:,.0f}")
    k4.metric("Worker loss intensity", f"{100*total_workers/total_emp:,.2f}%" if total_emp else "—")

    metric_map = {
        "Value-added loss (€ million)": ("VA_loss_mn", "€ million", "Reds"),
        "Value-added loss intensity (%)": ("VA_loss_intensity", "%", "OrRd"),
        "Equivalent workers lost": (worker_col, "workers", "YlOrRd"),
        "Worker loss intensity (%)": ("worker_loss_intensity", "%", "OrRd"),
        "Avoided value added (%)": ("avoided_va_pct", "%", "Greens"),
    }
    value_col, unit, colors = metric_map[metric]

    fig = px.choropleth(
        prov,
        geojson=geojson,
        locations="REF_AREA",
        featureidkey="properties.REF_AREA",
        color=value_col,
        hover_name="province_name",
        hover_data={
            "REF_AREA": False,
            "VA_loss_mn": ":,.1f",
            "VA_loss_intensity": ":.2f",
            worker_col: ":,.0f",
            "worker_loss_intensity": ":.2f",
            "avoided_va_pct": ":.1f",
        },
        color_continuous_scale=colors,
        labels={
            value_col: unit,
            "VA_loss_mn": "VA loss (€m)",
            "VA_loss_intensity": "VA loss (%)",
            worker_col: "Workers lost",
            "worker_loss_intensity": "Worker loss (%)",
            "avoided_va_pct": "Avoided VA (%)",
        },
    )
    fig.update_geos(fitbounds="locations", visible=False)
    fig.update_layout(
        height=620,
        margin=dict(l=0, r=0, t=10, b=0),
        coloraxis_colorbar=dict(title=unit),
    )
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    if st.checkbox("Show ranking and P1–P4 trend", value=False):
        left, right = st.columns(2)
        with left:
            rank = prov.nlargest(15, value_col).sort_values(value_col)
            bar = px.bar(
                rank,
                x=value_col,
                y="province_name",
                orientation="h",
                labels={value_col: metric, "province_name": ""},
            )
            bar.update_layout(height=430, margin=dict(l=0, r=0, t=10, b=0))
            st.plotly_chart(bar, use_container_width=True, config={"displayModeBar": False})
        with right:
            tr_mask = pd.Series(True, index=micro.index)
            if branch_label != "All branches":
                tr_mask &= micro["VA_BRANCH_11"] == branch_options[branch_label]
            if intensity != "All intensities":
                tr_mask &= micro["work_intensity"] == intensity
            if exposure != "All exposure classes":
                tr_mask &= micro["exposure_label"] == exposure
            if ateco_code is not None:
                tr_mask &= micro["sector_code"].astype("string") == ateco_code
            tr = micro.loc[tr_mask, ["period_id", "period_label", "VA_allocated_EUR", va_col]]
            trend = (
                tr.groupby(["period_id", "period_label"], observed=True, as_index=False)
                .agg(VA_loss=(va_col, "sum"), VA=("VA_allocated_EUR", "sum"))
            )
            trend["loss_pct"] = 100 * trend["VA_loss"] / trend["VA"]
            trend["period_id"] = pd.Categorical(trend["period_id"], PERIOD_ORDER, ordered=True)
            trend = trend.sort_values("period_id")
            tf = px.line(
                trend,
                x="period_label",
                y="loss_pct",
                markers=True,
                labels={"period_label": "", "loss_pct": "VA loss intensity (%)"},
            )
            tf.update_layout(height=430, margin=dict(l=0, r=0, t=10, b=0))
            st.plotly_chart(tf, use_container_width=True, config={"displayModeBar": False})

    del df, prov
    gc.collect()

def render_adaptation():
    st.subheader("Adaptation effectiveness across provinces")

    period = st.sidebar.selectbox(
        "Climate period",
        PERIOD_ORDER,
        index=3,
        format_func=lambda x: PERIOD_LABELS[x],
        key="adapt_period",
    )
    measure = st.sidebar.selectbox(
        "Adaptation measure",
        ["shade", "space_cooling", "exoskeleton", "combined"],
        format_func=lambda x: {
            "shade": "Shade",
            "space_cooling": "Space cooling",
            "exoskeleton": "Exoskeleton",
            "combined": "Combined package",
        }[x],
    )
    uptake_options = sorted(
        adapt_prov.loc[
            (adapt_prov["period_id"] == period)
            & (adapt_prov["measure"] == measure),
            "uptake",
        ].dropna().unique()
    )
    if not uptake_options:
        st.warning("No uptake scenarios are available for this selection.")
        return

    uptake = st.sidebar.selectbox(
        "Uptake",
        uptake_options,
        index=min(1, len(uptake_options) - 1),
        format_func=lambda x: f"{int(round(100*x))}%",
    )

    ap = adapt_prov[
        (adapt_prov["period_id"] == period)
        & (adapt_prov["measure"] == measure)
        & (adapt_prov["uptake"] == uptake)
    ][
        [
            "REF_AREA", "province_name", "avoided_VA_percent_mean",
            "avoided_VA_loss_EUR_mean", "adapted_VA_loss_EUR_mean",
            "noadapt_VA_loss_EUR_mean",
        ]
    ]

    nat = adapt_nat[
        (adapt_nat["period_id"] == period)
        & (adapt_nat["measure"] == measure)
        & (adapt_nat["uptake"] == uptake)
    ]
    if ap.empty or nat.empty:
        st.warning("No adaptation results are available for this selection.")
        return
    n = nat.iloc[0]

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("National avoided VA", format_billions(float(n["avoided_VA_loss_EUR_mean"])))
    m2.metric("National avoided VA", f"{float(n['avoided_VA_percent_mean']):,.1f}%")
    m3.metric("Avoided workers", f"{float(n['avoided_workers_lost_mean']):,.0f}")
    m4.metric("Avoided workers", f"{float(n['avoided_workers_percent_mean']):,.1f}%")

    fig = px.choropleth(
        ap,
        geojson=geojson,
        locations="REF_AREA",
        featureidkey="properties.REF_AREA",
        color="avoided_VA_percent_mean",
        hover_name="province_name",
        hover_data={
            "REF_AREA": False,
            "avoided_VA_percent_mean": ":.1f",
            "avoided_VA_loss_EUR_mean": ":,.0f",
        },
        color_continuous_scale="Greens",
        labels={
            "avoided_VA_percent_mean": "Avoided VA (%)",
            "avoided_VA_loss_EUR_mean": "Avoided VA (€)",
        },
    )
    fig.update_geos(fitbounds="locations", visible=False)
    fig.update_layout(height=620, margin=dict(l=0, r=0, t=10, b=0))
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

    if st.checkbox("Show effectiveness by work intensity", value=False):
        ai = adapt_int[
            (adapt_int["period_id"] == period)
            & (adapt_int["measure"] == measure)
            & (adapt_int["uptake"] == uptake)
        ].copy()
        if not ai.empty:
            ai["Intensity"] = ai["work_intensity"].map(INTENSITY_LABELS).fillna(ai["work_intensity"])
            ib = px.bar(
                ai,
                x="Intensity",
                y="avoided_VA_percent_mean",
                labels={"avoided_VA_percent_mean": "Avoided VA (%)", "Intensity": ""},
            )
            ib.update_layout(height=400, margin=dict(l=0, r=0, t=10, b=0))
            st.plotly_chart(ib, use_container_width=True, config={"displayModeBar": False})

def render_notes():
    st.subheader("Data architecture and interpretation")
    st.markdown(
        """
        **Economic microdata**
        - 274,568 province × ATECO5 × period cells
        - 103 harmonised economic provinces
        - 821 observed ATECO5 activities
        - P1–P4 based on the common ten-model climate ensemble

        **Interpretation**
        - equivalent workers lost are annual full-time-equivalent productive capacity, not layoffs;
        - value-added loss is a first-order accounting measure, not a causal GDP forecast;
        - activity-specific outdoor shares combine indoor/shade and direct-sun productivity-loss fractions;
        - 25%, 50% and 75% adaptation uptake are stylised sensitivity scenarios, not adoption forecasts.

        This lightweight online interface reads only the columns needed for interactive exploration.
        The complete archived machine-readable outputs remain the reproducibility source.
        """
    )

try:
    if view == "ATECO5 micro explorer":
        render_micro()
    elif view == "Adaptation explorer":
        render_adaptation()
    else:
        render_notes()
except Exception as exc:
    st.error(
        "The selected view could not be rendered. "
        "Please reload the app; if the problem persists, open Manage app → Logs."
    )
    st.exception(exc)
