"""Unit tests for the SDK settings endpoints.

Tests the GET /api/v1/users/settings/llm and GET /api/v1/users/settings/secrets
endpoints that allow SDK users to retrieve their SaaS credentials.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from openhands.app_server.user.sdk_settings_models import (
    LLMSettingsResponse,
    SecretsResponse,
)
from openhands.app_server.user.sdk_settings_router import (
    get_llm_settings,
    get_secrets,
)
from openhands.app_server.user.user_context import UserContext
from openhands.app_server.user.user_models import UserInfo
from openhands.sdk.secret import StaticSecret


def _make_user_context(
    *,
    user_id: str | None = 'test-user-id',
    user_info: UserInfo | None = None,
    secrets: dict | None = None,
    raise_on_get_info: bool = False,
    raise_on_get_secrets: bool = False,
) -> UserContext:
    """Create a mock UserContext."""
    mock = MagicMock(spec=UserContext)
    mock.get_user_id = AsyncMock(return_value=user_id)

    if raise_on_get_info:
        mock.get_user_info = AsyncMock(side_effect=Exception('DB error'))
    else:
        mock.get_user_info = AsyncMock(return_value=user_info)

    if raise_on_get_secrets:
        mock.get_secrets = AsyncMock(side_effect=Exception('DB error'))
    else:
        mock.get_secrets = AsyncMock(return_value=secrets or {})

    return mock


@pytest.mark.asyncio
class TestGetLLMSettings:
    """Test suite for GET /api/v1/users/settings/llm."""

    async def test_returns_llm_settings_with_all_fields(self):
        """Test successful retrieval of LLM settings with model, key, and base URL."""
        user_info = UserInfo(
            id='test-user-id',
            llm_model='anthropic/claude-sonnet-4-20250514',
            llm_api_key=SecretStr('sk-test-key-123'),
            llm_base_url='https://litellm.example.com',
        )
        user_context = _make_user_context(user_info=user_info)

        result = await get_llm_settings(user_context=user_context)

        assert isinstance(result, LLMSettingsResponse)
        assert result.model == 'anthropic/claude-sonnet-4-20250514'
        assert result.api_key == 'sk-test-key-123'
        assert result.base_url == 'https://litellm.example.com'

    async def test_returns_llm_settings_with_no_api_key(self):
        """Test LLM settings when no API key is configured."""
        user_info = UserInfo(
            id='test-user-id',
            llm_model='gpt-4o',
            llm_api_key=None,
            llm_base_url=None,
        )
        user_context = _make_user_context(user_info=user_info)

        result = await get_llm_settings(user_context=user_context)

        assert result.model == 'gpt-4o'
        assert result.api_key is None
        assert result.base_url is None

    async def test_returns_401_when_not_authenticated(self):
        """Test endpoint returns 401 when user is not authenticated."""
        user_context = _make_user_context(user_id=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_llm_settings(user_context=user_context)

        assert exc_info.value.status_code == 401
        assert 'not authenticated' in exc_info.value.detail.lower()

    async def test_returns_500_on_internal_error(self):
        """Test endpoint returns 500 when an internal error occurs."""
        user_context = _make_user_context(
            user_id='test-user-id',
            raise_on_get_info=True,
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_llm_settings(user_context=user_context)

        assert exc_info.value.status_code == 500


@pytest.mark.asyncio
class TestGetSecrets:
    """Test suite for GET /api/v1/users/settings/secrets."""

    async def test_returns_all_secrets(self):
        """Test successful retrieval of all secrets."""
        secrets = {
            'GITHUB_TOKEN': StaticSecret(
                value=SecretStr('ghp_test123'),
                description='GitHub personal access token',
            ),
            'MY_API_KEY': StaticSecret(
                value=SecretStr('my-api-key-value'),
                description='Custom API key',
            ),
        }
        user_context = _make_user_context(secrets=secrets)

        result = await get_secrets(names=None, user_context=user_context)

        assert isinstance(result, SecretsResponse)
        assert len(result.secrets) == 2
        secret_names = {s.name for s in result.secrets}
        assert 'GITHUB_TOKEN' in secret_names
        assert 'MY_API_KEY' in secret_names

        gh_secret = next(s for s in result.secrets if s.name == 'GITHUB_TOKEN')
        assert gh_secret.value == 'ghp_test123'
        assert gh_secret.description == 'GitHub personal access token'

    async def test_returns_filtered_secrets(self):
        """Test filtering secrets by name."""
        secrets = {
            'GITHUB_TOKEN': StaticSecret(
                value=SecretStr('ghp_test123'),
                description='GitHub token',
            ),
            'MY_API_KEY': StaticSecret(
                value=SecretStr('my-api-key-value'),
                description='Custom API key',
            ),
            'ANOTHER_SECRET': StaticSecret(
                value=SecretStr('another-value'),
                description='Another secret',
            ),
        }
        user_context = _make_user_context(secrets=secrets)

        result = await get_secrets(
            names=['GITHUB_TOKEN', 'ANOTHER_SECRET'],
            user_context=user_context,
        )

        assert len(result.secrets) == 2
        secret_names = {s.name for s in result.secrets}
        assert 'GITHUB_TOKEN' in secret_names
        assert 'ANOTHER_SECRET' in secret_names
        assert 'MY_API_KEY' not in secret_names

    async def test_returns_empty_when_no_secrets(self):
        """Test empty response when user has no secrets."""
        user_context = _make_user_context(secrets={})

        result = await get_secrets(names=None, user_context=user_context)

        assert isinstance(result, SecretsResponse)
        assert len(result.secrets) == 0

    async def test_returns_empty_when_filtered_names_not_found(self):
        """Test empty response when filtered names don't match any secrets."""
        secrets = {
            'GITHUB_TOKEN': StaticSecret(
                value=SecretStr('ghp_test123'),
            ),
        }
        user_context = _make_user_context(secrets=secrets)

        result = await get_secrets(
            names=['NONEXISTENT_SECRET'],
            user_context=user_context,
        )

        assert len(result.secrets) == 0

    async def test_skips_secrets_with_none_value(self):
        """Test that secrets with None values are not included."""
        secrets = {
            'VALID_SECRET': StaticSecret(
                value=SecretStr('valid-value'),
            ),
            'EMPTY_SECRET': StaticSecret(
                value=None,
            ),
        }
        user_context = _make_user_context(secrets=secrets)

        result = await get_secrets(names=None, user_context=user_context)

        assert len(result.secrets) == 1
        assert result.secrets[0].name == 'VALID_SECRET'

    async def test_returns_401_when_not_authenticated(self):
        """Test endpoint returns 401 when user is not authenticated."""
        user_context = _make_user_context(user_id=None)

        with pytest.raises(HTTPException) as exc_info:
            await get_secrets(names=None, user_context=user_context)

        assert exc_info.value.status_code == 401

    async def test_returns_500_on_internal_error(self):
        """Test endpoint returns 500 when an internal error occurs."""
        user_context = _make_user_context(
            user_id='test-user-id',
            raise_on_get_secrets=True,
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_secrets(names=None, user_context=user_context)

        assert exc_info.value.status_code == 500

    async def test_secret_description_is_optional(self):
        """Test that secrets without descriptions have None description."""
        secrets = {
            'NO_DESC_SECRET': StaticSecret(
                value=SecretStr('some-value'),
            ),
        }
        user_context = _make_user_context(secrets=secrets)

        result = await get_secrets(names=None, user_context=user_context)

        assert len(result.secrets) == 1
        assert result.secrets[0].name == 'NO_DESC_SECRET'
        assert result.secrets[0].value == 'some-value'
        assert result.secrets[0].description is None
