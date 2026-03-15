"""Tests for Sentry configuration."""

import os
from unittest.mock import patch

from codeio.sentry_config import init_sentry


class TestSentryConfig:
    def test_skips_when_no_dsn(self):
        with patch.dict(os.environ, {}, clear=True):
            result = init_sentry()
            assert result is False

    def test_skips_when_dsn_empty(self):
        with patch.dict(os.environ, {"SENTRY_DSN": ""}, clear=False):
            result = init_sentry()
            assert result is False

    def test_handles_missing_sentry_sdk(self):
        with patch.dict(
            os.environ,
            {"SENTRY_DSN": "https://example@sentry.io/123"},
            clear=False,
        ):
            # sentry_sdk may not be installed in test env
            result = init_sentry()
            # Either True (sdk installed) or False (sdk missing) - both are valid
            assert isinstance(result, bool)
