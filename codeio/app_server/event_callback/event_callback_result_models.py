from datetime import datetime
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from codeio.agent_server.utils import CodeioUUID, utc_now
from codeio.sdk.event.types import EventID


class EventCallbackResultStatus(Enum):
    SUCCESS = 'SUCCESS'
    ERROR = 'ERROR'


class EventCallbackResultSortOrder(Enum):
    CREATED_AT = 'CREATED_AT'
    CREATED_AT_DESC = 'CREATED_AT_DESC'


class EventCallbackResult(BaseModel):
    """Object representing the result of an event callback."""

    id: CodeioUUID = Field(default_factory=uuid4)
    status: EventCallbackResultStatus
    event_callback_id: CodeioUUID
    event_id: EventID
    conversation_id: CodeioUUID
    detail: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class EventCallbackResultPage(BaseModel):
    items: list[EventCallbackResult]
    next_page_id: str | None = None
