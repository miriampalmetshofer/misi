/**
 * Create and delete short-lived Neon branches for the end-to-end tests.
 *
 * The e2e suite writes real rows, so it must not share a database with
 * dev/miriam: leftover items from a run would show up in the real list, and
 * `getShoppingListData` returns every unchecked item, so runs would see each
 * other's data. A branch per run is created from the parent, migrated, used and
 * deleted again.
 *
 *   node scripts/neon-branch.mjs create <name>   -> prints the unpooled URL
 *   node scripts/neon-branch.mjs delete <name>
 */
import { config } from "dotenv";

// quiet: the connection string is this script's stdout contract, so dotenv's
// banner must not end up in it.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const API = "https://console.neon.tech/api/v2";

const apiKey = required("NEON_API_KEY");
const projectId = required("NEON_PROJECT_ID");
const parentBranch = process.env.NEON_PREVIEW_PARENT_BRANCH ?? "production";
const databaseName = process.env.NEON_DATABASE_NAME ?? "neondb";
const roleName = process.env.NEON_DATABASE_ROLE ?? "neondb_owner";

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required to manage Neon test branches.`);
  }
  return value;
}

async function api(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Neon ${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}

async function findBranch(name) {
  const { branches } = await api(`/projects/${projectId}/branches`);
  return branches.find((branch) => branch.name === name);
}

async function create(name) {
  const parent = await findBranch(parentBranch);
  if (!parent) {
    throw new Error(`Parent branch ${parentBranch} not found.`);
  }

  // A leftover branch from an interrupted run would otherwise 409.
  const existing = await findBranch(name);
  if (existing) {
    await deleteBranch(existing.id);
  }

  const result = await api(`/projects/${projectId}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: { name, parent_id: parent.id },
      endpoints: [{ type: "read_write" }],
    }),
  });

  const uri = result.connection_uris?.find(
    (entry) =>
      entry.connection_parameters?.database === databaseName &&
      entry.connection_parameters?.role === roleName,
  );

  const connectionUri = uri?.connection_uri ?? result.connection_uris?.[0]?.connection_uri;
  if (!connectionUri) {
    throw new Error("Neon did not return a connection string for the branch.");
  }

  return connectionUri;
}

async function deleteBranch(branchId) {
  await api(`/projects/${projectId}/branches/${branchId}`, { method: "DELETE" });
}

const [command, name] = process.argv.slice(2);

if (!name) {
  throw new Error("Usage: node scripts/neon-branch.mjs <create|delete> <name>");
}

if (command === "create") {
  process.stdout.write(await create(name));
} else if (command === "delete") {
  const branch = await findBranch(name);
  if (branch) {
    await deleteBranch(branch.id);
  }
} else {
  throw new Error(`Unknown command: ${command}`);
}
