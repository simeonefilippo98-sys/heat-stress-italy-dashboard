from pathlib import Path
import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

st.set_page_config(
    page_title="Heat Stress Italy Explorer",
    page_icon="🌡️",
    layout="wide",
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

@st.cache_data(show_spinner="Loading province × ATECO5 results…")
def load_micro():
    df = pd.read_csv(
        DATA / "ATECO5_province_P1_P4_micro_results.csv.gz",
        compression="gzip",
        dtype={"REF_AREA": str, "sector_code": str},
    )
    df["sector_code"] = df["sector_code"].str.zfill(5)
    df["exposure_label"] = (
        df["outdoor_share_main"].round(2).map(EXPOSURE_LABELS).fillna("Other")
    )
    return df

@st.cache_data(show_spinner=False)
def load_adaptation():
    prov = pd.read_csv(
        DATA / "ensemble_province_adaptation_losses.csv",
        dtype={"REF_AREA": str},
    )
    nat = pd.read_csv(DATA / "ensemble_national_adaptation_losses.csv")
    intensity = pd.read_csv(DATA / "ensemble_national_intensity_adaptation.csv")
    return prov, nat, intensity

@st.cache_data(show_spinner=False)
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
    "Interactive companion explorer · 103 harmonised economic provinces · "
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

view = st.radio(
    "View",
    ["ATECO5 micro explorer", "Adaptation explorer", "Data notes"],
    horizontal=True,
    key="active_view",
)

def micro_explorer():
    st.subheader("Province × ATECO5 incidence")

    c1, c2, c3 = st.columns([1.2, 1.5, 1.3])
    with c1:
        period = st.selectbox(
            "Climate period",
            PERIOD_ORDER,
            index=3,
            format_func=lambda x: PERIOD_LABELS[x],
            key="micro_period",
        )
    with c2:
        scenario = st.selectbox(
            "Adaptation state",
            ["No adaptation", "Combined · 50% uptake", "Combined · 75% uptake"],
            key="micro_scenario",
        )
    with c3:
        metric_options = [
            "Value-added loss (€ million)",
            "Value-added loss intensity (%)",
            "Equivalent workers lost",
            "Worker loss intensity (%)",
        ]
        if scenario != "No adaptation":
            metric_options.append("Avoided value added (%)")
        metric = st.selectbox("Map outcome", metric_options, key="micro_metric")

    branches = (
        micro[["VA_BRANCH_11", "VA_BRANCH_11_DESC"]]
        .drop_duplicates()
        .sort_values("VA_BRANCH_11")
    )
    branch_options = {
        f"{r.VA_BRANCH_11} · {r.VA_BRANCH_11_DESC}": r.VA_BRANCH_11
        for r in branches.itertuples()
    }

    f1, f2, f3 = st.columns(3)
    with f1:
        selected_branches_labels = st.multiselect(
            "Economic branch",
            list(branch_options.keys()),
            placeholder="All branches",
        )
    with f2:
        selected_intensities = st.multiselect(
            "Work intensity",
            list(INTENSITY_LABELS.keys()),
            format_func=lambda x: INTENSITY_LABELS.get(x, x),
            placeholder="All intensities",
        )
    with f3:
        selected_exposure = st.multiselect(
            "Exposure class",
            list(EXPOSURE_LABELS.values()),
            placeholder="All exposure classes",
        )

    tmp = micro[micro["period_id"] == period]
    if selected_branches_labels:
        tmp = tmp[tmp["VA_BRANCH_11"].isin([branch_options[x] for x in selected_branches_labels])]
    if selected_intensities:
        tmp = tmp[tmp["work_intensity"].isin(selected_intensities)]
    if selected_exposure:
        tmp = tmp[tmp["exposure_label"].isin(selected_exposure)]

    ateco_lookup = (
        tmp[["sector_code", "sector_description"]]
        .drop_duplicates()
        .sort_values("sector_code")
    )
    ateco_options = ["All ATECO5"] + [
        f"{r.sector_code} · {r.sector_description}"
        for r in ateco_lookup.itertuples()
    ]
    ateco_sel = st.selectbox("ATECO5 activity", ateco_options, index=0)

    df = micro[micro["period_id"] == period]
    if selected_branches_labels:
        df = df[df["VA_BRANCH_11"].isin([branch_options[x] for x in selected_branches_labels])]
    if selected_intensities:
        df = df[df["work_intensity"].isin(selected_intensities)]
    if selected_exposure:
        df = df[df["exposure_label"].isin(selected_exposure)]
    if ateco_sel != "All ATECO5":
        ateco_code = ateco_sel.split(" · ", 1)[0]
        df = df[df["sector_code"] == ateco_code]
    else:
        ateco_code = None

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

    agg_spec = {
        "province_name": "first",
        "VA_allocated_EUR": "sum",
        "addetti": "sum",
        va_col: "sum",
        worker_col: "sum",
        "VA_loss_EUR_mixed_main": "sum",
    }
    if avoided_col:
        agg_spec[avoided_col] = "sum"

    prov = df.groupby("REF_AREA", as_index=False).agg(agg_spec)
    prov["VA_loss_mn"] = prov[va_col] / 1e6
    prov["VA_loss_intensity"] = 100 * prov[va_col] / prov["VA_allocated_EUR"].replace(0, pd.NA)
    prov["worker_loss_intensity"] = 100 * prov[worker_col] / prov["addetti"].replace(0, pd.NA)
    if avoided_col:
        prov["avoided_va_pct"] = 100 * prov[avoided_col] / prov["VA_loss_EUR_mixed_main"].replace(0, pd.NA)
    else:
        prov["avoided_va_pct"] = 0.0

    metric_map = {
        "Value-added loss (€ million)": ("VA_loss_mn", "€ million", "Reds"),
        "Value-added loss intensity (%)": ("VA_loss_intensity", "%", "OrRd"),
        "Equivalent workers lost": (worker_col, "workers", "YlOrRd"),
        "Worker loss intensity (%)": ("worker_loss_intensity", "%", "OrRd"),
        "Avoided value added (%)": ("avoided_va_pct", "%", "Greens"),
    }
    value_col, unit, colors = metric_map[metric]

    total_va_loss = prov[va_col].sum()
    total_workers = prov[worker_col].sum()
    total_va = prov["VA_allocated_EUR"].sum()
    total_emp = prov["addetti"].sum()

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("VA loss", f"€{total_va_loss/1e9:,.2f} bn")
    k2.metric("VA loss intensity", f"{100*total_va_loss/total_va:,.2f}%" if total_va else "—")
    k3.metric("Equivalent workers lost", f"{total_workers:,.0f}")
    k4.metric("Worker loss intensity", f"{100*total_workers/total_emp:,.2f}%" if total_emp else "—")

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
    fig.update_layout(height=650, margin=dict(l=0, r=0, t=20, b=0), coloraxis_colorbar=dict(title=unit))
    st.plotly_chart(fig, use_container_width=True)

    left, right = st.columns([1, 1])
    with left:
        rank = prov.nlargest(15, value_col).sort_values(value_col)
        bar = px.bar(
            rank,
            x=value_col,
            y="province_name",
            orientation="h",
            color=value_col,
            color_continuous_scale=colors,
            labels={value_col: metric, "province_name": ""},
        )
        bar.update_layout(height=450, coloraxis_showscale=False, margin=dict(l=0, r=0, t=25, b=0))
        st.plotly_chart(bar, use_container_width=True)

    with right:
        tr = micro
        if selected_branches_labels:
            tr = tr[tr["VA_BRANCH_11"].isin([branch_options[x] for x in selected_branches_labels])]
        if selected_intensities:
            tr = tr[tr["work_intensity"].isin(selected_intensities)]
        if selected_exposure:
            tr = tr[tr["exposure_label"].isin(selected_exposure)]
        if ateco_code is not None:
            tr = tr[tr["sector_code"] == ateco_code]

        tr_va = {
            "No adaptation": "VA_loss_EUR_mixed_main",
            "Combined · 50% uptake": "VA_loss_EUR_combined_adapt_50",
            "Combined · 75% uptake": "VA_loss_EUR_combined_adapt_75",
        }[scenario]

        trend = tr.groupby(["period_id", "period_label"], as_index=False).agg(
            VA_loss=(tr_va, "sum"), VA=("VA_allocated_EUR", "sum")
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
        tf.update_traces(line=dict(width=3), marker=dict(size=9))
        tf.update_layout(height=450, margin=dict(l=0, r=0, t=25, b=0))
        st.plotly_chart(tf, use_container_width=True)

    with st.expander("Filtered province table"):
        show_cols = [
            "province_name",
            "VA_loss_mn",
            "VA_loss_intensity",
            worker_col,
            "worker_loss_intensity",
        ]
        if avoided_col:
            show_cols.append("avoided_va_pct")
        st.dataframe(
            prov[show_cols].sort_values("VA_loss_intensity", ascending=False),
            use_container_width=True,
            hide_index=True,
        )

def adaptation_explorer():
    st.subheader("Adaptation effectiveness across provinces")

    a1, a2, a3 = st.columns(3)
    with a1:
        a_period = st.selectbox(
            "Climate period",
            PERIOD_ORDER,
            index=3,
            format_func=lambda x: PERIOD_LABELS[x],
            key="adapt_period",
        )
    with a2:
        measure = st.selectbox(
            "Adaptation measure",
            ["shade", "space_cooling", "exoskeleton", "combined"],
            format_func=lambda x: {
                "shade": "Shade",
                "space_cooling": "Space cooling",
                "exoskeleton": "Exoskeleton",
                "combined": "Combined package",
            }[x],
        )
    with a3:
        uptake_options = sorted(
            adapt_prov.loc[
                (adapt_prov["period_id"] == a_period)
                & (adapt_prov["measure"] == measure),
                "uptake",
            ].dropna().unique()
        )
        if not uptake_options:
            st.warning("No uptake scenarios are available for this selection.")
            return
        uptake = st.selectbox(
            "Uptake",
            uptake_options,
            index=min(1, len(uptake_options) - 1),
            format_func=lambda x: f"{int(round(100*x))}%",
        )

    ap = adapt_prov[
        (adapt_prov["period_id"] == a_period)
        & (adapt_prov["measure"] == measure)
        & (adapt_prov["uptake"] == uptake)
    ].copy()
    nat_match = adapt_nat[
        (adapt_nat["period_id"] == a_period)
        & (adapt_nat["measure"] == measure)
        & (adapt_nat["uptake"] == uptake)
    ]
    if ap.empty or nat_match.empty:
        st.warning("No adaptation results match the selected combination.")
        return
    nat = nat_match.iloc[0]

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("National avoided VA", f"€{nat['avoided_VA_loss_EUR_mean']/1e9:,.2f} bn")
    m2.metric("National avoided VA", f"{nat['avoided_VA_percent_mean']:,.1f}%")
    m3.metric("Avoided workers", f"{nat['avoided_workers_lost_mean']:,.0f}")
    m4.metric("Avoided workers", f"{nat['avoided_workers_percent_mean']:,.1f}%")

    af = px.choropleth(
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
            "adapted_VA_loss_EUR_mean": ":,.0f",
            "noadapt_VA_loss_EUR_mean": ":,.0f",
        },
        color_continuous_scale="Greens",
        labels={
            "avoided_VA_percent_mean": "Avoided VA (%)",
            "avoided_VA_loss_EUR_mean": "Avoided VA (€)",
            "adapted_VA_loss_EUR_mean": "Adapted VA loss (€)",
            "noadapt_VA_loss_EUR_mean": "No-adaptation VA loss (€)",
        },
    )
    af.update_geos(fitbounds="locations", visible=False)
    af.update_layout(height=650, margin=dict(l=0, r=0, t=20, b=0))
    st.plotly_chart(af, use_container_width=True)

    st.markdown("#### Dominant individual adaptation measure by province")
    st.caption(
        "Each province is assigned the stand-alone measure with the largest "
        "avoided value-added share at the selected period and uptake. This is "
        "not an additive decomposition of the combined package."
    )
    indiv = adapt_prov[
        (adapt_prov["period_id"] == a_period)
        & (adapt_prov["uptake"] == uptake)
        & (adapt_prov["measure"].isin(["shade", "space_cooling", "exoskeleton"]))
    ].copy()
    if not indiv.empty:
        idx = indiv.groupby("REF_AREA")["avoided_VA_percent_mean"].idxmax()
        dom = indiv.loc[idx, ["REF_AREA", "province_name", "measure", "avoided_VA_percent_mean"]].copy()
        label_map = {
            "shade": "Shade",
            "space_cooling": "Space cooling",
            "exoskeleton": "Exoskeleton",
        }
        dom["dominant_measure"] = dom["measure"].map(label_map)
        colors_cat = {
            "Shade": "#2E8B57",
            "Space cooling": "#377EB8",
            "Exoskeleton": "#E69F00",
        }
        dfig = go.Figure()
        for lab, color in colors_cat.items():
            sub = dom[dom["dominant_measure"] == lab]
            if sub.empty:
                continue
            dfig.add_trace(
                go.Choropleth(
                    geojson=geojson,
                    locations=sub["REF_AREA"],
                    z=[1] * len(sub),
                    featureidkey="properties.REF_AREA",
                    text=sub["province_name"],
                    customdata=sub[["avoided_VA_percent_mean"]],
                    hovertemplate=(
                        "<b>%{text}</b><br>"
                        + lab
                        + "<br>Avoided VA: %{customdata[0]:.1f}%"
                        + "<extra></extra>"
                    ),
                    colorscale=[[0, color], [1, color]],
                    showscale=False,
                    name=lab,
                    marker_line_color="white",
                    marker_line_width=0.5,
                )
            )
        dfig.update_geos(fitbounds="locations", visible=False)
        dfig.update_layout(
            height=600,
            margin=dict(l=0, r=0, t=20, b=0),
            legend_title_text="Largest stand-alone effect",
        )
        st.plotly_chart(dfig, use_container_width=True)

    st.markdown("#### Effectiveness by work intensity")
    ai = adapt_int[
        (adapt_int["period_id"] == a_period)
        & (adapt_int["measure"] == measure)
        & (adapt_int["uptake"] == uptake)
    ].copy()
    if not ai.empty:
        ai["Intensity"] = ai["work_intensity"].map(INTENSITY_LABELS).fillna(ai["work_intensity"])
        ib = px.bar(
            ai,
            x="Intensity",
            y="avoided_VA_percent_mean",
            color="Intensity",
            labels={"avoided_VA_percent_mean": "Avoided VA (%)", "Intensity": ""},
        )
        ib.update_layout(height=400, showlegend=False, margin=dict(l=0, r=0, t=20, b=0))
        st.plotly_chart(ib, use_container_width=True)

def data_notes():
    st.subheader("Data architecture and reproducibility notes")
    st.markdown(
        """
        **Economic microdata**
        - 274,568 observed province × ATECO5 × period cells
        - 103 harmonised economic provinces
        - 821 observed ATECO5 activities
        - four common climate periods, each based on 10 climate-model chains

        **Exposure architecture**
        - four work-intensity classes
        - activity-specific outdoor shares
        - indoor/shade and direct-sun loss functions evaluated separately
        - mixed exposure combines loss fractions rather than averaging WBGT before the non-linear function

        **Adaptation**
        - shade
        - space cooling
        - exoskeleton-assisted reduction in effective metabolic intensity
        - combined package
        - 25%, 50% and 75% uptake are stylised sensitivity scenarios, not adoption forecasts
        """
    )

try:
    if view == "ATECO5 micro explorer":
        micro_explorer()
    elif view == "Adaptation explorer":
        adaptation_explorer()
    else:
        data_notes()
except Exception as exc:
    st.error(
        "The selected view could not be rendered. Please reset the filters or reload the app."
    )
    st.exception(exc)
