"""Error-handling helpers for ``QueryEngine`` methods."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable


def wrap_value_errors(func: Callable[..., Any]) -> Callable[..., Any]:
    """Wrap a method so that ``ValueError`` becomes an error dict.

    Analysis functions signal "not found" conditions by raising
    ``ValueError``. This decorator converts that into the standard
    ``{"error": True, "message": <str>}`` response shape used across the
    engine, removing the repetitive ``try/except ValueError`` blocks.
    """

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return func(*args, **kwargs)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    return wrapper
