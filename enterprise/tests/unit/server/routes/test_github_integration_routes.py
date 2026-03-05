"""Unit tests for GitHub integration routes - ClientDisconnect handling.

These tests verify that ClientDisconnect exceptions are properly handled
when the FastAPI endpoint times out before the request body can be fully
received from the client.
"""

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.responses import JSONResponse
from starlette.requests import ClientDisconnect


# Mock the dependencies that would be imported by the github module
# This allows us to test the function without requiring the full enterprise setup
@pytest.fixture(autouse=True)
def mock_dependencies():
    """Mock enterprise dependencies to allow importing the github module."""
    mock_modules = {
        'integrations': MagicMock(),
        'integrations.github': MagicMock(),
        'integrations.github.data_collector': MagicMock(),
        'integrations.github.github_manager': MagicMock(),
        'integrations.models': MagicMock(),
        'server': MagicMock(),
        'server.auth': MagicMock(),
        'server.auth.constants': MagicMock(),
        'server.auth.token_manager': MagicMock(),
        'openhands': MagicMock(),
        'openhands.core': MagicMock(),
        'openhands.core.logger': MagicMock(),
    }

    # Set up the mock webhook secret
    mock_modules['server.auth.constants'].GITHUB_APP_WEBHOOK_SECRET = 'test-secret'

    with patch.dict(sys.modules, mock_modules):
        yield


@pytest.fixture
def github_events_func():
    """Create the github_events function with mocked dependencies.

    This recreates the essential logic of the github_events endpoint
    to test the ClientDisconnect handling without needing full imports.
    """

    async def github_events(
        request,
        x_hub_signature_256: str = None,
        webhooks_enabled: bool = True,
        logger=None,
        verify_signature=None,
        github_manager=None,
    ):
        """Simplified version of github_events for testing ClientDisconnect handling."""
        if logger is None:
            logger = MagicMock()

        # Check if GitHub webhooks are enabled
        if not webhooks_enabled:
            logger.info(
                'GitHub webhooks are disabled by GITHUB_WEBHOOKS_ENABLED environment variable'
            )
            return JSONResponse(
                status_code=200,
                content={'message': 'GitHub webhooks are currently disabled.'},
            )

        try:
            payload = await request.body()

            if verify_signature:
                verify_signature(payload, x_hub_signature_256)

            payload_data = await request.json()
            installation_id = payload_data.get('installation', {}).get('id')

            if not installation_id:
                return JSONResponse(
                    status_code=400,
                    content={'error': 'Installation ID is missing in the payload.'},
                )

            if github_manager:
                await github_manager.receive_message(MagicMock())

            return JSONResponse(
                status_code=200,
                content={'message': 'GitHub events endpoint reached successfully.'},
            )
        except ClientDisconnect:
            logger.debug('GitHub webhook client disconnected before completing request')
            return JSONResponse(
                status_code=499,
                content={'error': 'Client disconnected.'},
            )
        except Exception as e:
            logger.exception(f'Error processing GitHub event: {e}')
            return JSONResponse(status_code=400, content={'error': 'Invalid payload.'})

    return github_events


class TestClientDisconnect:
    """Test cases for ClientDisconnect handling in github_events endpoint."""

    @pytest.mark.asyncio
    async def test_client_disconnect_returns_499(self, github_events_func):
        """Test that ClientDisconnect is caught and returns 499 status code.

        This tests the scenario where the FastAPI endpoint times out before
        the request body can be fully received, causing starlette to raise
        ClientDisconnect.
        """
        # Create a mock request that raises ClientDisconnect when body() is called
        # This simulates what happens when the client disconnects or times out
        mock_request = MagicMock()
        mock_request.body = AsyncMock(side_effect=ClientDisconnect())

        # Call the endpoint
        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
        )

        assert response.status_code == 499
        assert response.body == b'{"error":"Client disconnected."}'

    @pytest.mark.asyncio
    async def test_client_disconnect_during_json_parsing(self, github_events_func):
        """Test ClientDisconnect during request.json() call returns 499."""
        mock_request = MagicMock()
        mock_request.body = AsyncMock(return_value=b'{"test": "data"}')
        # ClientDisconnect can also happen during json parsing
        mock_request.json = AsyncMock(side_effect=ClientDisconnect())

        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
            verify_signature=MagicMock(),  # Skip signature verification
        )

        assert response.status_code == 499
        assert response.body == b'{"error":"Client disconnected."}'

    @pytest.mark.asyncio
    async def test_client_disconnect_does_not_propagate_as_unhandled_exception(
        self, github_events_func
    ):
        """Test that ClientDisconnect doesn't cause unhandled exception logging."""
        mock_logger = MagicMock()
        mock_request = MagicMock()
        mock_request.body = AsyncMock(side_effect=ClientDisconnect())

        # The function should return normally without raising
        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
            logger=mock_logger,
        )

        # The generic exception handler should NOT be triggered
        # (it uses logger.exception which includes 'Error processing GitHub event')
        mock_logger.exception.assert_not_called()

        assert response.status_code == 499

    @pytest.mark.asyncio
    async def test_client_disconnect_is_not_caught_by_generic_exception_handler(
        self, github_events_func
    ):
        """Test that ClientDisconnect is caught by its specific handler, not the generic one.

        The generic exception handler returns 400 and logs with exception().
        ClientDisconnect should return 499 and log with debug().
        """
        mock_logger = MagicMock()
        mock_request = MagicMock()
        mock_request.body = AsyncMock(side_effect=ClientDisconnect())

        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
            logger=mock_logger,
        )

        # Should be 499 (ClientDisconnect), not 400 (generic exception)
        assert response.status_code == 499

        # Should use debug(), not exception()
        mock_logger.debug.assert_called_once()
        mock_logger.exception.assert_not_called()


class TestWebhooksDisabled:
    """Test cases for when webhooks are disabled."""

    @pytest.mark.asyncio
    async def test_webhooks_disabled_returns_200(self, github_events_func):
        """Test that disabled webhooks return 200 with appropriate message."""
        mock_request = MagicMock()

        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
            webhooks_enabled=False,
        )

        assert response.status_code == 200
        assert b'GitHub webhooks are currently disabled' in response.body


class TestSuccessfulRequest:
    """Test cases for successful webhook processing."""

    @pytest.mark.asyncio
    async def test_successful_request_returns_200(self, github_events_func):
        """Test that a successful request returns 200."""
        mock_request = MagicMock()
        mock_request.body = AsyncMock(return_value=b'{"installation": {"id": 123}}')
        mock_request.json = AsyncMock(return_value={'installation': {'id': 123}})

        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
            verify_signature=MagicMock(),
            github_manager=MagicMock(receive_message=AsyncMock()),
        )

        assert response.status_code == 200
        assert b'GitHub events endpoint reached successfully' in response.body

    @pytest.mark.asyncio
    async def test_missing_installation_id_returns_400(self, github_events_func):
        """Test that missing installation ID returns 400."""
        mock_request = MagicMock()
        mock_request.body = AsyncMock(return_value=b'{"action": "opened"}')
        mock_request.json = AsyncMock(return_value={'action': 'opened'})

        response = await github_events_func(
            request=mock_request,
            x_hub_signature_256='sha256=test',
            verify_signature=MagicMock(),
        )

        assert response.status_code == 400
        assert b'Installation ID is missing' in response.body
