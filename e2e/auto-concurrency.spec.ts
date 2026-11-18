import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { openPage, reloadPage } from "./navigation";

async function balance(page: Page) {
  const region = page.getByRole("region", { name: "Balance" });
  const amount = await region.locator("p").nth(1).innerText();
  const cents = Math.round(Number(amount.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
  return (await region.innerText()).includes("Miriam schuldet Simon") ? -cents : cents;
}

test("stale repair edits and deletions preserve the corrected payer and balance", async ({ page, context }, testInfo) => {
  const name = `Concurrent repair ${Date.now()}`;
  const stalePage = await context.newPage();
  const db = new Client({ connectionString: process.env.E2E_DATABASE_URL });
  await db.connect();
  try {
    await openPage(page, "/quitt");
    const initialBalance = await balance(page);
    await openPage(page, "/auto?bereich=ausgaben");
    await page.getByRole("button", { name: "Eintrag hinzufügen" }).click();
    await page.getByLabel("Was wurde gemacht oder gekauft?").fill(name);
    await page.getByLabel("Gesamtkosten").fill("100");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    const row = page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toBeVisible();
    const id = (await row.getAttribute("id"))!.replace("eintrag-", "");
    await row.getByRole("button", { expanded: false }).click();
    await row.getByRole("button", { name: `${name} bearbeiten` }).click();
    await openPage(stalePage, `/auto?bereich=ausgaben&eintrag=${id}`);
    await stalePage.getByRole("button", { name: `${name} bearbeiten` }).click();
    await page.getByLabel("Bezahlt von").selectOption("simon");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByRole("form")).toHaveCount(0);

    await stalePage.getByLabel("Notiz").fill("Notiz aus dem alten Formular");
    await stalePage.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(stalePage.getByRole("form").getByRole("alert")).toContainText("inzwischen geändert oder gelöscht");
    await expect(stalePage.getByLabel("Notiz")).toHaveValue("Notiz aus dem alten Formular");
    await stalePage.screenshot({ path: testInfo.outputPath("repair-conflict.png"), fullPage: true });
    await stalePage.getByRole("form").getByRole("button", { name: "Löschen", exact: true }).click();
    const dialog = stalePage.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Löschen", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("inzwischen geändert oder gelöscht");
    const saved = await db.query("select paid_by, version, note from car_expense where id = $1", [id]);
    expect(saved.rows).toEqual([{ paid_by: "simon", version: 2, note: "" }]);
    await openPage(page, "/quitt");
    await expect.poll(() => balance(page)).toBe(initialBalance - 5000);

    await reloadPage(stalePage);
    await stalePage.getByRole("button", { name: `${name} bearbeiten` }).click();
    await expect(stalePage.getByLabel("Bezahlt von")).toHaveValue("simon");
    await stalePage.getByLabel("Notiz").fill("Notiz mit aktueller Version");
    await stalePage.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(stalePage.getByRole("form")).toHaveCount(0);
    const retried = await db.query("select paid_by, version, note from car_expense where id = $1", [id]);
    expect(retried.rows).toEqual([{ paid_by: "simon", version: 3, note: "Notiz mit aktueller Version" }]);
    await reloadPage(page);
    await expect.poll(() => balance(page)).toBe(initialBalance - 5000);
  } finally {
    await stalePage.close();
    await db.end();
  }
});
