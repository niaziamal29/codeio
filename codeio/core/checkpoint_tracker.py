"""CheckpointTracker — tracks agent progress and decides when to emit checkpoints.

Uses composition (not inheritance) per AXIOM review recommendation.
Instantiate and pass to agents via constructor injection:

    tracker = CheckpointTracker()
    agent = CodeActAgent(..., checkpoint_tracker=tracker)

Checkpoint triggers:
1. File count threshold: After N files have been created/modified
2. Logical completion: Agent's LLM indicates a feature is complete
3. Error recovery: After fixing a significant error
4. Explicit request: User asked the agent to checkpoint
"""

import logging
import re
from typing import Optional

from codeio.events.action.checkpoint import CheckpointAction

logger = logging.getLogger('codeio.checkpoint')

# Heuristic thresholds
DEFAULT_FILE_THRESHOLD = 5       # Checkpoint after modifying 5 files
DEFAULT_ACTION_THRESHOLD = 20    # Checkpoint after 20 actions
DEFAULT_CONFIDENCE_THRESHOLD = 0.7  # Minimum confidence to auto-checkpoint


class CheckpointTracker:
    """Tracks agent progress and creates checkpoint events.

    This is a standalone class injected into agents via composition,
    avoiding diamond inheritance issues from mixins.
    """

    def __init__(
        self,
        file_threshold: int = DEFAULT_FILE_THRESHOLD,
        action_threshold: int = DEFAULT_ACTION_THRESHOLD,
        auto_checkpoint_enabled: bool = True,
    ) -> None:
        """Initialize the checkpoint tracker.

        Args:
            file_threshold: Number of file changes before auto-checkpoint.
            action_threshold: Number of actions before auto-checkpoint.
            auto_checkpoint_enabled: Whether automatic checkpoints are enabled.
        """
        self._files_since_checkpoint: set[str] = set()
        self._actions_since_checkpoint: int = 0
        self._checkpoint_count: int = 0
        self._auto_checkpoint_enabled = auto_checkpoint_enabled
        self._file_threshold = file_threshold
        self._action_threshold = action_threshold

    @property
    def checkpoint_count(self) -> int:
        """Number of checkpoints created so far."""
        return self._checkpoint_count

    @property
    def files_since_checkpoint(self) -> set[str]:
        """Files modified since last checkpoint."""
        return self._files_since_checkpoint.copy()

    @property
    def actions_since_checkpoint(self) -> int:
        """Number of actions since last checkpoint."""
        return self._actions_since_checkpoint

    def track_file_change(self, file_path: str) -> None:
        """Track a file that was created or modified."""
        self._files_since_checkpoint.add(file_path)
        self._actions_since_checkpoint += 1

    def track_action(self) -> None:
        """Track any action (command execution, etc.)."""
        self._actions_since_checkpoint += 1

    def should_checkpoint(self, llm_says_complete: bool = False) -> bool:
        """Determine if a checkpoint should be emitted now.

        Args:
            llm_says_complete: Whether the LLM's response indicates
                               a logical unit of work is done.
        """
        if not self._auto_checkpoint_enabled:
            return False

        # LLM explicitly says this is a good stopping point
        if llm_says_complete:
            return True

        # File threshold exceeded
        if len(self._files_since_checkpoint) >= self._file_threshold:
            return True

        # Action threshold exceeded
        if self._actions_since_checkpoint >= self._action_threshold:
            return True

        return False

    def create_checkpoint(
        self,
        summary: str,
        screenshot_path: Optional[str] = None,
        confidence: float = 0.8,
        suggested_next_steps: Optional[list[str]] = None,
    ) -> CheckpointAction:
        """Create a CheckpointAction and reset tracking state.

        Args:
            summary: Human-readable summary of what was accomplished.
            screenshot_path: Path to a screenshot of the current state.
            confidence: Agent's confidence this is correct (0-1).
            suggested_next_steps: What the agent plans to do next.

        Returns:
            A CheckpointAction event to emit.
        """
        files_changed = sorted(self._files_since_checkpoint)

        action = CheckpointAction(
            summary=summary,
            files_changed=files_changed,
            screenshot_path=screenshot_path,
            confidence=confidence,
            suggested_next_steps=suggested_next_steps or [],
        )

        # Reset tracking state
        self._checkpoint_count += 1
        self._files_since_checkpoint.clear()
        self._actions_since_checkpoint = 0

        logger.info(
            'Checkpoint #%d created: %s (%d files changed)',
            self._checkpoint_count,
            summary,
            len(files_changed),
        )

        return action

    def reset(self) -> None:
        """Reset all tracking state."""
        self._files_since_checkpoint.clear()
        self._actions_since_checkpoint = 0
        self._checkpoint_count = 0

    @staticmethod
    def detect_completion_signal(llm_response: str) -> bool:
        """Check if the LLM's response contains signals that a logical unit of work is complete.

        Looks for phrases like:
        - "I've completed..."
        - "The feature is ready..."
        - "<checkpoint>" tag (explicit signal)
        """
        completion_signals = [
            '<checkpoint>',
            "i've completed",
            'i have completed',
            'the feature is ready',
            'let me show you',
            "here's what i've built",
            "i've finished",
            'everything is set up',
            'the implementation is complete',
            'ready for review',
        ]
        lower_response = llm_response.lower()
        return any(signal in lower_response for signal in completion_signals)

    @staticmethod
    def extract_checkpoint_summary(llm_response: str) -> str:
        """Extract a checkpoint summary from the LLM response.

        If the response contains a <checkpoint>summary</checkpoint> tag,
        extract the summary. Otherwise, use the first sentence.
        """
        # Check for explicit checkpoint tag
        match = re.search(r'<checkpoint>(.*?)</checkpoint>', llm_response, re.DOTALL)
        if match:
            return match.group(1).strip()

        # Fall back to first meaningful sentence
        sentences = re.split(r'[.!]\s', llm_response)
        for sentence in sentences:
            cleaned = sentence.strip()
            if len(cleaned) > 20 and not cleaned.startswith('```'):
                return cleaned[:200]

        return 'Checkpoint reached'
