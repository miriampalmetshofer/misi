# AGENTS.md

## Project Vision

This project is a private household web app for Miriam and her boyfriend: a long-lived playground for building useful everyday tools while practicing solid software engineering.

The app should grow into a collection of small, reliable services that make shared household life easier. Likely areas include groceries, chores, task planning, household finances, meal planning, inventory, recurring reminders, shared notes, and lightweight personal dashboards.

The goal is not to ship every feature at once. The goal is to build a maintainable foundation, learn deliberately, and add useful capabilities in small, well-understood steps.

## Product Principles

1. Build for the actual household, not for a generic audience.
   - Prefer concrete workflows Miriam and her boyfriend really use.
   - Avoid abstract "productivity app" features unless they solve a recurring problem.

2. Start small and make each feature complete.
   - A grocery list that works well is more valuable than five half-finished modules.
   - Every feature should have a clear job, a clear owner or use case, and a simple success criterion.

3. Prefer calm, practical interfaces.
   - Design and build mobile-first. The primary experience should work well on a phone before expanding to larger screens.
   - Avoid pixel-exact or screenshot-copy layouts. Prefer fluid layouts, standard spacing/type scales, intrinsic sizing, and responsive constraints unless an exact value is technically necessary.
   - Keep CSS minimal. After implementation, verify that every custom style is still necessary and remove over-specific styling that does not serve the interface.
   - Keep user-facing app text in German unless there is a concrete reason to use another language.
   - The app should be easy to scan and fast to use.
   - Avoid marketing-style pages, decorative complexity, or UI that gets in the way of repeated daily use.

4. Treat privacy as a core product requirement.
   - Household, finance, habit, and planning data can be sensitive.
   - Store only what is useful, expose only what is intended, and make data ownership understandable.

## Technical Project Context

- The app is a Next.js application using TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, and Neon.
- Use `mise` for project-local runtime commands. Prefer `mise exec -- <command>` when running Node/npm tooling so the configured runtime is used.

### Database And Neon

- Neon `production` is the real database branch. Do not use it for local development or experiments.
- Neon `dev/miriam` is the long-lived local development database branch. Local app development and first-pass migration testing should point here.
- Local credentials live in `.env`: both `DATABASE_URL`s plus `NEON_API_KEY` and the `NEON_*` settings, so the Neon API is usable locally without asking for a key. `.env.local` is Vercel-generated and holds only an OIDC token — load both files, and do not conclude from an empty `.env.local` that a key is missing. `.env.example` lists every name.
- The local `DATABASE_URL_UNPOOLED` points to `dev/miriam`; it is safe to use for local migration testing unless `.env` is changed.
- Future PR preview databases should use short-lived Neon branches named like `preview/pr-123-feature-name`. They are for isolated review environments and should be deleted after the PR is merged or closed.
- Use the pooled Neon connection string for normal application queries.
- Use the direct/unpooled Neon connection string for migrations and schema changes.
- Drizzle migration files are source-controlled. Generate and review migrations before applying them.
- Never run migrations against `production` unless the user has explicitly confirmed that production migration is intended.
- Production migrations and the application deploy ship together as one step, so the schema and the code that expects it change at the same time. The brief downtime this causes is acceptable and is not a reason to design around it.
- Because of that, `production` sitting behind the migrations on a feature branch is the normal state before a deploy, not drift to warn about. Do not propose backward-compatible or multi-phase migration schemes (expand/contract, temporary dual reads, compatibility shims) to avoid a mid-deploy mismatch unless the user asks for one.
- A migration that is not backward compatible — renaming or dropping a table or column, tightening a constraint — is therefore fine. Still say so plainly when a change falls into that category, since it means the previous deploy cannot be rolled back to without also reverting the schema.
- The Neon API may be used for project and branch automation, such as listing branches, creating development or preview branches, renaming branches, and fetching connection details. For endpoint details, consult the current official Neon API documentation rather than relying on memory.

### Tests

- `npm test` runs the Vitest suite (happy-dom + Testing Library). It covers the
  optimistic reducer and the component interactions, mocks the server actions,
  and needs no database. It is part of `npm run ci`.
- The GitHub `checks` job runs lint, typecheck, `npm test`, `db:check` and
  `db:migrate`, then builds. `db:migrate` runs against a throwaway Postgres
  service container, so the chain is really applied from scratch on every PR.
- `npm run test:e2e` runs the Playwright suite. It creates a throwaway Neon
  branch from `production`, migrates it, builds and starts the app against it,
  and deletes the branch afterwards. It is deliberately small: it exists to
  prove that a change survives a reload, i.e. that the server action really
  wrote to Postgres. Interaction detail belongs in the Vitest layer, which is
  roughly a thousand times faster.
- The e2e suite runs locally only, in neither `npm run ci` nor the GitHub
  workflow (see `docs/architecture.md`). Run it by hand before merging anything
  that touches a server action or a migration.
- Two selector traps in the shopping list: the delete button is `aria-hidden`
  until its row is edited, so it must be queried by label rather than by role;
  and a row in edit mode holds its name in an input value, so a row located by
  text no longer matches it.
- An added row renders optimistically before the insert finishes. Reloading
  right after can beat the write, so wait for `data-syncing` to clear first.
- `e2e/shopping-list.spec.ts` "an item checked off …" already fails on `main`.
  Pre-existing bug, not flake — don't let it block an unrelated branch.

### Tooling For Verification

- Verify UI changes by looking at rendered pixels, not only at markup and computed styles. A control can be present in the DOM, pass every CSS check, and still be invisible to a person — for example because its contrast against the background is too low.
- Interactive states (hover, focus, edit mode, optimistic/syncing states) must be verified in that state, not inferred from the code that produces them.
- To fill or click through a form: a throwaway Playwright spec in `e2e/` that screenshots the states. It waits for actionability, so keystrokes land where aimed. Delete it once the screenshots have been looked at.
- The Claude in Chrome extension (https://claude.ai/chrome) is fine for reading a page or inspecting a state already on screen, but races the re-render on controlled React forms — typed values land in the wrong fields. Switch to Playwright instead of retrying.
- Screenshots must actually be looked at, not just captured.
- Wait for CSS transitions to settle before screenshotting or reading computed styles. `transition-all` on the shared Button means an enabled button caught mid-fade looks disabled — don't report that as a bug.
- If a verification step is blocked by missing tooling, flag it to the user with the concrete name of what is needed and what it would allow, rather than silently downgrading to a weaker check. Say plainly which parts were verified and which were not.

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

The same applies to comments. Write them for someone reading the code for the
first time, who wants to know why it is like this — not for a reviewer watching
you change it.

- Most code needs no comment. Ask whether this one earns its line before writing it.
- Comment the why, not the what. If the code is hard to follow, fix the code.
- Keep it to a line or two. A comment longer than the code it explains is a sign the explanation belongs in a doc comment.
- Write about the state the code is in, not the history of how it got there. No "previously", no "now we also", no narration of the change you just made.
- Do not restate a rule that the code enforces one line below.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Verification serves the architecture, never the other way round. If you are about to change production code so a test is easier to write, less flaky or less laggy, stop: the test is wrong, not the design. Playwright is the usual culprit — a script clicking frozen coordinates is not a user, and a layout is not broken because a test harness fails to follow it.

### 7. Flag Tooling Friction

The agent loop is a thing we are actively trying to make faster. You are the one
who can see where it is slow, so say so instead of quietly routing around it.

Flag it when:
- A tool you do not have would have done the job properly, or much faster.
- A sandbox command needs approval and waiting on it blocks or slows the work.
- You cannot read something — a file, a dashboard, a log, a service — that would
  have answered a question you instead had to infer or probe for.
- You worked around a limitation. The workaround is exactly the signal: if it
  was worth building, it was worth mentioning.

Name the concrete thing and what it would have bought, the same way the
verification rule asks for. "Access to the Vercel deploy logs would have told me
why the build failed, instead of three local reproductions" is useful. "Better
tooling would help" is not.

Raise it when it happens, not only in a summary at the end, and keep it to a
line or two — it is a note to improve the setup, not a complaint. A limitation
that cost nothing is not worth mentioning.

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"
11. Silently working around a missing tool or permission instead of flagging it


### GitHub Identity and Permissions

AI development work uses the separate GitHub account `mip-ai-bot`, which is invited to the repository as a collaborator.
- Treat `mip-ai-bot` as a contributor account, not an owner or administrator. gh auth is scoped to the bot account, not the personal account so you are using it automatically.

## Pull Requests

### Pull Request Format

- Use a short, precise PR title without prefixes such as `[codex]`, `feat:`, or `fix:`.
- Treat the PR title as the future squash commit message.
- Write the PR description as a short, flat bullet list of changes.
- Use one bullet for simple PRs; add more bullets only when the change is complex enough to need them.
- Do not add subheadings to the PR description.
- Rebase the branch onto the latest `main` before opening a PR.
- Open PRs as ready for review after local verification passes; use drafts only for unfinished or exploratory work.

### Pull Request Review Handling

- Always answer questions in PR review comments by replying directly to the GitHub comment thread. Do not treat question comments as resolved until the answer is visible in the thread and the user has had a chance to decide whether it is sufficient.
- When the user challenges a decision or suggests a change, evaluate it critically instead of accepting it automatically. If the suggestion is right, apply it and acknowledge that in the thread, for example with a reply or reaction. If it is not useful, reply with the reasoning and resolve the thread only after the tradeoff is clearly explained.
- When pushing follow-up commits after review comments or requested changes, use commit messages that describe the actual change, not generic messages such as `Address PR feedback`.
- It is fine to use one commit for several small related review comments. For larger or unrelated changes, prefer separate commits per topic so the review history stays understandable.
