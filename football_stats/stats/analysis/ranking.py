"""Simple ranking functions (value_counts based)."""

import pandas as pd


def most_countries(results: pd.DataFrame, top_n: int = 20) -> list:
    """Top N countries by number of matches hosted."""
    if results.empty:
        return []
    counts = results["country"].value_counts().head(top_n)
    return [{"country": country, "matches": int(c)} for country, c in counts.items()]


def most_cities(results: pd.DataFrame, top_n: int = 20) -> list:
    """Top N cities by number of matches hosted."""
    if results.empty:
        return []
    counts = results["city"].value_counts().head(top_n)
    return [{"city": city, "matches": int(c)} for city, c in counts.items()]
