from pathlib import Path
import pandas as pd
import streamlit as st

st.set_page_config(page_title="Heat Stress Italy Explorer", page_icon="🌡️", layout="wide")
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
    "REF_AREA", "province_name", "period_id", "period_label", "sector_code",
    "sector_description", "VA_BRANCH_11", "VA_BRANCH_11_DESC", "work_intensity",
    "outdoor_share_main", "VA_allocated_EUR", "addetti",
    "VA_loss_EUR_mixed_main", "workers_lost_mixed_main",
    "VA_loss_EUR_combined_adapt_50", "workers_lost_combined_adapt_50",
    "VA_avoided_EUR_combined_adapt_50", "VA_loss_EUR_combined_adapt_75",
    "workers_lost_combined_adapt_75", "VA_avoided_EUR_combined_adapt_75",
]

@st.cache_data(show_spinner="Loading model outputs…")
def load_micro():
    df = pd.read_csv(
        DATA / "ATECO5_province_P1_P4_micro_results.csv.gz",
        compression="gzip",
        usecols=MICRO_COLS,
        dtype={"REF_AREA": str, "sector_code": str},
    )
    df["sector_code"] = df["sector_code"].str.zfill(5)
    df["exposure_label"] = df["outdoor_share_main"].round(2).map(EXPOSURE_LABELS).fillna("Other")
    return df

@st.cache_data(show_spinner=False)
def load_adaptation():
    prov = pd.read_csv(DATA / "ensemble_province_adaptation_losses.csv", dtype={"REF_AREA": str})
    nat = pd.read_csv(DATA / "ensemble_national_adaptation_losses.csv")
    intensity = pd.read_csv(DATA / "ensemble_national_intensity_adaptation.csv")
    return prov, nat, intensity

micro = load_micro()
adapt_prov, adapt_nat, adapt_int = load_adaptation()

st.title("Heat stress, labour productivity and value-added losses across Italian provinces")
st.caption("Lightweight diagnostic interface · 103 provinces · 821 ATECO5 activities · P1–P4")

view = st.radio(
    "Dashboard section",
    ["ATECO5 explorer", "Adaptation explorer", "Data notes"],
    horizontal=True,
)

if view == "ATECO5 explorer":
    c1, c2 = st.columns(2)
    with c1:
        period = st.selectbox("Climate period", PERIOD_ORDER, index=3, format_func=lambda x: PERIOD_LABELS[x])
    with c2:
        scenario = st.selectbox("Scenario", ["No adaptation", "Combined 50%", "Combined 75%"])

    f1, f2, f3 = st.columns(3)
    with f1:
        intensities = st.multiselect("Work intensity", list(INTENSITY_LABELS), format_func=lambda x: INTENSITY_LABELS[x])
    with f2:
        exposures = st.multiselect("Exposure class", list(EXPOSURE_LABELS.values()))
    with f3:
        branch_values = sorted(micro["VA_BRANCH_11"].dropna().astype(str).unique())
        branches = st.multiselect("Economic branch code", branch_values)

    df = micro[micro["period_id"] == period]
    if intensities:
        df = df[df["work_intensity"].isin(intensities)]
    if exposures:
        df = df[df["exposure_label"].isin(exposures)]
    if branches:
        df = df[df["VA_BRANCH_11"].astype(str).isin(branches)]

    ateco = df[["sector_code", "sector_description"]].drop_duplicates().sort_values("sector_code")
    options = ["All ATECO5"] + [f"{r.sector_code} · {r.sector_description}" for r in ateco.itertuples()]
    selected = st.selectbox("ATECO5 activity", options)
    if selected != "All ATECO5":
        df = df[df["sector_code"] == selected.split(" · ", 1)[0]]

    if df.empty:
        st.warning("No observations match the selected filters.")
        st.stop()

    if scenario == "No adaptation":
        va_col, worker_col = "VA_loss_EUR_mixed_main", "workers_lost_mixed_main"
    elif scenario == "Combined 50%":
        va_col, worker_col = "VA_loss_EUR_combined_adapt_50", "workers_lost_combined_adapt_50"
    else:
        va_col, worker_col = "VA_loss_EUR_combined_adapt_75", "workers_lost_combined_adapt_75"

    prov = df.groupby(["REF_AREA", "province_name"], as_index=False).agg(
        VA=("VA_allocated_EUR", "sum"),
        employment=("addetti", "sum"),
        VA_loss=(va_col, "sum"),
        workers_lost=(worker_col, "sum"),
    )
    prov["VA_loss_pct"] = 100 * prov["VA_loss"] / prov["VA"].replace(0, pd.NA)
    prov["worker_loss_pct"] = 100 * prov["workers_lost"] / prov["employment"].replace(0, pd.NA)

    total_va = prov["VA"].sum()
    total_emp = prov["employment"].sum()
    total_loss = prov["VA_loss"].sum()
    total_workers = prov["workers_lost"].sum()

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("VA loss", f"€{total_loss/1e9:,.2f} bn")
    k2.metric("VA loss intensity", f"{100*total_loss/total_va:,.2f}%")
    k3.metric("Equivalent workers lost", f"{total_workers:,.0f}")
    k4.metric("Worker loss intensity", f"{100*total_workers/total_emp:,.2f}%")

    st.subheader("Highest provincial loss intensities")
    ranking = prov.sort_values("VA_loss_pct", ascending=False).head(20).copy()
    st.bar_chart(ranking.set_index("province_name")["VA_loss_pct"], horizontal=True, width="stretch")
    st.dataframe(
        ranking[["province_name", "VA_loss", "VA_loss_pct", "workers_lost", "worker_loss_pct"]],
        width="stretch",
        hide_index=True,
    )

elif view == "Adaptation explorer":
    c1, c2, c3 = st.columns(3)
    with c1:
        period = st.selectbox("Climate period", PERIOD_ORDER, index=3, format_func=lambda x: PERIOD_LABELS[x], key="ap")
    with c2:
        measure = st.selectbox("Measure", ["shade", "space_cooling", "exoskeleton", "combined"])
    available = sorted(adapt_prov.loc[(adapt_prov["period_id"] == period) & (adapt_prov["measure"] == measure), "uptake"].dropna().unique())
    with c3:
        uptake = st.selectbox("Uptake", available, format_func=lambda x: f"{100*x:.0f}%")

    ap = adapt_prov[(adapt_prov["period_id"] == period) & (adapt_prov["measure"] == measure) & (adapt_prov["uptake"] == uptake)].copy()
    nat = adapt_nat[(adapt_nat["period_id"] == period) & (adapt_nat["measure"] == measure) & (adapt_nat["uptake"] == uptake)]
    if ap.empty or nat.empty:
        st.warning("No adaptation results are available for this selection.")
        st.stop()
    nat = nat.iloc[0]

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("National avoided VA", f"€{nat['avoided_VA_loss_EUR_mean']/1e9:,.2f} bn")
    k2.metric("Avoided VA", f"{nat['avoided_VA_percent_mean']:,.1f}%")
    k3.metric("Avoided workers", f"{nat['avoided_workers_lost_mean']:,.0f}")
    k4.metric("Avoided workers", f"{nat['avoided_workers_percent_mean']:,.1f}%")

    top = ap.sort_values("avoided_VA_percent_mean", ascending=False).head(20)
    st.subheader("Highest provincial avoided-loss shares")
    st.bar_chart(top.set_index("province_name")["avoided_VA_percent_mean"], horizontal=True, width="stretch")
    st.dataframe(
        top[["province_name", "avoided_VA_percent_mean", "avoided_VA_loss_EUR_mean", "adapted_VA_loss_EUR_mean"]],
        width="stretch",
        hide_index=True,
    )

else:
    st.markdown("""
    ### Data architecture
    - 274,568 province × ATECO5 × period observations
    - 103 harmonised economic provinces
    - 821 ATECO5 activities
    - four common climate periods (P1–P4)
    - adaptation scenarios for shade, cooling, exoskeletons and combined packages

    **Interpretation.** Equivalent workers lost represent full-time-equivalent productive capacity, not layoffs.
    Value-added losses are first-order accounting quantities, not causal or general-equilibrium GDP forecasts.

    This diagnostic build intentionally omits the interactive choropleth map. If section and filter changes remain
    stable, the map rendering layer—not the underlying data or calculations—is the source of the blank-screen issue.
    """)
