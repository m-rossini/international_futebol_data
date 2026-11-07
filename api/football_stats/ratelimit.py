"""In-process rate limiting for abusive usage.

Token-bucket / sliding-window rate limiter keyed by client IP and a named
group. Used both as a FastAPI middleware (HTTP) and directly by the MCP server
and Ask Me router.

Designed to be simple and dependency-free: a dict of per-(ip, group) buckets,
each holding timestamps of recent requests. A request is allowed when the bucket
has room; otherwise a ``Retry-After`` seconds hint is returned.

Notes
-----
* In-memory only: rate counters are lost on restart. That is acceptable for a
  single-container API behind nginx; for multi-node deployments a shared store
  (Redis) would be needed.
* Trusts ``X-Forwarded-For`` for the client IP because the API runs behind
  nginx. The web container's own IP (its server-side API proxy) is exempt so
  normal browsing is not throttled by the app's own calls.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Optional

# ---------------------------------------------------------------------------
#  Quotas (requests per window)
# ---------------------------------------------------------------------------
#
# Group          | rate          | burst   | used for
# --------------+---------------+---------+--------------------------------
# static         | 30 r/s        | 60      | web pages and static assets
# api            | 5 r/s         | 20      | general REST API endpoints
# expensive      | 6 r/min       | 3       | /simulate, /conversation (LLM/MC)
QUOTAS: dict[str, dict[str, float]] = {
    "static": {"rate": 30.0, "burst": 60, "window": 1.0},
    "api": {"rate": 5.0, "burst": 20, "window": 60.0},
    "expensive": {"rate": 6.0 / 60.0, "burst": 3, "window": 60.0},
}

# IPs whose own traffic should never be throttled (loopback, docker bridge).
EXEMPT_IPS: set[str] = {"127.0.0.1", "::1", "0.0.0.0"}

# Path prefixes that count as "expensive" (LLM + Monte Carlo).
EXPENSIVE_PREFIXES: tuple[str, ...] = ("/simulate", "/conversation")


class RateLimitExceeded(Exception):
    """Raised when a request exceeds its quota."""

    def __init__(self, retry_after: float):
        self.retry_after = retry_after
        super().__init__(f"rate limit exceeded, retry after {retry_after:.0f}s")


class RateLimiter:
    """Sliding-window rate limiter.

    ``allow(key)`` returns ``(allowed, retry_after)``. When not allowed,
    ``retry_after`` is the number of seconds the caller should wait.
    """

    def __init__(self, quotas: Optional[dict[str, dict[str, float]]] = None):
        self.quotas = quotas or QUOTAS
        # (ip, group) -> list of request timestamps (monotonic, seconds)
        self._buckets: dict[tuple[str, str], list[float]] = defaultdict(list)

    def _window(self, group: str) -> float:
        return self.quotas[group]["window"]

    def allow(self, ip: str, group: str = "api") -> tuple[bool, float]:
        """Return (allowed, retry_after_seconds)."""
        if ip in EXEMPT_IPS:
            return True, 0.0

        q = self.quotas.get(group)
        if q is None:
            return True, 0.0

        burst = int(q["burst"])  # max burst
        window = self._window(group)
        now = time.monotonic()
        key = (ip, group)

        # Prune timestamps outside the window.
        bucket = self._buckets[key]
        cutoff = now - window
        self._buckets[key] = [t for t in bucket if t > cutoff]
        bucket = self._buckets[key]

        if len(bucket) < burst:
            bucket.append(now)
            return True, 0.0

        # Bucket full: retry after the oldest request leaves the window.
        retry_after = bucket[0] + window - now
        if retry_after < 0:
            retry_after = 0.0
        return False, retry_after

    def reset(self, ip: Optional[str] = None, group: Optional[str] = None) -> None:
        """Clear buckets (mostly for tests)."""
        if ip is None and group is None:
            self._buckets.clear()
            return
        to_delete = [
            k
            for k in self._buckets
            if (ip is None or k[0] == ip) and (group is None or k[1] == group)
        ]
        for k in to_delete:
            del self._buckets[k]


# Single shared limiter used by the middleware, Ask Me and MCP.
limiter = RateLimiter()


def group_for_path(path: str) -> str:
    """Return the rate-limit group for a request path."""
    if any(path.startswith(p) for p in EXPENSIVE_PREFIXES):
        return "expensive"
    api_prefixes = (
        "/api/",
        "/team/",
        "/tournament/",
        "/city/",
        "/country/",
        "/most/",
        "/fifa-ranking/",
        "/elo-ranking/",
        "/llm/",
    )
    exact_api = {
        "/docs",
        "/openapi.json",
        "/version",
        "/health",
        "/filters",
        "/summary",
        "/releases",
        "/reload",
    }
    if path.startswith(api_prefixes) or path in exact_api:
        return "api"
    return "static"


def client_ip(request) -> str:
    """Best-effort client IP, trusting X-Forwarded-For behind nginx."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2 — take the leftmost.
        return forwarded.split(",")[0].strip()
    return getattr(request.client, "host", "unknown") or "unknown"
