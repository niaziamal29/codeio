"""Unit tests for the sandbox settings endpoints.

Tests the sandbox-scoped endpoints authenticated via X-Session-API-Key:
- GET /api/v1/sandboxes/{sandbox_id}/settings/llm
- GET /api/v1/sandboxes/{sandbox_id}/settings/llm-key
- GET /api/v1/sandboxes/{sandbox_id}/settings/secrets
- GET /api/v1/sandboxes/{sandbox_id}/settings/secrets/{secret_name}
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from openhands.app_server.sandbox.sandbox_models import SandboxInfo, SandboxStatus
from openhands.app_server.user.sdk_settings_models import (
    LLMSettingsResponse,
    SecretNamesResponse,
)
from openhands.app_server.user.sdk_settings_router import (
    get_llm_key,
    get_llm_settings,
    get_secret_value,
    list_secret_names,
)
from openhands.app_server.user.user_models import UserInfo
from openhands.sdk.secret import StaticSecret

SANDBOX_ID = 'sb-test-123'
USER_ID = 'test-user-id'


def _make_sandbox_info(
    sandbox_id: str = SANDBOX_ID,
    user_id: str | None = USER_ID,
) -> SandboxInfo:
    return SandboxInfo(
        id=sandbox_id,
        created_by_user_id=user_id,
        sandbox_spec_id='test-spec',
        status=SandboxStatus.RUNNING,
        session_api_key='session-key',
    )


def _make_mock_request(
    sandbox_id: str = SANDBOX_ID,
    session_api_key: str = 'session-key',
) -> MagicMock:
    request = MagicMock()
    request.base_url = 'http://testserver/'
    request.headers = {'X-Session-API-Key': session_api_key}
    return request


@pytest.mark.asyncio
class TestGetLLMSettings:
    """Test suite for GET /sandboxes/{sandbox_id}/settings/llm."""

    async def test_returns_llm_settings_with_lookup_secret(self):
        """api_key is a LookupSecret dict pointing to /llm-key."""
        user_info = UserInfo(
            id=USER_ID,
            llm_model='anthropic/claude-sonnet-4-20250514',
            llm_api_key=SecretStr('sk-test-key-123'),
            llm_base_url='https://litellm.example.com',
        )
        sandbox_info = _make_sandbox_info()
        request = _make_mock_request()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_user_info = AsyncMock(return_value=user_info)
            mock_ctx.return_value = ctx

            result = await get_llm_settings(
                request=request,
                sandbox_id=SANDBOX_ID,
                sandbox_info=sandbox_info,
            )

        assert isinstance(result, LLMSettingsResponse)
        assert result.model == 'anthropic/claude-sonnet-4-20250514'
        assert result.base_url == 'https://litellm.example.com'

        # api_key should be a LookupSecret dict, NOT the raw key
        assert result.api_key is not None
        assert result.api_key['kind'] == 'LookupSecret'
        assert f'/sandboxes/{SANDBOX_ID}/settings/llm-key' in result.api_key['url']
        assert result.api_key['headers']['X-Session-API-Key'] == 'session-key'

    async def test_returns_none_api_key_when_not_configured(self):
        """api_key is None when user has no LLM key configured."""
        user_info = UserInfo(
            id=USER_ID,
            llm_model='gpt-4o',
            llm_api_key=None,
        )
        sandbox_info = _make_sandbox_info()
        request = _make_mock_request()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_user_info = AsyncMock(return_value=user_info)
            mock_ctx.return_value = ctx

            result = await get_llm_settings(
                request=request,
                sandbox_id=SANDBOX_ID,
                sandbox_info=sandbox_info,
            )

        assert result.model == 'gpt-4o'
        assert result.api_key is None


@pytest.mark.asyncio
class TestGetLLMKey:
    """Test suite for GET /sandboxes/{sandbox_id}/settings/llm-key."""

    async def test_returns_raw_api_key(self):
        """Raw API key returned as plain text."""
        user_info = UserInfo(
            id=USER_ID,
            llm_api_key=SecretStr('sk-actual-secret-key'),
        )
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_user_info = AsyncMock(return_value=user_info)
            mock_ctx.return_value = ctx

            response = await get_llm_key(sandbox_info=sandbox_info)

        assert response.body == b'sk-actual-secret-key'
        assert response.media_type == 'text/plain'

    async def test_returns_404_when_no_key(self):
        """404 when no LLM API key is configured."""
        user_info = UserInfo(id=USER_ID, llm_api_key=None)
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_user_info = AsyncMock(return_value=user_info)
            mock_ctx.return_value = ctx

            with pytest.raises(HTTPException) as exc_info:
                await get_llm_key(sandbox_info=sandbox_info)

        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
class TestListSecretNames:
    """Test suite for GET /sandboxes/{sandbox_id}/settings/secrets."""

    async def test_returns_secret_names_without_values(self):
        """Response contains names and descriptions, NOT raw values."""
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
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_secrets = AsyncMock(return_value=secrets)
            mock_ctx.return_value = ctx

            result = await list_secret_names(sandbox_info=sandbox_info)

        assert isinstance(result, SecretNamesResponse)
        assert len(result.secrets) == 2
        names = {s.name for s in result.secrets}
        assert 'GITHUB_TOKEN' in names
        assert 'MY_API_KEY' in names

        gh = next(s for s in result.secrets if s.name == 'GITHUB_TOKEN')
        assert gh.description == 'GitHub personal access token'
        # Verify no 'value' field is exposed
        assert not hasattr(gh, 'value')

    async def test_returns_empty_when_no_secrets(self):
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_secrets = AsyncMock(return_value={})
            mock_ctx.return_value = ctx

            result = await list_secret_names(sandbox_info=sandbox_info)

        assert len(result.secrets) == 0


@pytest.mark.asyncio
class TestGetSecretValue:
    """Test suite for GET /sandboxes/{sandbox_id}/settings/secrets/{name}."""

    async def test_returns_raw_secret_value(self):
        """Raw secret value returned as plain text."""
        secrets = {
            'GITHUB_TOKEN': StaticSecret(
                value=SecretStr('ghp_actual_secret'),
                description='GitHub token',
            ),
        }
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_secrets = AsyncMock(return_value=secrets)
            mock_ctx.return_value = ctx

            response = await get_secret_value(
                secret_name='GITHUB_TOKEN',
                sandbox_info=sandbox_info,
            )

        assert response.body == b'ghp_actual_secret'
        assert response.media_type == 'text/plain'

    async def test_returns_404_for_unknown_secret(self):
        """404 when requested secret doesn't exist."""
        secrets = {}
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_secrets = AsyncMock(return_value=secrets)
            mock_ctx.return_value = ctx

            with pytest.raises(HTTPException) as exc_info:
                await get_secret_value(
                    secret_name='NONEXISTENT',
                    sandbox_info=sandbox_info,
                )

        assert exc_info.value.status_code == 404

    async def test_returns_404_for_none_value_secret(self):
        """404 when secret exists but has None value."""
        secrets = {
            'EMPTY_SECRET': StaticSecret(value=None),
        }
        sandbox_info = _make_sandbox_info()

        with patch(
            'openhands.app_server.user.sdk_settings_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_secrets = AsyncMock(return_value=secrets)
            mock_ctx.return_value = ctx

            with pytest.raises(HTTPException) as exc_info:
                await get_secret_value(
                    secret_name='EMPTY_SECRET',
                    sandbox_info=sandbox_info,
                )

        assert exc_info.value.status_code == 404
