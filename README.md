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

For local development, set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the Neon `dev/miriam` branch.

Use:

- `DATABASE_URL` for normal app queries. This should be the pooled Neon connection string.
- `DATABASE_URL_UNPOOLED` for migrations and schema changes. This should be the direct Neon connection string.

Do not commit real secrets or connection strings.

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

Before running `db:migrate`, verify that local environment values point to `dev/miriam`, not `production`.

## CI/CD

GitHub Actions runs CI on pull requests and pushes to `main`.

CI checks:

- lint
- typecheck
- Drizzle migration validation
- production build

Deployment runs through Vercel after CI passes:

- Pull requests from this repository create a Neon preview branch, run migrations on that branch, and then create a Vercel preview deployment with that branch's database URLs.
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

Optional GitHub repository variables:

- `NEON_DATABASE_NAME`, defaults to `misi`
- `NEON_DATABASE_ROLE`, defaults to `neondb_owner`
- `NEON_PREVIEW_PARENT_BRANCH`, defaults to `production`
- `NEON_PRODUCTION_BRANCH`, defaults to `production`

Preview branches and production restore branches expire after 14 days. Production restore branches are created before migrations so the production database can be restored with Neon branch restore or point-in-time recovery if a migration causes data problems.

Schema-changing releases must keep migrations backward compatible with the currently deployed app. Destructive cleanup, such as dropping a column that old production code still reads, should ship in a later PR after the code no longer depends on it.
