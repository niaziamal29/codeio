"""Models for sandbox settings API endpoints.

These models define the response shapes for the sandbox settings API,
which allows agent-servers inside sandboxes to retrieve the owning user's
secrets on demand.

Authentication is via X-Session-API-Key (sandbox-scoped).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SecretNameItem(BaseModel):
    """A secret's name and optional description (value NOT included)."""

    name: str = Field(description='The secret name/key')
    description: str | None = Field(
        default=None, description='Optional description of the secret'
    )


class SecretNamesResponse(BaseModel):
    """Response listing available secret names (no raw values)."""

    secrets: list[SecretNameItem] = Field(
        default_factory=list, description='Available secrets'
    )
