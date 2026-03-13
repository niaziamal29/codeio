"""Router for sandbox settings API endpoints.

Provides endpoints for agent-servers inside sandboxes to retrieve the
owning user's SaaS credentials on demand, authenticated via
``X-Session-API-Key`` (sandbox-scoped).

Endpoints
---------
GET /sandboxes/{sandbox_id}/settings/llm
    Full LLM config with ``api_key`` replaced by a ``LookupSecret`` dict.
GET /sandboxes/{sandbox_id}/settings/llm-key
    Raw LLM API key (plain text).  Called by ``LookupSecret`` inside sandbox.
GET /sandboxes/{sandbox_id}/settings/secrets
    List of available secret names (no values).
GET /sandboxes/{sandbox_id}/settings/secrets/{secret_name}
    Raw secret value (plain text).  Called by ``LookupSecret`` inside sandbox.

Security model
--------------
The ``X-Session-API-Key`` is sandbox-scoped and only known to the sandbox
and the SaaS.  Raw secret values are only returned to the sandbox via the
``/llm-key`` and ``/secrets/{name}`` endpoints — the SDK client on the
user's machine never sees them.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import APIKeyHeader

from openhands.app_server.config import get_sandbox_service
from openhands.app_server.sandbox.sandbox_models import SandboxInfo
from openhands.app_server.services.injector import InjectorState
from openhands.app_server.user.auth_user_context import AuthUserContext
from openhands.app_server.user.sdk_settings_models import (
    LLMSettingsResponse,
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
# GET /sandboxes/{sandbox_id}/settings/llm
# ---------------------------------------------------------------------------
@router.get('/llm')
async def get_llm_settings(
    request: Request,
    sandbox_id: str,
    sandbox_info: SandboxInfo = Depends(_valid_sandbox_from_session_key),
) -> LLMSettingsResponse:
    """Return LLM config with ``api_key`` as a ``LookupSecret`` reference.

    The ``LookupSecret`` URL points back to ``/settings/llm-key`` on this
    server so the agent-server can resolve the actual key on demand.
    """
    user_context = await _get_user_context(sandbox_info)
    user_info = await user_context.get_user_info()

    # Build the LookupSecret dict that the SDK will deserialise.
    # The URL points to our /llm-key sibling endpoint; the agent-server
    # will call it (with the same session API key) when it needs the key.
    api_key_lookup: dict | None = None
    if user_info.llm_api_key:
        base_url = str(request.base_url).rstrip('/')
        api_key_lookup = {
            'kind': 'LookupSecret',
            'url': f'{base_url}/api/v1/sandboxes/{sandbox_id}/settings/llm-key',
            'headers': {
                'X-Session-API-Key': request.headers.get('X-Session-API-Key', ''),
            },
        }

    return LLMSettingsResponse(
        model=user_info.llm_model,
        api_key=api_key_lookup,
        base_url=user_info.llm_base_url,
    )


# ---------------------------------------------------------------------------
# GET /sandboxes/{sandbox_id}/settings/llm-key
# ---------------------------------------------------------------------------
@router.get('/llm-key')
async def get_llm_key(
    sandbox_info: SandboxInfo = Depends(_valid_sandbox_from_session_key),
) -> Response:
    """Return the raw LLM API key as plain text.

    This endpoint is called by the ``LookupSecret`` embedded in the LLM
    config — it runs **inside the sandbox**, not on the SDK client.
    """
    user_context = await _get_user_context(sandbox_info)
    user_info = await user_context.get_user_info()

    if not user_info.llm_api_key:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail='No LLM API key configured'
        )

    return Response(
        content=user_info.llm_api_key.get_secret_value(),
        media_type='text/plain',
    )


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
