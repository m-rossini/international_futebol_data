"""Helper modules extracted from ``stats/engine.py``.

These hold the engine-owned logic that is not a thin delegation to the
``analysis`` package: team-name resolution, ELO merging, shootout
enrichment, and match-goalscorer reconstruction. ``QueryEngine`` remains
the public facade and delegates to these helpers.
"""

from .elo_merge import merge_elo
from .matching import match_goalscorers
from .resolution import resolve_team_name, teams_set
from .shootout import enrich_shootouts

__all__ = [
    "merge_elo",
    "match_goalscorers",
    "resolve_team_name",
    "teams_set",
    "enrich_shootouts",
]
