"""Country-level analysis — thin wrapper over GeographyStats with extra fields."""

import pandas as pd

from .geography import GeographyStats

_geo = GeographyStats(group_col="country", label="country")


def countries_list(results) -> list:
    return _geo.list_all(
        results,
        extra_aggs={
            "cities": ("city", pd.Series.nunique),
        },
    )


def country_info(results, country: str, top_n: int = 10) -> dict:
    from .enrich import strip_accents

    name_key = strip_accents(country).lower()
    mask = results["country"].apply(lambda x: strip_accents(x).lower()) == name_key
    df = results[mask].copy()

    unique_cities = int(df["city"].nunique()) if not df.empty else 0
    top_10_cities = (
        df["city"].value_counts().head(top_n) if not df.empty else pd.Series(dtype=int)
    )

    def _add_city_and_tournament(bw, row):
        bw["tournament"] = row["tournament"]
        bw["city"] = row["city"]
        return bw

    return _geo.info(
        results,
        country,
        top_n,
        extra_summary={
            "unique_cities": unique_cities,
            "top_cities": [
                {"city": c, "matches": int(m)} for c, m in top_10_cities.items()
            ],
        },
        post_process_biggest=_add_city_and_tournament,
    )
