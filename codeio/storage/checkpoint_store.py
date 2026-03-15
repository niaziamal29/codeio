"""CheckpointStore — persists checkpoint and session state in Redis.

Redis key structure:
  session:{session_id}:state      -> JSON session state
  session:{session_id}:checkpoints -> sorted set of checkpoint IDs by timestamp
  checkpoint:{checkpoint_id}      -> JSON checkpoint data
  session:{session_id}:messages   -> list of agent messages
"""

import json
import logging
import os
import time
from dataclasses import asdict, dataclass
from typing import Optional

import redis.asyncio as redis

logger = logging.getLogger('codeio.checkpoint_store')

SESSION_TTL = 86400 * 7  # 7 days


@dataclass
class CheckpointRecord:
    """Persisted checkpoint record."""

    id: str
    session_id: str
    project_id: str
    summary: str
    files_changed: list[str]
    screenshot_url: Optional[str]
    qa_status: str  # "pending" | "passed" | "failed"
    git_commit_sha: str
    confidence: float
    suggested_next_steps: list[str]
    created_at: float  # Unix timestamp

    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, data: str) -> 'CheckpointRecord':
        """Deserialize from JSON string."""
        return cls(**json.loads(data))


@dataclass
class SessionState:
    """Persisted session state."""

    session_id: str
    project_id: str
    user_id: str
    status: str  # "idle" | "running" | "paused" | "complete" | "error"
    current_step: str
    checkpoint_count: int
    created_at: float
    updated_at: float

    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, data: str) -> 'SessionState':
        """Deserialize from JSON string."""
        return cls(**json.loads(data))


class CheckpointStore:
    """Async Redis-backed store for checkpoint and session state."""

    def __init__(self, redis_url: Optional[str] = None) -> None:
        """Initialize with Redis URL from parameter or REDIS_URL env var."""
        url = redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        self._redis = redis.from_url(url, decode_responses=True)

    async def close(self) -> None:
        """Close the Redis connection."""
        await self._redis.aclose()

    # --- Session State ---

    async def save_session(self, state: SessionState) -> None:
        """Save or update session state."""
        state.updated_at = time.time()
        key = f'session:{state.session_id}:state'
        await self._redis.set(key, state.to_json(), ex=SESSION_TTL)

    async def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get session state by ID."""
        key = f'session:{session_id}:state'
        data = await self._redis.get(key)
        if data is None:
            return None
        return SessionState.from_json(data)

    async def update_session_status(self, session_id: str, status: str) -> None:
        """Update just the status of a session."""
        state = await self.get_session(session_id)
        if state:
            state.status = status
            await self.save_session(state)

    async def delete_session(self, session_id: str) -> None:
        """Delete all data for a session."""
        keys = [
            f'session:{session_id}:state',
            f'session:{session_id}:checkpoints',
            f'session:{session_id}:messages',
        ]
        await self._redis.delete(*keys)

    # --- Checkpoints ---

    async def save_checkpoint(self, record: CheckpointRecord) -> None:
        """Save a checkpoint record and index it by session."""
        cp_key = f'checkpoint:{record.id}'
        idx_key = f'session:{record.session_id}:checkpoints'
        pipe = self._redis.pipeline()
        pipe.set(cp_key, record.to_json(), ex=SESSION_TTL)
        pipe.zadd(idx_key, {record.id: record.created_at})
        pipe.expire(idx_key, SESSION_TTL)
        await pipe.execute()
        logger.info('Saved checkpoint %s for session %s', record.id, record.session_id)

    async def get_checkpoint(self, checkpoint_id: str) -> Optional[CheckpointRecord]:
        """Get a checkpoint record by ID."""
        data = await self._redis.get(f'checkpoint:{checkpoint_id}')
        if data is None:
            return None
        return CheckpointRecord.from_json(data)

    async def list_checkpoints(self, session_id: str) -> list[CheckpointRecord]:
        """List all checkpoints for a session, ordered by creation time."""
        idx_key = f'session:{session_id}:checkpoints'
        cp_ids = await self._redis.zrange(idx_key, 0, -1)
        if not cp_ids:
            return []
        pipe = self._redis.pipeline()
        for cp_id in cp_ids:
            pipe.get(f'checkpoint:{cp_id}')
        results = await pipe.execute()
        return [
            CheckpointRecord.from_json(r) for r in results if r is not None
        ]

    async def update_checkpoint_qa_status(
        self, checkpoint_id: str, qa_status: str
    ) -> None:
        """Update the QA status of a checkpoint."""
        record = await self.get_checkpoint(checkpoint_id)
        if record:
            record.qa_status = qa_status
            await self._redis.set(
                f'checkpoint:{checkpoint_id}', record.to_json(), ex=SESSION_TTL
            )

    # --- Messages ---

    async def append_message(
        self, session_id: str, role: str, content: str
    ) -> None:
        """Append a message to the session's message log."""
        key = f'session:{session_id}:messages'
        msg = json.dumps({'role': role, 'content': content, 'ts': time.time()})
        pipe = self._redis.pipeline()
        pipe.rpush(key, msg)
        pipe.expire(key, SESSION_TTL)
        await pipe.execute()

    async def get_messages(self, session_id: str) -> list[dict]:
        """Get all messages for a session."""
        key = f'session:{session_id}:messages'
        raw = await self._redis.lrange(key, 0, -1)
        return [json.loads(m) for m in raw]
