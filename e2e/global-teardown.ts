import { execFileSync } from "node:child_process";

import { TEST_BRANCH_NAME } from "./branch-name";
import { stopServer } from "./global-setup";

export default function globalTeardown() {
  stopServer();
  execFileSync("node", ["scripts/neon-branch.mjs", "delete", TEST_BRANCH_NAME], {
    stdio: "inherit",
  });
}
