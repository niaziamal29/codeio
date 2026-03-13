"""User router for OpenHands App Server. For the moment, this simply implements the /me endpoint."""

import logging

from fastapi import APIRouter, Header, HTTPException, Query, status
from fastapi.responses import JSONResponse

from openhands.app_server.config import depends_user_context, get_sandbox_service
from openhands.app_server.services.injector import InjectorState
from openhands.app_server.user.specifiy_user_context import ADMIN, USER_CONTEXT_ATTR
from openhands.app_server.user.user_context import UserContext
from openhands.app_server.user.user_models import UserInfo
from openhands.server.dependencies import get_dependencies

_logger = logging.getLogger(__name__)

# We use the get_dependencies method here to signal to the OpenAPI docs that this endpoint
# is protected. The actual protection is provided by SetAuthCookieMiddleware
router = APIRouter(prefix='/users', tags=['User'], dependencies=get_dependencies())
user_dependency = depends_user_context()

# Read methods


@router.get('/me')
async def get_current_user(
    user_context: UserContext = user_dependency,
    expose_secrets: bool = Query(
        default=False,
        description='If true, return unmasked secret values (e.g. llm_api_key). '
        'Requires a valid X-Session-API-Key header for an active sandbox '
        'owned by the authenticated user.',
    ),
    x_session_api_key: str | None = Header(default=None),
) -> UserInfo:
    """Get the current authenticated user."""
    user = await user_context.get_user_info()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')
    if expose_secrets:
        await _validate_session_key_ownership(user_context, x_session_api_key)
        return JSONResponse(  # type: ignore[return-value]
            content=user.model_dump(mode='json', context={'expose_secrets': True})
        )
    return user


async def _validate_session_key_ownership(
    user_context: UserContext,
    session_api_key: str | None,
) -> None:
    """Verify the session key belongs to a sandbox owned by the caller.

    Raises ``HTTPException`` if the key is missing, invalid, or belongs
    to a sandbox owned by a different user.
    """
    if not session_api_key:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail='X-Session-API-Key header is required when expose_secrets=true',
        )

    state = InjectorState()
    setattr(state, USER_CONTEXT_ATTR, ADMIN)

    async with get_sandbox_service(state) as sandbox_service:
        sandbox_info = await sandbox_service.get_sandbox_by_session_api_key(
            session_api_key
        )

    if sandbox_info is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail='Invalid session API key',
        )

    # Verify the sandbox is owned by the authenticated user
    caller_id = await user_context.get_user_id()
    if sandbox_info.created_by_user_id and caller_id:
        if sandbox_info.created_by_user_id != caller_id:
            _logger.warning(
                'Session key user mismatch: sandbox owner=%s, caller=%s',
                sandbox_info.created_by_user_id,
                caller_id,
            )
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail='Session API key does not belong to the authenticated user',
            )
