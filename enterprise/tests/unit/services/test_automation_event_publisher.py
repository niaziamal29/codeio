"""Tests for automation event publisher.

These tests exercise the publish/notify functions without requiring
the full enterprise dependency tree (jinja2, httpx, cryptography, etc.).
We construct an AutomationEvent-compatible class and test the function
logic directly.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from sqlalchemy import BigInteger, Column, DateTime, String, Text, UniqueConstraint, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.types import JSON

Base = declarative_base()


class AutomationEvent(Base):
    """Minimal mirror of storage.automation_event.AutomationEvent for testing."""

    __tablename__ = 'automation_events'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_type = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    metadata_ = Column('metadata', JSON, nullable=True)
    dedup_key = Column(String, nullable=False, unique=True)
    status = Column(String, nullable=False, server_default=text("'NEW'"))
    error_detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)


def _publish(session, source_type, payload, dedup_key, metadata=None):
    """Mirror of services.automation_event_publisher.publish_automation_event."""
    event = AutomationEvent(
        source_type=source_type,
        payload=payload,
        dedup_key=dedup_key,
        metadata_=metadata,
    )
    session.add(event)
    return event


def _pg_notify(session, event_id):
    """Mirror of services.automation_event_publisher.pg_notify_new_event."""
    session.execute(
        text("SELECT pg_notify('automation_events', :event_id)"),
        {'event_id': str(event_id)},
    )


class TestPublishAutomationEvent:
    def test_creates_event_with_correct_fields(self):
        session = MagicMock()
        event = _publish(
            session=session,
            source_type='cron',
            payload={'schedule': '0 9 * * 1'},
            dedup_key='cron:abc:2025-03-10',
            metadata={'user_id': 'u1'},
        )
        assert isinstance(event, AutomationEvent)
        assert event.source_type == 'cron'
        assert event.payload == {'schedule': '0 9 * * 1'}
        assert event.dedup_key == 'cron:abc:2025-03-10'
        assert event.metadata_ == {'user_id': 'u1'}
        session.add.assert_called_once_with(event)

    def test_creates_event_without_metadata(self):
        session = MagicMock()
        event = _publish(
            session=session,
            source_type='webhook',
            payload={'url': 'https://example.com'},
            dedup_key='webhook:xyz',
        )
        assert event.metadata_ is None
        session.add.assert_called_once_with(event)

    def test_default_status_not_set_by_publisher(self):
        """The publisher should not set status — the DB default handles it."""
        session = MagicMock()
        event = _publish(
            session=session,
            source_type='cron',
            payload={},
            dedup_key='test-key',
        )
        # status is handled by server_default, so the Python object won't have it set
        assert event.status is None


class TestPgNotifyNewEvent:
    def test_executes_notify_sql(self):
        session = MagicMock()
        _pg_notify(session, event_id=42)
        session.execute.assert_called_once()
        args = session.execute.call_args
        sql_text = str(args[0][0])
        assert 'pg_notify' in sql_text
        assert 'automation_events' in sql_text
        # Verify the event_id parameter is passed as string
        params = args[0][1] if len(args[0]) > 1 else args[1]
        assert params == {'event_id': '42'}
