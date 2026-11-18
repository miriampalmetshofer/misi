import { openPage, reloadPage } from "./navigation";
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
  await page.getByLabel("Miriam", { exact: true }).fill("256,4");
  await page.getByLabel("Simon", { exact: true }).fill("352,2");
  await page.getByLabel("Gemeinsam").fill("273,8");
  await page.getByLabel("Auto", { exact: true }).fill("1052,4");
  await page.getByLabel("Betrag").fill(amount);

  await page.getByRole("button", { name: "Speichern" }).click();

  // The save blocks on the insert, so the row only appears once the server
  // action has come back — no need to wait out an optimistic row first.
  await expect(historyRow(page, amount)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await openPage(page, "/tanken");
  await expect(
    page.getByRole("heading", { name: "Auto", exact: true }),
  ).toBeVisible();
});

test("a saved fill-up survives a reload", async ({ page }) => {
  const amount = uniqueAmount();

  await saveFillUp(page, amount);
  await reloadPage(page);

  const row = historyRow(page, amount);
  await expect(row).toBeVisible();
  await row.getByRole("button", { expanded: false }).click();
  await expect(row).toContainText("Bezahlt von Miriam");
  await expect(row.getByRole("checkbox")).toHaveCount(0);
});

test("a saved fill-up keeps the split that was on screen", async ({ page }) => {
  const amount = uniqueAmount();

  await saveFillUp(page, amount);
  // The amounts are recomputed server-side, so this is the check that the
  // stored split matches the one the calculator showed before saving.
  const shares = await historyRow(page, amount).textContent();
  await reloadPage(page);

  await expect(historyRow(page, amount)).toHaveText(shares ?? "");
});

test("a deleted fill-up stays gone after a reload", async ({ page }) => {
  const amount = uniqueAmount();

  await saveFillUp(page, amount);

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

  await reloadPage(page);
  await expect(historyRow(page, amount)).toHaveCount(0);
});

test("sub-cent fuel bills must be corrected before they can be saved", async ({ page }, testInfo) => {
  await page.getByLabel("Miriam", { exact: true }).fill("101");
  await page.getByLabel("Simon", { exact: true }).fill("99");
  await page.getByLabel("Auto", { exact: true }).fill("200");
  await page.getByLabel("Betrag", { exact: true }).fill("1,005");
  await expect(page.getByRole("button", { name: "Speichern", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Bezahlt" }).getByRole("alert")).toContainText("höchstens zwei Nachkommastellen");
  await expect(page.getByLabel("Betrag", { exact: true })).toHaveValue("1,005");
  await page.screenshot({ path: testInfo.outputPath("fuel-precision-error.png"), fullPage: true });
  await page.getByLabel("Betrag", { exact: true }).fill("1,01");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: "1,01 €" });
  await expect(row).toContainText("Miriam 0,51 € · Simon 0,50 €");
  await reloadPage(page);
  await expect(row).toContainText("Miriam 0,51 € · Simon 0,50 €");
});
