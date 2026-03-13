"""Models for sandbox settings API endpoints.

These models define the response shapes for the sandbox settings API,
which allows agent-servers running inside sandboxes to retrieve the
owning user's SaaS credentials (LLM config, secrets) on demand.

Authentication is via X-Session-API-Key (sandbox-scoped), so raw secret
values never transit through the SDK client.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LLMSettingsResponse(BaseModel):
    """LLM configuration with the API key replaced by a LookupSecret reference.

    The ``api_key`` field is a serialised ``LookupSecret`` dict
    (``{"kind": "LookupSecret", "url": "…", "headers": {…}}``).
    The SDK deserialises it into a real ``LookupSecret`` that the
    agent-server resolves lazily when making LLM calls.
    """

    model: str | None = Field(
        default=None, description='The LLM model name (e.g., claude-sonnet-4-20250514)'
    )
    api_key: dict[str, Any] | None = Field(
        default=None,
        description=(
            'A serialised LookupSecret dict. The agent-server inside the sandbox '
            'resolves this to the actual API key by calling the embedded URL.'
        ),
    )
    base_url: str | None = Field(default=None, description='The LLM API base URL')


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
