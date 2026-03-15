"""Sentry error tracking configuration.

Call init_sentry() at application startup to enable error tracking.
Requires SENTRY_DSN environment variable to be set.
"""

import os
import logging

logger = logging.getLogger(__name__)


def init_sentry(
    service_name: str = "agent-core",
    traces_sample_rate: float = 0.1,
) -> bool:
    """Initialize Sentry SDK for error tracking.

    Args:
        service_name: Name tag for this service.
        traces_sample_rate: Fraction of transactions to sample (0.0 - 1.0).

    Returns:
        True if Sentry was initialized, False if SENTRY_DSN is not set.
    """
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        logger.info("SENTRY_DSN not set, skipping Sentry initialization")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=traces_sample_rate,
            environment=os.getenv("ENVIRONMENT", "development"),
            release=os.getenv("RELEASE_VERSION", "dev"),
            server_name=service_name,
            integrations=[
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR,
                ),
            ],
            # Don't send PII
            send_default_pii=False,
        )
        logger.info("Sentry initialized for %s", service_name)
        return True
    except ImportError:
        logger.warning("sentry-sdk not installed, skipping Sentry initialization")
        return False
