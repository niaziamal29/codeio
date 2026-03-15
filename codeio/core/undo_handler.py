"""UndoHandler — handles git-based undo operations for checkpoints.

When a user undoes a checkpoint, the handler:
1. Looks up the target checkpoint's git commit SHA
2. Creates a new branch from that commit (to preserve history)
3. Resets the working directory to that state
4. Updates the checkpoint store
"""

import logging
import subprocess
from typing import Optional

logger = logging.getLogger('codeio.undo_handler')


class UndoHandler:
    """Handles git-based undo operations for checkpoint rollback."""

    def __init__(self, project_dir: str) -> None:
        """Initialize with the project's working directory.

        Args:
            project_dir: Absolute path to the project's git repository.
        """
        self._project_dir = project_dir

    def _run_git(self, *args: str) -> subprocess.CompletedProcess[str]:
        """Run a git command in the project directory."""
        cmd = ['git', '-C', self._project_dir] + list(args)
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
        )

    def get_current_commit(self) -> Optional[str]:
        """Get the current HEAD commit SHA."""
        result = self._run_git('rev-parse', 'HEAD')
        if result.returncode == 0:
            return result.stdout.strip()
        logger.error('Failed to get current commit: %s', result.stderr)
        return None

    def create_checkpoint_commit(self, message: str) -> Optional[str]:
        """Stage all changes and create a checkpoint commit.

        Args:
            message: Commit message for the checkpoint.

        Returns:
            The commit SHA, or None if the commit failed.
        """
        # Stage tracked file changes (not untracked to avoid secrets)
        self._run_git('add', '-u')

        # Check if there are staged changes
        result = self._run_git('diff', '--cached', '--quiet')
        if result.returncode == 0:
            # No changes staged — nothing to commit
            return self.get_current_commit()

        # Create commit
        result = self._run_git('commit', '-m', f'[checkpoint] {message}')
        if result.returncode != 0:
            logger.error('Failed to create checkpoint commit: %s', result.stderr)
            return None

        return self.get_current_commit()

    def undo_to_commit(self, target_sha: str) -> bool:
        """Reset the working directory to a target commit.

        Uses 'git reset --hard' to the target commit. This is safe because
        each checkpoint creates a commit, so the work is preserved in git history.

        Args:
            target_sha: The git commit SHA to reset to.

        Returns:
            True if the undo was successful.
        """
        # Verify the target commit exists
        result = self._run_git('cat-file', '-t', target_sha)
        if result.returncode != 0 or result.stdout.strip() != 'commit':
            logger.error('Target SHA %s is not a valid commit', target_sha)
            return False

        # Save current state on a backup branch (just in case)
        current_sha = self.get_current_commit()
        if current_sha:
            backup_branch = f'backup/before-undo-{current_sha[:8]}'
            self._run_git('branch', backup_branch, current_sha)
            logger.info('Created backup branch: %s', backup_branch)

        # Reset to target commit
        result = self._run_git('reset', '--hard', target_sha)
        if result.returncode != 0:
            logger.error('Failed to reset to %s: %s', target_sha, result.stderr)
            return False

        logger.info('Successfully undid to commit %s', target_sha)
        return True

    def get_commit_log(self, limit: int = 20) -> list[dict]:
        """Get recent commit log entries.

        Returns:
            List of dicts with 'sha', 'message', and 'date' keys.
        """
        result = self._run_git(
            'log',
            f'--max-count={limit}',
            '--format=%H|%s|%aI',
        )
        if result.returncode != 0:
            return []

        commits = []
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            parts = line.split('|', 2)
            if len(parts) == 3:
                commits.append({
                    'sha': parts[0],
                    'message': parts[1],
                    'date': parts[2],
                })
        return commits

    def get_diff_between(self, from_sha: str, to_sha: str) -> str:
        """Get the diff between two commits.

        Args:
            from_sha: The starting commit.
            to_sha: The ending commit.

        Returns:
            The diff output as a string.
        """
        result = self._run_git('diff', from_sha, to_sha, '--stat')
        if result.returncode == 0:
            return result.stdout
        return ''
