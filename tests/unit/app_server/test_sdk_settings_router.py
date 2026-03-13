"""Unit tests for the sandbox settings endpoints and /users/me expose_secrets.

Tests:
- GET /api/v1/users/me?expose_secrets=true
- GET /api/v1/sandboxes/{sandbox_id}/settings/secrets
- GET /api/v1/sandboxes/{sandbox_id}/settings/secrets/{secret_name}
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from openhands.app_server.sandbox.sandbox_models import SandboxInfo, SandboxStatus
from openhands.app_server.user.sdk_settings_models import (
    SecretNamesResponse,
)
from openhands.app_server.user.sdk_settings_router import (
    get_secret_value,
    list_secret_names,
)
from openhands.app_server.user.user_models import UserInfo
from openhands.app_server.user.user_router import get_current_user
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


@pytest.mark.asyncio
class TestGetCurrentUserExposeSecrets:
    """Test suite for GET /users/me?expose_secrets=true."""

    async def test_expose_secrets_returns_raw_api_key(self):
        """With valid session key, expose_secrets=true returns unmasked llm_api_key."""
        user_info = UserInfo(
            id=USER_ID,
            llm_model='anthropic/claude-sonnet-4-20250514',
            llm_api_key=SecretStr('sk-test-key-123'),
            llm_base_url='https://litellm.example.com',
        )
        mock_context = AsyncMock()
        mock_context.get_user_info = AsyncMock(return_value=user_info)
        mock_context.get_user_id = AsyncMock(return_value=USER_ID)

        with patch(
            'openhands.app_server.user.user_router._validate_session_key_ownership'
        ) as mock_validate:
            mock_validate.return_value = None
            result = await get_current_user(
                user_context=mock_context,
                expose_secrets=True,
                x_session_api_key='valid-key',
            )

        # JSONResponse — parse the body
        import json

        body = json.loads(result.body)
        assert body['llm_model'] == 'anthropic/claude-sonnet-4-20250514'
        assert body['llm_api_key'] == 'sk-test-key-123'
        assert body['llm_base_url'] == 'https://litellm.example.com'

    async def test_expose_secrets_rejects_missing_session_key(self):
        """expose_secrets=true without X-Session-API-Key is rejected."""
        user_info = UserInfo(id=USER_ID, llm_api_key=SecretStr('sk-key'))
        mock_context = AsyncMock()
        mock_context.get_user_info = AsyncMock(return_value=user_info)

        from openhands.app_server.user.user_router import (
            _validate_session_key_ownership,
        )

        with pytest.raises(HTTPException) as exc_info:
            await _validate_session_key_ownership(mock_context, session_api_key=None)
        assert exc_info.value.status_code == 401
        assert 'X-Session-API-Key' in exc_info.value.detail

    async def test_expose_secrets_rejects_wrong_user(self):
        """expose_secrets=true with session key from different user is rejected."""
        mock_context = AsyncMock()
        mock_context.get_user_id = AsyncMock(return_value='user-A')

        other_user_sandbox = _make_sandbox_info(user_id='user-B')

        with (
            patch(
                'openhands.app_server.user.user_router.get_sandbox_service'
            ) as mock_svc,
            pytest.raises(HTTPException) as exc_info,
        ):
            mock_sandbox_service = AsyncMock()
            mock_sandbox_service.get_sandbox_by_session_api_key = AsyncMock(
                return_value=other_user_sandbox
            )
            mock_svc.return_value.__aenter__ = AsyncMock(
                return_value=mock_sandbox_service
            )
            mock_svc.return_value.__aexit__ = AsyncMock(return_value=False)

            from openhands.app_server.user.user_router import (
                _validate_session_key_ownership,
            )

            await _validate_session_key_ownership(
                mock_context, session_api_key='stolen-key'
            )

        assert exc_info.value.status_code == 403

    async def test_default_masks_api_key(self):
        """Without expose_secrets, llm_api_key is masked (no session key needed)."""
        user_info = UserInfo(
            id=USER_ID,
            llm_api_key=SecretStr('sk-test-key-123'),
        )
        mock_context = AsyncMock()
        mock_context.get_user_info = AsyncMock(return_value=user_info)

        result = await get_current_user(
            user_context=mock_context, expose_secrets=False, x_session_api_key=None
        )

        # Returns UserInfo directly (FastAPI will serialize with masking)
        assert isinstance(result, UserInfo)
        assert result.llm_api_key is not None
        # The raw value is still in the object, but serialization masks it
        dumped = result.model_dump(mode='json')
        assert dumped['llm_api_key'] == '**********'


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
