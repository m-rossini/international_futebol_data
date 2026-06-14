"""City-level analysis — thin wrapper over GeographyStats."""

from .geography import GeographyStats

_geo = GeographyStats(group_col="city", label="city")


def cities_list(results) -> list:
    return _geo.list_all(results, extra_aggs={
        "country": ("country", lambda x: x.mode().iloc[0] if len(x.mode()) else None),
    })


def city_info(results, city: str, top_n: int = 10) -> dict:
    def _add_tournament(bw, row):
        bw["tournament"] = row["tournament"]
        return bw

    base = _geo.info(results, city, top_n, post_process_biggest=_add_tournament)

    # Add the country at the top level
    city_name = base["city"]
    from .enrich import strip_accents

    name_key = strip_accents(city_name).lower()
    mask = results["city"].apply(lambda x: strip_accents(x).lower()) == name_key
    df = results[mask]
    country = df["country"].mode().iloc[0] if not df.empty else None
    base["country"] = country
    return base
