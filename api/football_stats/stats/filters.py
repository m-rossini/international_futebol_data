"""Filtering support for analysis endpoints.

Provides a ``FilterParams`` class that can be used either as a plain
dataclass or as a FastAPI dependency via ``Depends()``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import pandas as pd


# ---------------------------------------------------------------------------
#  Hard-coded FIFA confederation -> country mapping
#  Keys are exact country names as they appear in the ``results`` CSV.
#  Values are the six official FIFA confederation codes.
#  A few common name variants (e.g. "Ireland" / "Republic of Ireland") are
#  listed as separate keys so either spelling filters correctly.
# ---------------------------------------------------------------------------

_COUNTRIES_BY_CONFEDERATION: dict[str, str] = {
    # UEFA — Europe (55 members)
    "Albania": "UEFA",
    "Andorra": "UEFA",
    "Armenia": "UEFA",
    "Austria": "UEFA",
    "Azerbaijan": "UEFA",
    "Belarus": "UEFA",
    "Belgium": "UEFA",
    "Bosnia and Herzegovina": "UEFA",
    "Bulgaria": "UEFA",
    "Croatia": "UEFA",
    "Cyprus": "UEFA",
    "Czech Republic": "UEFA",
    "Denmark": "UEFA",
    "England": "UEFA",
    "Estonia": "UEFA",
    "Faroe Islands": "UEFA",
    "Finland": "UEFA",
    "France": "UEFA",
    "Georgia": "UEFA",
    "Germany": "UEFA",
    "Gibraltar": "UEFA",
    "Greece": "UEFA",
    "Hungary": "UEFA",
    "Iceland": "UEFA",
    "Ireland": "UEFA",
    "Israel": "UEFA",
    "Italy": "UEFA",
    "Kazakhstan": "UEFA",
    "Kosovo": "UEFA",
    "Latvia": "UEFA",
    "Liechtenstein": "UEFA",
    "Lithuania": "UEFA",
    "Luxembourg": "UEFA",
    "Malta": "UEFA",
    "Moldova": "UEFA",
    "Montenegro": "UEFA",
    "Netherlands": "UEFA",
    "North Macedonia": "UEFA",
    "Northern Ireland": "UEFA",
    "Norway": "UEFA",
    "Poland": "UEFA",
    "Portugal": "UEFA",
    "Romania": "UEFA",
    "Russia": "UEFA",
    "San Marino": "UEFA",
    "Scotland": "UEFA",
    "Serbia": "UEFA",
    "Slovakia": "UEFA",
    "Slovenia": "UEFA",
    "Spain": "UEFA",
    "Sweden": "UEFA",
    "Switzerland": "UEFA",
    "Turkey": "UEFA",
    "Ukraine": "UEFA",
    "Wales": "UEFA",
    # CONMEBOL — South America (10 members)
    "Argentina": "CONMEBOL",
    "Bolivia": "CONMEBOL",
    "Brazil": "CONMEBOL",
    "Chile": "CONMEBOL",
    "Colombia": "CONMEBOL",
    "Ecuador": "CONMEBOL",
    "Paraguay": "CONMEBOL",
    "Peru": "CONMEBOL",
    "Uruguay": "CONMEBOL",
    "Venezuela": "CONMEBOL",
    # CONCACAF — North / Central America / Caribbean (41 members)
    "Anguilla": "CONCACAF",
    "Antigua and Barbuda": "CONCACAF",
    "Aruba": "CONCACAF",
    "Bahamas": "CONCACAF",
    "Barbados": "CONCACAF",
    "Belize": "CONCACAF",
    "Bermuda": "CONCACAF",
    "Bonaire": "CONCACAF",
    "British Virgin Islands": "CONCACAF",
    "Canada": "CONCACAF",
    "Cayman Islands": "CONCACAF",
    "Costa Rica": "CONCACAF",
    "Cuba": "CONCACAF",
    "Curaçao": "CONCACAF",
    "Dominica": "CONCACAF",
    "Dominican Republic": "CONCACAF",
    "El Salvador": "CONCACAF",
    "French Guiana": "CONCACAF",
    "Grenada": "CONCACAF",
    "Guadeloupe": "CONCACAF",
    "Guatemala": "CONCACAF",
    "Guyana": "CONCACAF",
    "Haiti": "CONCACAF",
    "Honduras": "CONCACAF",
    "Jamaica": "CONCACAF",
    "Martinique": "CONCACAF",
    "Mexico": "CONCACAF",
    "Montserrat": "CONCACAF",
    "Nicaragua": "CONCACAF",
    "Panama": "CONCACAF",
    "Puerto Rico": "CONCACAF",
    "Saint Kitts and Nevis": "CONCACAF",
    "Saint Lucia": "CONCACAF",
    "Saint Martin": "CONCACAF",
    "Saint Vincent and the Grenadines": "CONCACAF",
    "Sint Maarten": "CONCACAF",
    "Suriname": "CONCACAF",
    "Trinidad and Tobago": "CONCACAF",
    "Turks and Caicos Islands": "CONCACAF",
    "United States": "CONCACAF",
    "US Virgin Islands": "CONCACAF",
    # CAF — Africa (54 members)
    "Algeria": "CAF",
    "Angola": "CAF",
    "Benin": "CAF",
    "Botswana": "CAF",
    "Burkina Faso": "CAF",
    "Burundi": "CAF",
    "Cameroon": "CAF",
    "Cape Verde": "CAF",
    "Central African Republic": "CAF",
    "Chad": "CAF",
    "Comoros": "CAF",
    "Congo": "CAF",
    "DR Congo": "CAF",
    "Djibouti": "CAF",
    "Egypt": "CAF",
    "Equatorial Guinea": "CAF",
    "Eritrea": "CAF",
    "Eswatini": "CAF",
    "Ethiopia": "CAF",
    "Gabon": "CAF",
    "Gambia": "CAF",
    "Ghana": "CAF",
    "Guinea": "CAF",
    "Guinea-Bissau": "CAF",
    "Ivory Coast": "CAF",
    "Kenya": "CAF",
    "Lesotho": "CAF",
    "Liberia": "CAF",
    "Libya": "CAF",
    "Madagascar": "CAF",
    "Malawi": "CAF",
    "Mali": "CAF",
    "Mauritania": "CAF",
    "Mauritius": "CAF",
    "Morocco": "CAF",
    "Mozambique": "CAF",
    "Namibia": "CAF",
    "Niger": "CAF",
    "Nigeria": "CAF",
    "Rwanda": "CAF",
    "São Tomé and Príncipe": "CAF",
    "Senegal": "CAF",
    "Seychelles": "CAF",
    "Sierra Leone": "CAF",
    "Somalia": "CAF",
    "South Africa": "CAF",
    "South Sudan": "CAF",
    "Sudan": "CAF",
    "Tanzania": "CAF",
    "Togo": "CAF",
    "Tunisia": "CAF",
    "Uganda": "CAF",
    "Zambia": "CAF",
    "Zimbabwe": "CAF",
    # AFC — Asia (47 members)
    "Afghanistan": "AFC",
    "Australia": "AFC",
    "Bahrain": "AFC",
    "Bangladesh": "AFC",
    "Bhutan": "AFC",
    "Brunei": "AFC",
    "Cambodia": "AFC",
    "China": "AFC",
    "Chinese Taipei": "AFC",
    "Guam": "AFC",
    "Hong Kong": "AFC",
    "India": "AFC",
    "Indonesia": "AFC",
    "Iran": "AFC",
    "Iraq": "AFC",
    "Japan": "AFC",
    "Jordan": "AFC",
    "Kuwait": "AFC",
    "Kyrgyzstan": "AFC",
    "Laos": "AFC",
    "Lebanon": "AFC",
    "Macau": "AFC",
    "Malaysia": "AFC",
    "Maldives": "AFC",
    "Mongolia": "AFC",
    "Myanmar": "AFC",
    "Nepal": "AFC",
    "North Korea": "AFC",
    "Northern Mariana Islands": "AFC",
    "Oman": "AFC",
    "Pakistan": "AFC",
    "Palestine": "AFC",
    "Philippines": "AFC",
    "Qatar": "AFC",
    "Saudi Arabia": "AFC",
    "Singapore": "AFC",
    "South Korea": "AFC",
    "Sri Lanka": "AFC",
    "Syria": "AFC",
    "Tajikistan": "AFC",
    "Thailand": "AFC",
    "Timor-Leste": "AFC",
    "Turkmenistan": "AFC",
    "United Arab Emirates": "AFC",
    "Uzbekistan": "AFC",
    "Vietnam": "AFC",
    "Yemen": "AFC",
    # OFC — Oceania (14 members, incl. associate members)
    "American Samoa": "OFC",
    "Cook Islands": "OFC",
    "Fiji": "OFC",
    "Kiribati": "OFC",
    "New Caledonia": "OFC",
    "New Zealand": "OFC",
    "Niue": "OFC",
    "Papua New Guinea": "OFC",
    "Samoa": "OFC",
    "Solomon Islands": "OFC",
    "Tahiti": "OFC",
    "Tonga": "OFC",
    "Tuvalu": "OFC",
    "Vanuatu": "OFC",
}

# Alternate spellings used by different datasets -> the canonical member name
# above. These are accepted when matching teams but are NOT counted as extra
# members, so UEFA still reports 55 nations rather than 56.
_COUNTRY_ALIASES: dict[str, str] = {
    "Republic of Ireland": "Ireland",
    "Côte d'Ivoire": "Ivory Coast",
    "Taiwan": "Chinese Taipei",
    "UAE": "United Arab Emirates",
    "Burma": "Myanmar",
    "United States Virgin Islands": "US Virgin Islands",
}

# Inverted index: confederation -> canonical member names (for display)
_CONFEDERATION_COUNTRIES: dict[str, list[str]] = {}
for country, confed in _COUNTRIES_BY_CONFEDERATION.items():
    _CONFEDERATION_COUNTRIES.setdefault(confed, []).append(country)

# Inverted index: confederation -> every name that matches, aliases included
_CONFEDERATION_TEAMS: dict[str, set[str]] = {
    confed: set(countries) for confed, countries in _CONFEDERATION_COUNTRIES.items()
}
for alias, canonical in _COUNTRY_ALIASES.items():
    _CONFEDERATION_TEAMS[_COUNTRIES_BY_CONFEDERATION[canonical]].add(alias)

# Ordered list of confederation codes for consistent output ordering
CONFEDERATION_ORDER = ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]


# ---------------------------------------------------------------------------
#  FilterParams
# ---------------------------------------------------------------------------


@dataclass
class FilterParams:
    """Filter parameters for analysis queries.

    All fields are optional. ``None`` (or absent) means no filter on that
    dimension. ``teams``, ``tournaments``, ``countries`` and ``confederations``
    are lists that use an **OR**-within, **AND**-across semantics::

        matches AND (tournament IN tournaments)
                AND (country IN countries)          -- host country
                AND (home_team OR away_team IN confederations)
                AND (date >= date_from)
                AND (date <= date_to)

    ``countries`` filters on the *host* country of a match; ``confederations``
    filters on the *teams* playing in it.
    """

    teams: Optional[list[str]] = field(default=None)
    tournaments: Optional[list[str]] = field(default=None)
    countries: Optional[list[str]] = field(default=None)
    confederations: Optional[list[str]] = field(default=None)
    date_from: Optional[str] = field(default=None)
    date_to: Optional[str] = field(default=None)

    @property
    def is_empty(self) -> bool:
        """Return True if all filter fields are None (no filtering applied)."""
        return (
            self.teams is None
            and self.tournaments is None
            and self.countries is None
            and self.confederations is None
            and self.date_from is None
            and self.date_to is None
        )

    def describe(self) -> str:
        """Human-readable summary of the active filters."""
        parts = []
        if self.teams:
            parts.append(f"teams={', '.join(self.teams)}")
        if self.tournaments:
            parts.append(f"tournaments={', '.join(self.tournaments)}")
        if self.countries:
            parts.append(f"countries={', '.join(self.countries)}")
        if self.confederations:
            parts.append(f"confederations={', '.join(self.confederations)}")
        if self.date_from:
            parts.append(f"date_from={self.date_from}")
        if self.date_to:
            parts.append(f"date_to={self.date_to}")
        return " ".join(parts) if parts else "no filter"


# ---------------------------------------------------------------------------
#  Confederation helpers
# ---------------------------------------------------------------------------


def _confederation_teams(confederations: list[str]) -> set[str]:
    """Resolve confederation codes to every team name that belongs to them."""
    teams: set[str] = set()
    for confed in confederations:
        teams.update(_CONFEDERATION_TEAMS.get(confed.strip().upper(), ()))
    return teams


def _filter_by_confederation(
    df: pd.DataFrame, confederations: list[str]
) -> pd.DataFrame:
    """Keep matches involving a national team from one of ``confederations``.

    The ``country`` column in the results CSV is the *host* country of a match,
    which is already covered by ``FilterParams.countries``. A confederation is
    therefore derived from the two teams playing, not from where they played.
    """
    if not confederations:
        return df

    teams = _confederation_teams(confederations)
    if not teams or "home_team" not in df.columns or "away_team" not in df.columns:
        return df

    mask = df["home_team"].isin(teams) | df["away_team"].isin(teams)
    return df[mask]


def get_countries_by_confederation(confederation: str) -> list[str]:
    """Return the canonical member countries of a given confederation."""
    return _CONFEDERATION_COUNTRIES.get(confederation.strip().upper(), [])


def get_teams_by_confederation(confederation: str) -> list[str]:
    """Return every team name the filter matches, dataset aliases included."""
    return sorted(_CONFEDERATION_TEAMS.get(confederation.strip().upper(), set()))


def get_confederation_for_country(country: str) -> Optional[str]:
    """Return the confederation code for a country name (or alias), if known."""
    canonical = _COUNTRY_ALIASES.get(country, country)
    return _COUNTRIES_BY_CONFEDERATION.get(canonical)


def list_all_confederations() -> list[dict]:
    """Return all confederations with their member countries and matchable teams.

    ``countries`` is the canonical FIFA membership list (used for display and
    counting); ``teams`` additionally contains dataset-specific spellings that
    the filter accepts (e.g. ``Republic of Ireland`` for ``Ireland``).
    """
    return [
        {
            "name": confed,
            "count": len(_CONFEDERATION_COUNTRIES.get(confed, [])),
            "countries": _CONFEDERATION_COUNTRIES.get(confed, []),
            "teams": sorted(_CONFEDERATION_TEAMS.get(confed, set())),
        }
        for confed in CONFEDERATION_ORDER
    ]


# ---------------------------------------------------------------------------
#  apply_filters
# ---------------------------------------------------------------------------


def apply_filters(df: pd.DataFrame, filters: Optional[FilterParams]) -> pd.DataFrame:
    """Apply ``filters`` to the results DataFrame.

    Returns a **new** DataFrame (copy) -- the original is never mutated.
    If ``filters`` is ``None`` the original frame is returned unchanged.
    """
    if filters is None:
        return df

    result = df.copy()

    if filters.teams:
        result = result[
            result["home_team"].isin(filters.teams)
            | result["away_team"].isin(filters.teams)
        ]

    if filters.tournaments:
        result = result[result["tournament"].isin(filters.tournaments)]

    if filters.countries:
        result = result[result["country"].isin(filters.countries)]

    if filters.confederations:
        result = _filter_by_confederation(result, filters.confederations)

    if filters.date_from:
        result = result[result["date"] >= pd.Timestamp(filters.date_from)]

    if filters.date_to:
        result = result[result["date"] <= pd.Timestamp(filters.date_to)]

    return result
