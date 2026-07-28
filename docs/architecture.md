# Architecture Decisions

This app is a private household web app for Miriam and her boyfriend. The goal is a small, maintainable system that can grow feature by feature without turning into a generic productivity platform.

## Foundational Decisions

- **Repository flow**: A public GitHub repository is the source of truth. `main` represents production; PR branches represent proposed changes.
- **Deployment flow**: PR branches get preview deployments. Merges to `main` deploy to production.
- **User model**: Use individual users, not one shared household password.
- **Data model**: Treat the app as serving one household. Do not build multi-household tenancy unless a real need appears.
- **Feature boundaries**: Features should be independent by default and use shared code for common behavior. Direct feature-to-feature dependencies are allowed when they are clearly justified and keep the product simpler.
- **Database changes**: Schema changes should go through migration files, CI validation, PR review, and then production migration.
- **AI permissions**: AI may create branches, commits, PRs, comments, and fixes. It must not bypass review, push to `main`, approve its own PRs, or access production secrets from PR workflows.
- **Privacy stance**: The code can be public, but app access, secrets, database URLs, and household data must stay private. Branching preview databases from production is acceptable for now, but preview access must stay restricted.

## Application Stack

We plan to use **Next.js**.

Why:

- It is a mature full-stack React framework.
- It works naturally with Vercel.
- It supports server-side data access through Server Components and Server Actions.
- It is a useful learning target for modern React development.

Alternatives considered:

- **React Router Framework**: simpler and more explicit route loaders/actions, but less interesting if the goal is to learn the Next.js ecosystem.
- **SvelteKit**: simpler UI model, but not the chosen direction.
- **Rails**: very productive and cohesive, but less aligned with the desired TypeScript/React learning path.

## Database

We use **PostgreSQL**, hosted on **Neon**, with **Drizzle** for typed queries and migrations.

Why:

- Household data is relational: users, lists, chores, notes, finance entries, schedules.
- PostgreSQL gives strong constraints, transactions, indexes, and mature hosting.
- Drizzle keeps queries close to SQL while still giving TypeScript safety.

Alternatives considered:

- **SQLite**: simpler, but less ideal for hosted multi-device use.
- **MongoDB**: not a strong fit because the app data is relational.

## Hosting

Planned free-tier setup:

```text
Next.js app  -> Vercel
Postgres DB  -> Neon
Source code  -> public GitHub repo
```

Why:

- Vercel is the natural hosting option for Next.js.
- Neon provides hosted Postgres with database branching.
- A public GitHub repo keeps CI, branch protection, required checks, and PR reviews available on the free plan.

## Environments

Initial environment model:

```text
Local
  App: localhost
  DB: local database or Neon dev branch

CI
  App: GitHub Actions
  DB: temporary test database or Neon branch

Preview
  App: Vercel preview deployment per PR
  DB: Neon database branch per PR, migrated before preview deployment

Production
  App: Vercel production deployment from main
  DB: Neon production branch, migrated before production deployment
```

We plan to try **Neon database branching for preview deployments**.

Decision:

- Each PR should get its own preview database branch.
- The branch may be created from production so previews are realistic.
- Preview changes must never write back to production.
- Preview branches should be deleted after PR merge/close.

Privacy tradeoff:

- Branching from production means preview databases may contain real household data.
- This is acceptable for now because the app is private, but preview access must stay restricted.
- If this becomes uncomfortable, switch to a `preview-base` branch with fake data.

## CI/CD and AI Workflow

Target flow:

```text
AI task
  -> branch
  -> draft PR
  -> local AI verification
  -> CI checks
  -> Vercel preview
  -> human preview review
  -> auto-merge after approval
  -> production deploy from main
```

Example:

1. AI builds a grocery list feature on a new branch.
2. AI verifies locally by running checks and, when useful, opening the local app.
3. AI opens a draft PR.
4. GitHub CI checks whether the code is safe to merge.
5. Vercel creates a preview deployment so Miriam can test the feature in a real browser.
6. After approval and passing checks, GitHub auto-merges the PR.
7. Vercel deploys `main` to production.

Production deployment creates a short-lived Neon restore branch before running migrations. If a migration damages production data, use that branch or Neon's point-in-time restore workflow to recover the production branch.

CI and preview have different jobs:

- **CI** is automated proof: lint, typecheck, tests, build, migration validation.
- **Preview** is a clickable deployed app for human review with its own migrated Neon branch.

We are not starting with automated browser tests against preview deployments. AI can verify locally first; preview testing can stay manual until it becomes repetitive.

Required checks before merge:

- lint
- typecheck
- tests
- production build
- migration validation

Security rules:

- AI may create branches, commits, PRs, comments, and fixes.
- AI must not push directly to `main`.
- AI must not approve its own PRs.
- Secrets, `.env` files, database URLs, and real household data must never be committed.
- PR workflows must not receive production database credentials.
- Production deploys happen only from `main`, after production migrations succeed.
- Destructive database migrations require human attention.

Migration rule:

- Prefer expand/contract changes. A production migration must be compatible with both the currently deployed app and the new app version.
- Additive migrations can deploy with the code that uses them.
- Destructive cleanup, such as dropping renamed columns or removing old tables, should happen in a later PR after production code no longer depends on the old shape.

## Deferred Decisions

- Exact auth provider or library.
- Backup and restore process.
- Whether to add a permanent staging environment later.
