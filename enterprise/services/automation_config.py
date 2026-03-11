"""Automation config extraction and validation.

Parses ``__config__`` from automation Python source files
and validates it against a Pydantic schema.
"""

from __future__ import annotations

import ast

from croniter import croniter
from pydantic import BaseModel, field_validator, model_validator


def extract_config(source: str) -> dict:
    """Extract the ``__config__`` dict from automation Python source code.

    Uses :mod:`ast` to safely parse the source and locate a module-level
    assignment to ``__config__``.  The value must be a literal expression
    (evaluated via :func:`ast.literal_eval`).

    Raises:
        ValueError: If ``__config__`` is not found or its value contains
            non-literal expressions.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise ValueError(f'Failed to parse source: {exc}') from exc

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == '__config__':
                    try:
                        value = ast.literal_eval(node.value)
                    except (ValueError, TypeError) as exc:
                        raise ValueError(
                            f'__config__ value must be a literal expression: {exc}'
                        ) from exc
                    if not isinstance(value, dict):
                        raise ValueError('__config__ must be a dict')
                    return value
        # Handle annotated assignment: __config__: dict = {...}
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            if node.target.id == '__config__' and node.value is not None:
                try:
                    value = ast.literal_eval(node.value)
                except (ValueError, TypeError) as exc:
                    raise ValueError(
                        f'__config__ value must be a literal expression: {exc}'
                    ) from exc
                if not isinstance(value, dict):
                    raise ValueError('__config__ must be a dict')
                return value

    raise ValueError('__config__ not found in source')


class CronTriggerModel(BaseModel):
    """Cron trigger configuration."""

    schedule: str
    timezone: str = 'UTC'

    @field_validator('schedule')
    @classmethod
    def validate_schedule(cls, v: str) -> str:
        v = v.strip()
        if not croniter.is_valid(v):
            raise ValueError(f'Invalid cron expression: {v!r}')
        return v


class TriggersModel(BaseModel):
    """Container for trigger definitions.  Exactly one trigger must be set."""

    cron: CronTriggerModel | None = None

    @model_validator(mode='after')
    def exactly_one_trigger(self) -> TriggersModel:
        defined = [name for name in ('cron',) if getattr(self, name) is not None]
        if len(defined) != 1:
            raise ValueError(f'Exactly one trigger must be defined, got: {defined}')
        return self


class AutomationConfigModel(BaseModel):
    """Top-level automation config schema."""

    name: str
    triggers: TriggersModel
    description: str = ''

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not (1 <= len(v) <= 200):
            raise ValueError('name must be between 1 and 200 characters')
        return v


def validate_config(config: dict) -> AutomationConfigModel:
    """Validate a ``__config__`` dict against the automation schema.

    Returns the parsed :class:`AutomationConfigModel` or raises
    :class:`pydantic.ValidationError`.
    """
    return AutomationConfigModel.model_validate(config)
