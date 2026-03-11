"""Generate automation Python files from user-provided parameters."""

from __future__ import annotations

import textwrap


def generate_automation_file(
    name: str,
    schedule: str,
    timezone: str,
    prompt: str,
    repository: str | None = None,
    branch: str | None = None,
) -> str:
    """Return a complete, valid Python file string for an automation.

    The generated file includes a ``__config__`` dict that can be round-tripped
    through :func:`services.automation_config.extract_config` and
    :func:`services.automation_config.validate_config`.
    """
    # Use repr() for safe string escaping — handles backslashes, quotes, etc.
    r_name = repr(name)
    r_schedule = repr(schedule)
    r_timezone = repr(timezone)
    r_prompt = repr(prompt)

    # Build a safe docstring — strip quotes from repr and re-escape for docstring
    safe_docstring_name = name.replace('\\', '\\\\').replace('"', '\\"')

    return textwrap.dedent(f'''\
        """{safe_docstring_name} — auto-generated automation."""

        __config__ = {{
            "name": {r_name},
            "triggers": {{
                "cron": {{
                    "schedule": {r_schedule},
                    "timezone": {r_timezone},
                }}
            }},
        }}

        import os
        from openhands.sdk import LLM, Conversation
        from openhands.tools.preset.default import get_default_agent

        llm = LLM(
            model=os.getenv("LLM_MODEL", "anthropic/claude-sonnet-4-5-20250929"),
            api_key=os.getenv("LLM_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL"),
        )
        agent = get_default_agent(llm=llm, cli_mode=True)
        conversation = Conversation(agent=agent, workspace=os.getcwd())
        conversation.send_message({r_prompt})
        conversation.run()
    ''')
