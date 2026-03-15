# IMPORTANT: LEGACY V0 CODE - Deprecated since version 1.0.0, scheduled for removal April 1, 2026
# This file is part of the legacy (V0) implementation of Codeio and will be removed soon as we complete the migration to V1.
# Codeio V1 uses the Software Agent SDK for the agentic core and runs a new application server. Please refer to:
#   - V1 agentic core (SDK): https://github.com/Codeio/software-agent-sdk
#   - V1 application server (in this repo): codeio/app_server/
# Unless you are working on deprecation, please avoid extending this legacy file and consult the V1 codepaths above.
# Tag: Legacy-V0
"""Runtime implementations for Codeio."""

from codeio.runtime.impl.action_execution.action_execution_client import (
    ActionExecutionClient,
)
from codeio.runtime.impl.cli import CLIRuntime
from codeio.runtime.impl.docker.docker_runtime import DockerRuntime
from codeio.runtime.impl.local.local_runtime import LocalRuntime
from codeio.runtime.impl.remote.remote_runtime import RemoteRuntime

__all__ = [
    'ActionExecutionClient',
    'CLIRuntime',
    'DockerRuntime',
    'LocalRuntime',
    'RemoteRuntime',
]
