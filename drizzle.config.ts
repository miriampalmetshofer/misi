import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

// DRIZZLE_MIGRATE_URL wins when set, so a caller (the e2e global setup) can
// migrate a throwaway branch without the .env files pulling it back to dev.
const databaseUrl =
  process.env.DRIZZLE_MIGRATE_URL ?? process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED (or DRIZZLE_MIGRATE_URL) is required for Drizzle migrations.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
