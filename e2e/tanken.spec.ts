import { expect, test, type Page } from "@playwright/test";

/**
 * Same reason as the shopping-list suite: proving a fill-up survives a reload,
 * i.e. that the server action really wrote to Postgres. The calculator's own
 * behaviour is covered far more cheaply in src/features/fuel/.
 */

/** Amounts are unique per run so a failed run cannot poison the next one. */
function uniqueAmount() {
  // Cents-level uniqueness inside a plausible fill-up, e.g. "87,31".
  return `${80 + Math.floor(Math.random() * 20)},${String(
    Math.floor(Math.random() * 100),
  ).padStart(2, "0")}`;
}

function historyRow(page: Page, amount: string) {
  return page.getByRole("listitem").filter({ hasText: `${amount} €` });
}

async function saveFillUp(page: Page, amount: string) {
  await page.getByLabel("Miriam").fill("256,4");
  await page.getByLabel("Simon").fill("352,2");
  await page.getByLabel("Beide").fill("273,8");
  await page.getByLabel("Gesamt").fill("1052,4");
  await page.getByLabel("Betrag").fill(amount);

  await page.getByRole("button", { name: "Speichern" }).click();

  // The row shows up optimistically before the insert finishes. Reloading at
  // that point can beat the write, so wait for the syncing flag to clear —
  // that is the UI saying the server action has come back.
  await expect(historyRow(page, amount)).toBeVisible();
  await expect(historyRow(page, amount)).not.toHaveAttribute(
    "data-syncing",
    "true",
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/tanken");
  await expect(page.getByRole("heading", { name: "Tanken" })).toBeVisible();
});

test("a saved fill-up survives a reload", async ({ page }) => {
  const amount = uniqueAmount();

  await saveFillUp(page, amount);
  await page.reload();

  await expect(historyRow(page, amount)).toBeVisible();
});

test("a saved fill-up keeps the split that was on screen", async ({ page }) => {
  const amount = uniqueAmount();

  await saveFillUp(page, amount);
  // The amounts are recomputed server-side, so this is the check that the
  // stored split matches the one the calculator showed before saving.
  const shares = await historyRow(page, amount).textContent();
  await page.reload();

  await expect(historyRow(page, amount)).toHaveText(shares ?? "");
});

test("a deleted fill-up stays gone after a reload", async ({ page }) => {
  const amount = uniqueAmount();

  await saveFillUp(page, amount);
  // Reload first so the delete targets a real database row, not a pending one.
  await page.reload();

  await historyRow(page, amount)
    .getByRole("button", { name: /löschen/ })
    .click();

  // Deleting a settled fill-up is confirmed first, so the row only goes once
  // the dialog is accepted.
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen" })
    .click();
  await expect(historyRow(page, amount)).toHaveCount(0);

  await page.reload();
  await expect(historyRow(page, amount)).toHaveCount(0);
});
