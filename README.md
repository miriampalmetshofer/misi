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
npm run build
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
