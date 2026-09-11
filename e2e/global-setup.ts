import { execFileSync, spawn, type ChildProcess } from "node:child_process";

import { PORT, TEST_BRANCH_NAME } from "./branch-name";

let server: ChildProcess | undefined;

/**
 * Create a throwaway Neon branch, migrate it, then build and start the app
 * against it. Teardown stops the server and deletes the branch.
 *
 * The server is started here rather than through Playwright's `webServer`
 * option because that starts before globalSetup runs, which is too early: the
 * branch it needs to connect to does not exist yet.
 */
export default async function globalSetup() {
  const connectionUri = execFileSync(
    "node",
    ["scripts/neon-branch.mjs", "create", TEST_BRANCH_NAME],
    { encoding: "utf8" },
  ).trim();

  // drizzle.config.ts loads the .env files itself, which would override
  // DATABASE_URL_UNPOOLED back to dev/miriam. DRIZZLE_MIGRATE_URL wins there.
  execFileSync("npx", ["drizzle-kit", "migrate"], {
    stdio: "inherit",
    env: { ...process.env, DRIZZLE_MIGRATE_URL: connectionUri },
  });

  // An explicit DATABASE_URL beats the .env file that Next loads for itself.
  // The same url serves queries and migrations: a throwaway branch has no need
  // for a separate pooled connection.
  const env = { ...process.env, DATABASE_URL: connectionUri };

  execFileSync("npm", ["run", "build"], { stdio: "inherit", env });

  server = spawn("npm", ["run", "start", "--", "--port", String(PORT)], {
    env,
    stdio: "inherit",
  });

  await waitForServer();
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${PORT}/einkauf`);
      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`The app did not come up on port ${PORT}.`);
}

export function stopServer() {
  server?.kill();
}
