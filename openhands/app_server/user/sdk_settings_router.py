"""Router for sandbox settings API endpoints.

Provides endpoints for agent-servers inside sandboxes to retrieve the
owning user's SaaS secrets on demand, authenticated via
``X-Session-API-Key`` (sandbox-scoped).

Endpoints
---------
GET /sandboxes/{sandbox_id}/settings/secrets
    List of available secret names (no values).
GET /sandboxes/{sandbox_id}/settings/secrets/{secret_name}
    Raw secret value (plain text).  Called by ``LookupSecret`` inside sandbox.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import APIKeyHeader

from openhands.app_server.config import get_sandbox_service
from openhands.app_server.sandbox.sandbox_models import SandboxInfo
from openhands.app_server.services.injector import InjectorState
from openhands.app_server.user.auth_user_context import AuthUserContext
from openhands.app_server.user.sdk_settings_models import (
    SecretNameItem,
    SecretNamesResponse,
)
from openhands.app_server.user.specifiy_user_context import (
    ADMIN,
    USER_CONTEXT_ATTR,
)
from openhands.server.types import AppMode
from openhands.server.user_auth.user_auth import (
    get_for_user as get_user_auth_for_user,
)

_logger = logging.getLogger(__name__)

router = APIRouter(prefix='/sandboxes/{sandbox_id}/settings', tags=['Sandbox Settings'])


# ---------------------------------------------------------------------------
# Auth dependency: validate X-Session-API-Key → sandbox → user
# ---------------------------------------------------------------------------
async def _valid_sandbox_from_session_key(
    request: Request,
    sandbox_id: str,
    session_api_key: str = Depends(
        APIKeyHeader(name='X-Session-API-Key', auto_error=False)
    ),
) -> SandboxInfo:
    """Authenticate via ``X-Session-API-Key`` and verify sandbox ownership.

    Sets the user context on ``request.state`` so downstream helpers can
    build an ``AuthUserContext`` for the sandbox owner.
    """
    if not session_api_key:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail='X-Session-API-Key header is required',
        )

    state = InjectorState()
    setattr(state, USER_CONTEXT_ATTR, ADMIN)

    async with get_sandbox_service(state) as sandbox_service:
        sandbox_info = await sandbox_service.get_sandbox_by_session_api_key(
            session_api_key
        )

    if sandbox_info is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail='Invalid session API key'
        )

    # The sandbox_id in the URL must match the sandbox found by session key
    if sandbox_info.id != sandbox_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail='Session API key does not match sandbox',
        )

    if not sandbox_info.created_by_user_id:
        from openhands.app_server.config import get_global_config

        if get_global_config().app_mode == AppMode.SAAS:
            _logger.error(
                'Sandbox had no user specified',
                extra={'sandbox_id': sandbox_info.id},
            )
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail='Sandbox had no user specified',
            )

    return sandbox_info


async def _get_user_context(sandbox_info: SandboxInfo) -> AuthUserContext:
    """Build an ``AuthUserContext`` for the sandbox owner."""
    assert sandbox_info.created_by_user_id
    user_auth = await get_user_auth_for_user(sandbox_info.created_by_user_id)
    return AuthUserContext(user_auth=user_auth)


# ---------------------------------------------------------------------------
# GET /sandboxes/{sandbox_id}/settings/secrets
# ---------------------------------------------------------------------------
@router.get('/secrets')
async def list_secret_names(
    sandbox_info: SandboxInfo = Depends(_valid_sandbox_from_session_key),
) -> SecretNamesResponse:
    """List available secret names (no raw values).

    The SDK client uses this to discover which secrets are available, then
    constructs ``LookupSecret`` references for each one.
    """
    user_context = await _get_user_context(sandbox_info)
    secret_sources = await user_context.get_secrets()

    items = [
        SecretNameItem(name=name, description=source.description)
        for name, source in secret_sources.items()
    ]
    return SecretNamesResponse(secrets=items)


# ---------------------------------------------------------------------------
# GET /sandboxes/{sandbox_id}/settings/secrets/{secret_name}
# ---------------------------------------------------------------------------
@router.get('/secrets/{secret_name}')
async def get_secret_value(
    secret_name: str,
    sandbox_info: SandboxInfo = Depends(_valid_sandbox_from_session_key),
) -> Response:
    """Return a single secret value as plain text.

    This endpoint is called by the ``LookupSecret`` embedded in the
    conversation's secret registry — it runs **inside the sandbox**.
    """
    user_context = await _get_user_context(sandbox_info)
    secret_sources = await user_context.get_secrets()

    source = secret_sources.get(secret_name)
    if source is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Secret not found')

    value = source.get_value()
    if value is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Secret has no value')

    return Response(content=value, media_type='text/plain')
