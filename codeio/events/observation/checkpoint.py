"""CheckpointObservation — user's response to a checkpoint."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from codeio.core.schema import ObservationType
from codeio.events.observation.observation import Observation


class CheckpointDecision(str, Enum):
    ACCEPT = 'accept'      # User approves, agent continues
    REVISE = 'revise'      # User wants changes to this checkpoint
    UNDO = 'undo'          # User wants to revert to previous checkpoint
    CONTINUE = 'continue'  # Auto-accepted (e.g., QA passed, auto-approve enabled)


@dataclass
class CheckpointObservation(Observation):
    """User's response to a checkpoint.

    This observation is injected into the event stream when the user
    responds to a CheckpointAction. The agent reads this to decide
    whether to continue, revise, or handle an undo.
    """

    observation: str = ObservationType.CHECKPOINT_RESULT
    decision: CheckpointDecision = CheckpointDecision.ACCEPT
    feedback: Optional[str] = None  # User's revision instructions (for REVISE)
    checkpoint_id: str = ''
    reverted_to_commit: Optional[str] = None  # Set when decision is UNDO

    @property
    def message(self) -> str:
        if self.decision == CheckpointDecision.REVISE and self.feedback:
            return f'Checkpoint {self.decision.value}: {self.feedback}'
        return f'Checkpoint {self.decision.value}'
