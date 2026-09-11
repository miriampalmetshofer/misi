/** One Neon branch per run, shared by global setup and teardown. */
export const TEST_BRANCH_NAME = process.env.E2E_NEON_BRANCH ?? "e2e/local";

export const PORT = 3100;
