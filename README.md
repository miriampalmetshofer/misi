# Misi

Private household web app for shared everyday planning.

## Setup

Install dependencies:

```bash
npm install
```

This project pins the expected Node/npm versions in `.mise.toml` and `package.json`. With `mise` shell activation enabled, the configured runtime is selected automatically when commands are run from this directory.

Without `mise`, install a compatible Node version before running the normal npm commands.

## Environment

Create a local env file from the template:

```bash
cp .env.example .env
```

For local development, set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to a Neon dev branch (`dev/miriam`).

Use:

- `DATABASE_URL` for normal app queries. This should be the pooled Neon connection string.
- `DATABASE_URL_UNPOOLED` for migrations and schema changes. This should be the direct Neon connection string.

## App Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run ci
```

## Database Commands

Generate a migration after changing the Drizzle schema:

```bash
npm run db:generate
```

Check generated migrations:

```bash
npm run db:check
```

Apply migrations to the database configured in `.env`:

```bash
npm run db:migrate
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## CI/CD

GitHub Actions runs CI on pull requests and pushes to `main`.

CI checks:

- lint
- typecheck
- Drizzle migration validation
- production build

Deployment runs through Vercel after automated checks pass:

- Pull requests from this repository run CI checks, then create a Neon preview branch, run migrations on that branch, and create a Vercel preview deployment with that branch's database URLs.
- Closed pull requests delete their Neon preview branch.
- Pushes to `main` create a temporary Neon production restore branch, run production migrations, and then create the Vercel production deployment.

GitHub repository secrets required:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEON_API_KEY`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`

GitHub repository variables required:

- `NEON_PROJECT_ID`
- `NEON_DATABASE_NAME`
- `NEON_DATABASE_ROLE`
- `NEON_PREVIEW_PARENT_BRANCH`
- `NEON_PRODUCTION_BRANCH`

Preview branches and production restore branches expire after 14 days. Production restore branches are created before migrations so the production database can be restored with Neon branch restore or point-in-time recovery if a migration causes data problems.

Schema-changing releases must keep migrations backwards compatible with the currently deployed app (otherwise there will be downtime). Destructive cleanup, such as dropping a column that old production code still reads, should ship in a later PR after the code no longer depends on it.
