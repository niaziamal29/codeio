"""Router for SDK settings API endpoints.

Provides endpoints for SDK users to retrieve their SaaS credentials:
- GET /api/v1/users/settings/llm - Get LLM configuration (model, API key, base URL)
- GET /api/v1/users/settings/secrets - Get user's custom secrets
"""

from fastapi import APIRouter, HTTPException, Query, status

from openhands.app_server.config import depends_user_context
from openhands.app_server.user.sdk_settings_models import (
    LLMSettingsResponse,
    SecretItem,
    SecretsResponse,
)
from openhands.app_server.user.user_context import UserContext
from openhands.core.logger import openhands_logger as logger
from openhands.server.dependencies import get_dependencies

router = APIRouter(
    prefix='/users/settings', tags=['SDK Settings'], dependencies=get_dependencies()
)
user_dependency = depends_user_context()

_names_query = Query(
    default=None,
    description='Optional list of secret names to filter by. '
    'If not provided, all secrets are returned.',
)


@router.get('/llm')
async def get_llm_settings(
    user_context: UserContext = user_dependency,
) -> LLMSettingsResponse:
    """Get the current user's LLM settings for SDK usage.

    Returns the LLM model, API key (BYOR key), and base URL configured
    in the user's SaaS account. The API key returned is always the BYOR
    (Bring Your Own Runtime) key, not the default SaaS-internal key.

    This endpoint is intended for SDK users who want to construct an LLM
    instance with their SaaS credentials.
    """
    user_id = await user_context.get_user_id()
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='User is not authenticated',
        )

    try:
        user_info = await user_context.get_user_info()
    except Exception:
        logger.exception(
            'Failed to retrieve user settings for LLM config',
            extra={'user_id': user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Failed to retrieve LLM settings',
        )

    return LLMSettingsResponse(
        model=user_info.llm_model,
        api_key=user_info.llm_api_key.get_secret_value()
        if user_info.llm_api_key
        else None,
        base_url=user_info.llm_base_url,
    )


@router.get('/secrets')
async def get_secrets(
    names: list[str] | None = _names_query,
    user_context: UserContext = user_dependency,
) -> SecretsResponse:
    """Get the current user's custom secrets.

    Returns the user's custom secrets (name, value, description) from
    their SaaS account. Optionally filter by secret names.

    This endpoint is intended for SDK users who want to inject their SaaS
    secrets into a conversation via ``conversation.update_secrets()``.
    """
    user_id = await user_context.get_user_id()
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='User is not authenticated',
        )

    try:
        secret_sources = await user_context.get_secrets()
    except Exception:
        logger.exception(
            'Failed to retrieve user secrets',
            extra={'user_id': user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Failed to retrieve secrets',
        )

    items: list[SecretItem] = []
    for name, source in secret_sources.items():
        if names is not None and name not in names:
            continue
        value = source.get_value()
        if value is not None:
            items.append(
                SecretItem(
                    name=name,
                    value=value,
                    description=source.description,
                )
            )

    return SecretsResponse(secrets=items)
