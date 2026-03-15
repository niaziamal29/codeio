"""Tests for structured logging configuration."""

import json
import os
from unittest.mock import patch

import pytest
import structlog

from codeio.logging_config import (
    configure_logging,
    correlation_id_var,
    get_correlation_id,
    get_logger,
    set_correlation_id,
)


class TestCorrelationId:
    def setup_method(self):
        correlation_id_var.set("")

    def test_get_generates_id_when_empty(self):
        cid = get_correlation_id()
        assert len(cid) == 8
        # Subsequent calls return same ID
        assert get_correlation_id() == cid

    def test_set_correlation_id(self):
        set_correlation_id("test-123")
        assert get_correlation_id() == "test-123"

    def test_correlation_id_resets(self):
        set_correlation_id("first")
        assert get_correlation_id() == "first"
        set_correlation_id("second")
        assert get_correlation_id() == "second"


class TestConfigureLogging:
    def test_configure_development(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}, clear=False):
            configure_logging("DEBUG")
            log = get_logger("test")
            assert log is not None

    def test_configure_production(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}, clear=False):
            configure_logging("INFO")
            log = get_logger("test")
            assert log is not None

    def test_get_logger_returns_bound_logger(self):
        configure_logging()
        log = get_logger("my_module")
        assert hasattr(log, "info")
        assert hasattr(log, "error")
        assert hasattr(log, "warning")
        assert hasattr(log, "debug")
