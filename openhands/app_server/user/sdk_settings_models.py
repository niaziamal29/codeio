"""Models for SDK settings API endpoints.

These models define the request/response shapes for the SDK settings API,
which allows SDK users to retrieve their SaaS credentials (LLM config, secrets)
for use in custom agent configurations.
"""

from pydantic import BaseModel, Field


class LLMSettingsResponse(BaseModel):
    """Response model for LLM settings.

    Returns the user's LLM configuration from their SaaS account,
    suitable for constructing an SDK LLM instance.
    """

    model: str | None = Field(
        default=None, description='The LLM model name (e.g., claude-sonnet-4-20250514)'
    )
    api_key: str | None = Field(
        default=None, description='The LLM API key (BYOR key for SDK usage)'
    )
    base_url: str | None = Field(default=None, description='The LLM API base URL')


class SecretItem(BaseModel):
    """A single secret with name, value, and optional description."""

    name: str = Field(description='The secret name/key')
    value: str = Field(description='The secret value')
    description: str | None = Field(
        default=None, description='Optional description of the secret'
    )


class SecretsResponse(BaseModel):
    """Response model for user secrets."""

    secrets: list[SecretItem] = Field(
        default_factory=list, description='List of user secrets'
    )
