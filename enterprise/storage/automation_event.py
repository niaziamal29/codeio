from __future__ import annotations

from sqlalchemy import BigInteger, Column, DateTime, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from storage.base import Base

_JsonType = JSON().with_variant(JSONB(), 'postgresql')


class AutomationEvent(Base):  # type: ignore
    """Model for storing raw automation trigger events."""

    __tablename__ = 'automation_events'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_type = Column(String, nullable=False)
    payload = Column(_JsonType, nullable=False)
    metadata_ = Column('metadata', _JsonType, nullable=True)
    dedup_key = Column(String, nullable=False, unique=True)
    status = Column(String, nullable=False, server_default=text("'NEW'"))
    error_detail = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=text('CURRENT_TIMESTAMP'),
        nullable=False,
    )
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('dedup_key', name='uq_automation_events_dedup'),
        Index(
            'ix_automation_events_new',
            'created_at',
            postgresql_where=text("status = 'NEW'"),
        ),
    )
