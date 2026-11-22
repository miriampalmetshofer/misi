"""Exercise push detection, loop limits and delivery without external agents."""

import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "review_hook", Path(__file__).with_name("review-hook.py"))
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)
real_review = hook.review


class ReviewHookTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo"
        self.remote = Path(self.temp.name) / "remote.git"
        hook.run("git", "init", "--bare", str(self.remote))
        hook.run("git", "init", "-b", "main", str(self.root))
        hook.git(self.root, "config", "user.email", "test@example.com")
        hook.git(self.root, "config", "user.name", "Test")
        hook.git(self.root, "remote", "add", "origin", str(self.remote))
        self.commit("initial")
        hook.git(self.root, "push", "-u", "origin", "main")
        hook.git(self.root, "checkout", "-b", "feature")
        self.event = {"session_id": "implementer", "hook_event_name": "SessionStart"}
        hook.handle(self.root, self.event)
        self.event["hook_event_name"] = "PostToolUse"
        self.pr = {"number": 42, "baseRefName": "main", "url": "https://example/pr/42"}
        self.original_run = hook.run
        self.calls = []
        self.messages = []
        self.addCleanup(patch.stopall)
        patch.object(hook, "run", side_effect=self.external).start()
        patch.object(hook, "review", side_effect=self.review).start()
        patch.object(hook, "deliver", side_effect=lambda *a: self.messages.append(a[-1])).start()

    def commit(self, text):
        (self.root / "file.txt").write_text(text)
        hook.git(self.root, "add", "file.txt")
        hook.git(self.root, "commit", "-m", text)
        return hook.git(self.root, "rev-parse", "HEAD")

    def external(self, *args, **kwargs):
        if args[0] == "gh":
            return json.dumps([{**self.pr, "headRefOid": hook.git(
                self.root, "rev-parse", "origin/feature")}])
        return self.original_run(*args, **kwargs)

    def review(self, root, path, pr, entry):
        self.calls.append(entry)
        return "No findings.", path / "feedback.md"

    def push(self):
        hook.git(self.root, "push", "-u", "origin", "feature")
        hook.handle(self.root, self.event)

    def test_only_pushed_changes_trigger_and_duplicates_do_not(self):
        self.commit("unpublished")
        hook.handle(self.root, self.event)
        self.assertFalse(self.calls)
        self.push()
        hook.handle(self.root, self.event)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(len(self.messages), 1)

    def test_three_rounds_then_independent_push_gets_new_budget(self):
        self.commit("first")
        self.push()
        cycle = self.calls[0]["cycle"]
        for number in range(2, 5):
            sha = self.commit(f"correction {number}")
            with hook.state_at(hook.storage(self.root)) as state:
                state["actions"][sha] = {"cycle": cycle}
            self.push()
        self.assertEqual([r["round"] for r in self.calls], [1, 2, 3])
        self.assertIn("Three rounds completed", self.messages[-1])
        self.commit("new user request")
        self.push()
        self.assertEqual(self.calls[-1]["round"], 1)
        self.assertNotEqual(self.calls[-1]["cycle"], cycle)

    def test_skip_applies_to_one_commit_and_keeps_reason(self):
        sha = self.commit("exception")
        with hook.state_at(hook.storage(self.root)) as state:
            state["actions"][sha] = {"skip": "Reviewer service has a documented outage"}
        self.push()
        self.assertFalse(self.calls)
        self.assertIn("documented outage", self.messages[-1])
        self.commit("next change")
        self.push()
        self.assertEqual(len(self.calls), 1)

    def test_failed_review_is_reported_and_not_relaunched(self):
        patch.object(hook, "review", side_effect=ValueError("review failed")).start()
        self.commit("failure")
        self.push()
        self.assertIn("FAILED", self.messages[-1])
        hook.handle(self.root, self.event)
        self.assertEqual(len(self.messages), 1)

    def test_no_open_pr_does_not_start_review(self):
        original = self.external
        patch.object(hook, "run", side_effect=lambda *a, **kw:
                     "[]" if a[0] == "gh" else original(*a, **kw)).start()
        self.commit("no PR")
        self.push()
        self.assertFalse(self.calls)

    def test_failed_push_does_not_start_review(self):
        self.commit("rejected push")
        hook.git(self.root, "remote", "set-url", "origin", "/missing/remote.git")
        with self.assertRaises(subprocess.CalledProcessError):
            hook.git(self.root, "push", "origin", "feature")
        hook.handle(self.root, self.event)
        self.assertFalse(self.calls)

    def test_reviewer_uses_pushed_snapshot_and_removes_worktree(self):
        instructions = self.root / ".codex/reviewer.md"
        instructions.parent.mkdir()
        instructions.write_text("Custom reviewer instruction")
        sha = self.commit("pushed contents")
        self.push()
        (self.root / "file.txt").write_text("uncommitted implementer changes")
        path = hook.storage(self.root)
        entry = self.calls[0]
        original_subprocess = subprocess.run

        def execute(args, **kwargs):
            if args[0] != "codex":
                return original_subprocess(args, **kwargs)
            checkout = Path(args[args.index("-C") + 1])
            self.assertEqual((checkout / "file.txt").read_text(), "pushed contents")
            self.assertIn("Custom reviewer instruction", kwargs["input"])
            self.assertIn(sha, kwargs["input"])
            self.assertIn("read-only", args)
            self.assertEqual(args[args.index("--disable") + 1], "hooks")
            Path(args[args.index("-o") + 1]).write_text("Snapshot reviewed")
            return subprocess.CompletedProcess(args, 0)

        with patch.object(subprocess, "run", side_effect=execute):
            feedback, report = real_review(self.root, path, self.pr, entry)
        self.assertEqual(feedback, "Snapshot reviewed")
        self.assertTrue(report.exists())
        self.assertFalse((report.parent / "checkout").exists())
        self.assertEqual((self.root / "file.txt").read_text(),
                         "uncommitted implementer changes")

    def test_queue_failure_returns_native_hook_context(self):
        patch.stopall()
        with patch.object(hook, "run", side_effect=OSError("queue unavailable")):
            with patch.object(hook, "context") as context:
                hook.deliver(self.root, "implementer", "Review findings")
        self.assertIn("Review findings", context.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
