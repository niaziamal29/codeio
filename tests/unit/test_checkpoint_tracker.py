"""Tests for CheckpointTracker."""

from codeio.core.checkpoint_tracker import CheckpointTracker
from codeio.events.action.checkpoint import CheckpointAction


class TestCheckpointTracker:
    """Tests for the CheckpointTracker composition class."""

    def test_initial_state(self):
        tracker = CheckpointTracker()
        assert tracker.checkpoint_count == 0
        assert tracker.actions_since_checkpoint == 0
        assert len(tracker.files_since_checkpoint) == 0

    def test_track_file_change(self):
        tracker = CheckpointTracker()
        tracker.track_file_change('src/app.tsx')
        tracker.track_file_change('src/index.ts')
        assert len(tracker.files_since_checkpoint) == 2
        assert tracker.actions_since_checkpoint == 2

    def test_track_action(self):
        tracker = CheckpointTracker()
        tracker.track_action()
        tracker.track_action()
        assert tracker.actions_since_checkpoint == 2

    def test_should_checkpoint_file_threshold(self):
        tracker = CheckpointTracker(file_threshold=3)
        tracker.track_file_change('a.ts')
        tracker.track_file_change('b.ts')
        assert not tracker.should_checkpoint()
        tracker.track_file_change('c.ts')
        assert tracker.should_checkpoint()

    def test_should_checkpoint_action_threshold(self):
        tracker = CheckpointTracker(action_threshold=5)
        for _ in range(4):
            tracker.track_action()
        assert not tracker.should_checkpoint()
        tracker.track_action()
        assert tracker.should_checkpoint()

    def test_should_checkpoint_llm_completion(self):
        tracker = CheckpointTracker()
        assert tracker.should_checkpoint(llm_says_complete=True)

    def test_should_checkpoint_disabled(self):
        tracker = CheckpointTracker(auto_checkpoint_enabled=False)
        for _ in range(100):
            tracker.track_action()
        assert not tracker.should_checkpoint()

    def test_create_checkpoint(self):
        tracker = CheckpointTracker()
        tracker.track_file_change('src/app.tsx')
        tracker.track_file_change('src/page.tsx')

        action = tracker.create_checkpoint(
            summary='Built login page',
            confidence=0.9,
            suggested_next_steps=['Add form validation'],
        )

        assert isinstance(action, CheckpointAction)
        assert action.summary == 'Built login page'
        assert action.confidence == 0.9
        assert sorted(action.files_changed) == ['src/app.tsx', 'src/page.tsx']
        assert action.suggested_next_steps == ['Add form validation']

        # Tracking state should be reset
        assert tracker.checkpoint_count == 1
        assert tracker.actions_since_checkpoint == 0
        assert len(tracker.files_since_checkpoint) == 0

    def test_create_checkpoint_resets_state(self):
        tracker = CheckpointTracker()
        tracker.track_file_change('a.ts')
        tracker.create_checkpoint(summary='First')
        tracker.track_file_change('b.ts')
        action = tracker.create_checkpoint(summary='Second')
        assert tracker.checkpoint_count == 2
        assert action.files_changed == ['b.ts']

    def test_detect_completion_signal(self):
        assert CheckpointTracker.detect_completion_signal("I've completed the login page")
        assert CheckpointTracker.detect_completion_signal('<checkpoint>Done</checkpoint>')
        assert CheckpointTracker.detect_completion_signal('The implementation is complete.')
        assert not CheckpointTracker.detect_completion_signal('Working on the feature...')

    def test_extract_checkpoint_summary_with_tag(self):
        response = 'Done! <checkpoint>Built the auth system with OAuth</checkpoint> Moving on.'
        summary = CheckpointTracker.extract_checkpoint_summary(response)
        assert summary == 'Built the auth system with OAuth'

    def test_extract_checkpoint_summary_fallback(self):
        response = 'I have finished building the complete authentication system with login and signup. Now let me continue.'
        summary = CheckpointTracker.extract_checkpoint_summary(response)
        assert 'authentication system' in summary

    def test_reset(self):
        tracker = CheckpointTracker()
        tracker.track_file_change('a.ts')
        tracker.create_checkpoint(summary='Test')
        tracker.track_action()
        tracker.reset()
        assert tracker.checkpoint_count == 0
        assert tracker.actions_since_checkpoint == 0
        assert len(tracker.files_since_checkpoint) == 0
