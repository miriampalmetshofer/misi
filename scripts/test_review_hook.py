import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[1]


class ReviewHookTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "repo"
        self.root.mkdir()
        self.remote = self.root.parent / "remote"
        self.git("init", "-b", "main")
        self.git("init", "--bare", str(self.remote))
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.com")
        self.git("remote", "add", "origin", str(self.remote))
        for relative in (".githooks/pre-push", ".codex/reviewer.md", "scripts/review-hook.py"):
            target = self.root / relative
            target.parent.mkdir(exist_ok=True)
            shutil.copy2(SOURCE / relative, target)
        self.git("add", ".")
        self.git("commit", "-m", "Initial")
        self.git("push", "origin", "main")
        self.git("switch", "-c", "feature")
        self.git("commit", "--allow-empty", "-m", "Feature")
        self.command("install")

    def run_command(self, *args, success=True):
        result = subprocess.run(args, cwd=self.root, check=False,
                                text=True, capture_output=True)
        self.assertEqual(result.returncode == 0, success, result.stderr)
        return result.stdout.strip() if success else result.stderr

    def git(self, *args, **options):
        return self.run_command("git", *args, **options)

    def command(self, *args, **options):
        return self.run_command("python3", "scripts/review-hook.py", *args, **options)

    def record(self, feedback="No findings.", summary="No findings.", **options):
        return self.command(
            "record", "--commit", self.git("rev-parse", "HEAD"),
            "--base-commit", self.git("rev-parse", "origin/main"),
            "--feedback", feedback, "--summary", summary, **options,
        )

    def test_first_push_requires_completed_report(self):
        sha = self.git("rev-parse", "HEAD")
        target = self.git("rev-parse", "origin/main")
        self.assertIn("Push blocked", self.git("push", "origin", "feature", success=False))
        (self.root / ".codex" / "reviewer.md").write_text("Uncommitted instructions")
        prompt = self.command("prepare")
        self.assertIn(f"git diff {target} {sha}", prompt)
        self.assertNotIn("Uncommitted instructions", prompt)
        self.assertIn("Push blocked", self.git("push", "origin", "feature", success=False))
        self.record()
        self.git("push", "origin", "feature")
        path = self.root / ".git" / "misi-pre-push-review" / f"{sha}.json"
        report = json.loads(path.read_text())
        self.assertEqual(report["commit"], sha)
        self.assertEqual(report["target_commit"], target)
        self.assertEqual(report["feedback"], "No findings.")

    def test_reviews_pushed_sha_even_if_head_is_different(self):
        self.record()
        self.git("branch", "reviewed")
        self.git("commit", "--allow-empty", "-m", "Correction")
        self.assertIn("Push blocked", self.git(
            "push", "origin", "reviewed", "feature", success=False))
        self.assertFalse(self.git("ls-remote", "--heads", "origin", "reviewed"))
        self.git("push", "origin", "reviewed")
        self.git("push", "origin", "--delete", "reviewed")

    def test_incomplete_report_does_not_unlock_push(self):
        for feedback, summary in (("", "Reviewed"), ("Findings", "")):
            self.assertIn("Supply the reviewer's findings", self.record(
                feedback=feedback, summary=summary, success=False))
        self.assertIn("Push blocked", self.git("push", "origin", "feature", success=False))

    def test_checker_runs_from_an_older_checkout(self):
        self.record()
        self.git("switch", "main")
        (self.root / "scripts" / "review-hook.py").unlink()
        self.git("push", "origin", "feature")
        self.git("push", "origin", "--delete", "feature")

    def test_install_preserves_existing_hook(self):
        hook = self.root / ".git" / "hooks" / "pre-push"
        hook.write_text("#!/bin/sh\nexit 0\n")
        self.assertIn("existing pre-push hook", self.command("install", success=False))
        self.assertEqual(hook.read_text(), "#!/bin/sh\nexit 0\n")


if __name__ == "__main__":
    unittest.main()
