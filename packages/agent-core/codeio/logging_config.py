"""Structured logging configuration using structlog.

All Python services should call configure_logging() at startup.
Outputs JSON in production, colored console output in development.
"""

import logging
import os
import sys
import uuid
from contextvars import ContextVar

import structlog

# Correlation ID context variable — flows through async call chains
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Get current correlation ID, generating one if absent."""
    cid = correlation_id_var.get()
    if not cid:
        cid = str(uuid.uuid4())[:8]
        correlation_id_var.set(cid)
    return cid


def set_correlation_id(cid: str) -> None:
    """Set correlation ID (e.g., from an incoming HTTP header)."""
    correlation_id_var.set(cid)


def add_correlation_id(
    logger: logging.Logger, method_name: str, event_dict: dict
) -> dict:
    """Structlog processor to inject correlation_id into every log entry."""
    event_dict["correlation_id"] = get_correlation_id()
    return event_dict


def add_service_context(
    logger: logging.Logger, method_name: str, event_dict: dict
) -> dict:
    """Add service name and environment to every log entry."""
    event_dict["service"] = os.getenv("SERVICE_NAME", "agent-core")
    event_dict["env"] = os.getenv("ENVIRONMENT", "development")
    return event_dict


def configure_logging(level: str = "INFO") -> None:
    """Configure structlog for the application.

    In production (ENVIRONMENT=production), outputs JSON.
    In development, outputs colored console output.
    """
    is_production = os.getenv("ENVIRONMENT") == "production"

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        add_correlation_id,
        add_service_context,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if is_production:
        shared_processors.append(structlog.processors.JSONRenderer())
    else:
        shared_processors.append(
            structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())
        )

    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Also configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stderr,
        level=getattr(logging, level.upper()),
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a named structured logger."""
    return structlog.get_logger(name)
