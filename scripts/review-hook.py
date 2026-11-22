#!/usr/bin/env python3
"""Review a local commit and require an assessed report before pushing it."""

import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile

def git(root, *args):
    return subprocess.check_output(
        ["git", *args], cwd=root, text=True, timeout=30
    ).strip()


def report_path(root, sha):
    common = Path(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir"))
    return common / "misi-pre-push-review" / f"{sha}.json"


def save_report(path, report):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as file:
        temporary = Path(file.name)
        json.dump(report, file, indent=2, ensure_ascii=False)
        file.write("\n")
    temporary.replace(path)


def read_report(path, sha):
    try:
        report = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    if isinstance(report, dict) and report.get("commit") == sha:
        return report
    return {}


def install(root):
    result = subprocess.run(
        ["git", "config", "--get", "core.hooksPath"],
        cwd=root, text=True, capture_output=True,
    )
    if result.returncode not in (0, 1):
        result.check_returncode()
    if result.returncode == 0:
        raise ValueError("core.hooksPath is configured. Integrate Misi's pre-push check there.")
    hook = Path(git(root, "rev-parse", "--path-format=absolute", "--git-path", "hooks/pre-push"))
    source = (root / ".githooks/pre-push").read_bytes()
    hook.parent.mkdir(exist_ok=True)
    previous = b"#!/bin/sh\nexec python3 scripts/review-hook.py pre-push\n"
    if hook.is_symlink() or (hook.exists() and hook.read_bytes() not in (source, previous)):
        raise ValueError("An existing pre-push hook was found. Integrate Misi's check into it.")
    checker = hook.with_name("misi-review-check.py")
    if checker.is_symlink() or (checker.exists() and not checker.is_file()):
        raise ValueError(f"Cannot replace review checker at {checker}.")
    with tempfile.NamedTemporaryFile(dir=hook.parent, delete=False) as file:
        temporary = Path(file.name)
        file.write(Path(__file__).read_bytes())
    temporary.replace(checker)
    if not hook.exists() or hook.read_bytes() != source:
        with tempfile.NamedTemporaryFile(dir=hook.parent, delete=False) as file:
            temporary = Path(file.name)
            file.write(source)
        temporary.chmod(0o700)
        temporary.replace(hook)
    hook.chmod(hook.stat().st_mode | 0o100)
    print("Misi pre-push check active.")


def review_context(root, sha, target):
    target_sha = git(root, "rev-parse", "--verify", "--end-of-options", target + "^{commit}")
    return {
        "commit": sha,
        "target_commit": target_sha,
        "merge_base": git(root, "merge-base", sha, target_sha),
    }


def prepare(root, sha, target):
    context = review_context(root, sha, target)
    base = context["merge_base"]
    instructions = git(root, "show", f"{sha}:.codex/reviewer.md")
    print(
        f"Commit: {sha}\nTarget commit: {context['target_commit']}\n"
        f"Merge base: {base}\n\n"
        f"Review commit {sha} using git diff {base} {sha}. "
        f"Read surrounding code with git show {sha}:<path> or git grep <pattern> {sha}, "
        "since the working tree may contain uncommitted changes. "
        "Do not edit files or contact external services. "
        "Return findings to the implementer.\n\n" + instructions
    )


def pre_push(root, updates):
    missing = []
    for update in updates:
        _, sha, destination, _ = update.split()
        if not destination.startswith("refs/heads/") or set(sha) == {"0"}:
            continue
        report = read_report(report_path(root, sha), sha)
        if not report.get("feedback") or not report.get("assessment"):
            missing.append(f"{destination} ({sha})")
    if missing:
        raise ValueError(
            "Push blocked. Review and assessment missing for:\n  "
            + "\n  ".join(missing)
            + "\nRun python3 scripts/review-hook.py prepare --commit <sha> and start a Codex reviewer"
            + "\nThen record the findings and your assessment with python3 scripts/review-hook.py record"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("install")
    commands.add_parser("pre-push")
    prepare_command = commands.add_parser("prepare")
    prepare_command.add_argument("--base", default="origin/main")
    record_command = commands.add_parser("record")
    record_command.add_argument("--base-commit", required=True)
    record_command.add_argument("--feedback", required=True)
    record_command.add_argument("--summary", required=True)
    prepare_command.add_argument("--commit", default="HEAD")
    record_command.add_argument("--commit", required=True)
    args = parser.parse_args()
    root = Path(git(None, "rev-parse", "--show-toplevel"))
    if args.command == "install":
        install(root)
        return
    if args.command == "pre-push":
        pre_push(root, sys.stdin)
        return
    sha = git(root, "rev-parse", "--verify", "--end-of-options", args.commit + "^{commit}")
    if args.command == "prepare":
        prepare(root, sha, args.base)
        return
    if args.commit != sha:
        raise ValueError("Use the exact reviewed commit SHA printed by prepare.")
    report = review_context(root, sha, args.base_commit)
    if args.base_commit != report["target_commit"]:
        raise ValueError("Use the exact target commit SHA printed by prepare.")
    feedback = args.feedback.strip()
    summary = args.summary.strip()
    if not feedback or not summary:
        raise ValueError("Supply the reviewer's findings and your assessment.")
    path = report_path(root, sha)
    path.parent.mkdir(exist_ok=True)
    report.update(feedback=feedback, assessment=summary)
    save_report(path, report)
    print(f"Review recorded for {sha}: {path}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"Misi review: {error}", file=sys.stderr)
        sys.exit(1)
