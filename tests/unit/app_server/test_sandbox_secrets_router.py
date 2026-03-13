"""Unit tests for the sandbox settings endpoints and /users/me expose_secrets.

Tests:
- GET /api/v1/users/me?expose_secrets=true
- GET /api/v1/sandboxes/{sandbox_id}/settings/secrets
- GET /api/v1/sandboxes/{sandbox_id}/settings/secrets/{secret_name}
- Shared session_auth.validate_session_key()
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from openhands.app_server.sandbox.sandbox_models import (
    SandboxInfo,
    SandboxStatus,
    SecretNamesResponse,
)
from openhands.app_server.sandbox.sandbox_router import (
    get_secret_value,
    list_secret_names,
)
from openhands.app_server.sandbox.session_auth import validate_session_key
from openhands.app_server.user.user_models import UserInfo
from openhands.app_server.user.user_router import (
    _validate_session_key_ownership,
    get_current_user,
)
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


def _patch_sandbox_service(return_sandbox: SandboxInfo | None):
    """Patch ``get_sandbox_service`` in ``session_auth`` to return a mock service."""
    mock_sandbox_service = AsyncMock()
    mock_sandbox_service.get_sandbox_by_session_api_key = AsyncMock(
        return_value=return_sandbox
    )
    ctx = patch(
        'openhands.app_server.sandbox.session_auth.get_sandbox_service',
    )
    return ctx, mock_sandbox_service


# ---------------------------------------------------------------------------
# validate_session_key (shared utility)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestValidateSessionKey:
    """Tests for the shared session_auth.validate_session_key utility."""

    async def test_rejects_missing_key(self):
        """Missing session key raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            await validate_session_key(None)
        assert exc_info.value.status_code == 401
        assert 'X-Session-API-Key' in exc_info.value.detail

    async def test_rejects_empty_string_key(self):
        """Empty string session key raises 401."""
        with pytest.raises(HTTPException) as exc_info:
            await validate_session_key('')
        assert exc_info.value.status_code == 401

    async def test_rejects_invalid_key(self):
        """Session key that maps to no sandbox raises 401."""
        ctx, mock_svc = _patch_sandbox_service(None)
        with ctx as mock_get:
            mock_get.return_value.__aenter__ = AsyncMock(return_value=mock_svc)
            mock_get.return_value.__aexit__ = AsyncMock(return_value=False)

            with pytest.raises(HTTPException) as exc_info:
                await validate_session_key('bogus-key')
        assert exc_info.value.status_code == 401
        assert 'Invalid session API key' in exc_info.value.detail

    async def test_accepts_valid_key(self):
        """Valid session key returns sandbox info."""
        sandbox = _make_sandbox_info()
        ctx, mock_svc = _patch_sandbox_service(sandbox)
        with ctx as mock_get:
            mock_get.return_value.__aenter__ = AsyncMock(return_value=mock_svc)
            mock_get.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await validate_session_key('valid-key')
        assert result.id == SANDBOX_ID

    async def test_rejects_sandbox_without_user_in_saas_mode(self):
        """In SAAS mode, sandbox without created_by_user_id raises 401."""
        sandbox = _make_sandbox_info(user_id=None)
        ctx, mock_svc = _patch_sandbox_service(sandbox)
        with (
            ctx as mock_get,
            patch(
                'openhands.app_server.sandbox.session_auth.get_global_config'
            ) as mock_cfg,
        ):
            mock_get.return_value.__aenter__ = AsyncMock(return_value=mock_svc)
            mock_get.return_value.__aexit__ = AsyncMock(return_value=False)

            from openhands.server.types import AppMode

            mock_cfg.return_value.app_mode = AppMode.SAAS

            with pytest.raises(HTTPException) as exc_info:
                await validate_session_key('valid-key')
        assert exc_info.value.status_code == 401
        assert 'no user' in exc_info.value.detail


# ---------------------------------------------------------------------------
# GET /users/me?expose_secrets=true
# ---------------------------------------------------------------------------


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
        mock_context = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await _validate_session_key_ownership(mock_context, session_api_key=None)
        assert exc_info.value.status_code == 401
        assert 'X-Session-API-Key' in exc_info.value.detail

    async def test_expose_secrets_rejects_wrong_user(self):
        """expose_secrets=true with session key from different user is rejected."""
        mock_context = AsyncMock()
        mock_context.get_user_id = AsyncMock(return_value='user-A')

        other_user_sandbox = _make_sandbox_info(user_id='user-B')

        ctx, mock_svc = _patch_sandbox_service(other_user_sandbox)
        with ctx as mock_get, pytest.raises(HTTPException) as exc_info:
            mock_get.return_value.__aenter__ = AsyncMock(return_value=mock_svc)
            mock_get.return_value.__aexit__ = AsyncMock(return_value=False)

            await _validate_session_key_ownership(
                mock_context, session_api_key='stolen-key'
            )

        assert exc_info.value.status_code == 403

    async def test_expose_secrets_rejects_unknown_caller(self):
        """If caller_id cannot be determined, reject with 401."""
        mock_context = AsyncMock()
        mock_context.get_user_id = AsyncMock(return_value=None)

        sandbox = _make_sandbox_info(user_id='user-B')

        ctx, mock_svc = _patch_sandbox_service(sandbox)
        with ctx as mock_get, pytest.raises(HTTPException) as exc_info:
            mock_get.return_value.__aenter__ = AsyncMock(return_value=mock_svc)
            mock_get.return_value.__aexit__ = AsyncMock(return_value=False)

            await _validate_session_key_ownership(
                mock_context, session_api_key='some-key'
            )

        assert exc_info.value.status_code == 401
        assert 'Cannot determine authenticated user' in exc_info.value.detail

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


# ---------------------------------------------------------------------------
# GET /sandboxes/{sandbox_id}/settings/secrets
# ---------------------------------------------------------------------------


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
            'openhands.app_server.sandbox.sandbox_router._get_user_context'
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
            'openhands.app_server.sandbox.sandbox_router._get_user_context'
        ) as mock_ctx:
            ctx = AsyncMock()
            ctx.get_secrets = AsyncMock(return_value={})
            mock_ctx.return_value = ctx

            result = await list_secret_names(sandbox_info=sandbox_info)

        assert len(result.secrets) == 0


# ---------------------------------------------------------------------------
# GET /sandboxes/{sandbox_id}/settings/secrets/{name}
# ---------------------------------------------------------------------------


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
            'openhands.app_server.sandbox.sandbox_router._get_user_context'
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
            'openhands.app_server.sandbox.sandbox_router._get_user_context'
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
            'openhands.app_server.sandbox.sandbox_router._get_user_context'
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
