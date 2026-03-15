"""CheckpointAction — emitted by the agent when it reaches a logical stopping point."""

from dataclasses import dataclass, field
from typing import Optional

from codeio.core.schema import ActionType
from codeio.events.action.action import Action


@dataclass
class CheckpointAction(Action):
    """Agent requests a checkpoint pause for user review.

    The agent emits this when it has completed a logical unit of work
    (e.g., finished a component, set up routing, fixed a bug) and wants
    the user to review before continuing.
    """

    action: str = ActionType.CHECKPOINT
    summary: str = ''
    files_changed: list[str] = field(default_factory=list)
    screenshot_path: Optional[str] = None
    suggested_next_steps: list[str] = field(default_factory=list)
    confidence: float = 0.8  # Agent's confidence this checkpoint is correct (0-1)

    @property
    def message(self) -> str:
        return f'Checkpoint: {self.summary}'
