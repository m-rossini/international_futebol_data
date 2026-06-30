"""
Shared logging configuration for the entire application.

Usage:
    from .log import logger
    logger.info("Data loaded: %d rows", n)
"""

import json
import logging
import os
import sys

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.json")

_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}

_DEFAULT_LEVEL = logging.INFO

# ANSI colour codes
_RESET = "\033[0m"
_COLORS = {
    "DEBUG": "\033[38;5;244m",  # grey
    "INFO": "\033[38;5;40m",  # green
    "WARNING": "\033[38;5;214m",  # orange
    "ERROR": "\033[38;5;196m",  # red
    "CRITICAL": "\033[38;5;196;1m",  # bold red
}


class _ColouredFormatter(logging.Formatter):
    """Log formatter that adds ANSI colour depending on log level."""

    def __init__(self, *args, use_color: bool = True, **kwargs):
        super().__init__(*args, **kwargs)
        self._use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        levelname = record.levelname
        if self._use_color:
            color = _COLORS.get(levelname, _RESET)
            record.levelname = f"{color}{levelname}{_RESET}"
        else:
            color = ""
        msg = super().format(record)
        # Append structured extras (source=cache, etc.)
        extras = getattr(record, "_structured", {})
        suffix = "".join(f" {k}={v}" for k, v in extras.items())
        if self._use_color:
            return f"{color}{msg}{_RESET}{suffix}"
        return f"{msg}{suffix}"


class _ExtrasFilter(logging.Filter):
    """Append any extra fields passed via logger.debug(..., extra={...})."""

    _SKIP = {
        "name",
        "msg",
        "args",
        "levelname",
        "levelno",
        "pathname",
        "filename",
        "module",
        "exc_info",
        "exc_text",
        "stack_info",
        "lineno",
        "funcName",
        "created",
        "msecs",
        "relativeCreated",
        "thread",
        "threadName",
        "processName",
        "process",
        "message",
        "asctime",
    }

    def filter(self, record: logging.LogRecord) -> bool:
        extras = {
            k: v
            for k, v in record.__dict__.items()
            if k not in self._SKIP and not k.startswith("_")
        }
        if extras:
            record._structured = extras  # type: ignore[attr-defined]
        return True


def _load_level_from_config() -> int:
    try:
        if os.path.exists(_CONFIG_PATH):
            with open(_CONFIG_PATH) as f:
                cfg = json.load(f)
            name = cfg.get("log_level", "INFO").upper()
            return _LEVELS.get(name, _DEFAULT_LEVEL)
    except Exception:
        pass
    return _DEFAULT_LEVEL


def _supports_color() -> bool:
    """Check whether the output stream supports ANSI colour codes."""
    if not sys.stdout.isatty():
        return False
    term = os.environ.get("TERM", "")
    if "dumb" in term.lower():
        return False
    return True


def _setup_logger(name: str) -> logging.Logger:
    level = _load_level_from_config()
    use_color = _supports_color()

    fmt = _ColouredFormatter(
        "[%(asctime)s] %(levelname)-7s %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        use_color=use_color,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(fmt)
    handler.addFilter(_ExtrasFilter())

    logger = logging.getLogger(name)
    logger.setLevel(level)
    if not logger.handlers:
        logger.addHandler(handler)
    return logger


# Root application logger – use from everywhere
logger = _setup_logger("football_stats")


# Convenience: child loggers inherit from the root
def get_logger(child: str) -> logging.Logger:
    return logging.getLogger(f"football_stats.{child}")
