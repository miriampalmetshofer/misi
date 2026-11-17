import { openPage, reloadPage } from "./navigation";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

async function readBalance(page: Page) {
  const region = page.getByRole("region", { name: "Balance" });
  const amount = await region.locator("p").nth(1).innerText();
  const cents = Math.round(Number(amount.replace(/[^\d,]/g, "").replace(",", ".")) * 100);
  return (await region.innerText()).includes("Miriam schuldet Simon") ? -cents : cents;
}

async function expectBalance(page: Page, expected: number) {
  await expect.poll(() => readBalance(page)).toBe(expected);
}

test("auto costs, partial repayment and historical edits share a persistent balance", async ({ page }) => {
  const name = `Auto Quitt ${Date.now()}`;
  const client = new Client({ connectionString: process.env.E2E_DATABASE_URL });
  await client.connect();
  // A NULL payer is how the migration preserves the already settled history.
  const { rows: [legacy] } = await client.query<{ id: string }>(
    `insert into car_expense (spent_on, description, total_amount, miriam_percent,
      miriam_amount, simon_amount) values ('2026-11-16', $1, 100, 40, 40, 60) returning id`,
    [`${name} Altbestand`],
  );
  try {
    await openPage(page, "/quitt");
    const initial = await readBalance(page);
    await expect(page.getByText(`${name} Altbestand`)).toHaveCount(0);

    await openPage(page, `/auto?bereich=ausgaben&eintrag=${legacy.id}`);
    const oldRow = page.getByRole("listitem").filter({ hasText: `${name} Altbestand` });
    await expect(oldRow).toContainText("Altbestand · bereits ausgeglichen");
    await oldRow.getByRole("button", { name: /bearbeiten/ }).click();
    await expect(page.getByLabel("Bezahlt von")).toHaveCount(0);
    await page.getByLabel("Gesamtkosten").fill("120");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(oldRow).toContainText("120,00");
    await openPage(page, "/quitt");
    await expectBalance(page, initial);
    await expect(page.getByText(`${name} Altbestand`)).toHaveCount(0);
    const { rows: [savedLegacy] } = await client.query("select paid_by from car_expense where id = $1", [legacy.id]);
    expect(savedLegacy.paid_by).toBeNull();

    await openPage(page, "/auto?bereich=ausgaben");
    await page.getByRole("button", { name: "Eintrag hinzufügen" }).click();
    await page.getByLabel("Was wurde gemacht oder gekauft?").fill(name);
    await page.getByLabel("Gesamtkosten").fill("100");
    await page.getByLabel("Anteil Miriam", { exact: true }).fill("40");
    await page.getByLabel("Bezahlt von").selectOption("simon");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    const newRepair = page.getByRole("listitem").filter({ hasText: name }).filter({ hasNotText: "Altbestand" });
    await expect(newRepair).toBeVisible();
    await newRepair.getByRole("button", { expanded: false }).click();
    await newRepair.getByRole("link", { name: "Quitt", exact: true }).click();
    await expectBalance(page, initial - 4000);
    const repairLink = page.getByRole("link", { name: `${name} im Auto-Bereich ansehen`, exact: true });
    await expect(repairLink).toContainText("Simon");
    await repairLink.click();
    const repair = page.getByRole("listitem").filter({ hasText: name }).filter({ hasNotText: "Altbestand" });
    await expect(repair.getByRole("button", { expanded: true })).toBeVisible();
    await repair.getByRole("button", { name: /bearbeiten/ }).click();
    await page.getByLabel("Gesamtkosten").fill("125");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(repair).toContainText("125,00");
    await repair.getByRole("link", { name: "Quitt", exact: true }).click();
    await expectBalance(page, initial - 5000);

    await openPage(page, "/auto");
    await page.getByLabel("Miriam", { exact: true }).fill("100");
    await page.getByLabel("Simon", { exact: true }).fill("300");
    await page.getByLabel("Auto", { exact: true }).fill("400");
    await page.getByLabel("Betrag", { exact: true }).fill("80");
    await page.getByLabel("Bezahlt von").selectOption("miriam");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    const savedFuel = page.getByRole("listitem").filter({ hasText: "Miriam 20,00 € · Simon 60,00 €" });
    await expect(savedFuel).toBeVisible();
    await savedFuel.getByRole("button", { expanded: false }).click();
    await savedFuel.getByRole("link", { name: "Quitt", exact: true }).click();
    await expectBalance(page, initial + 1000);
    const fuelLink = page.getByRole("link", { name: "Tanken im Auto-Bereich ansehen", exact: true }).filter({ hasText: "80,00" });
    await fuelLink.click();
    const fuel = page.getByRole("listitem").filter({ hasText: "Miriam 20,00 € · Simon 60,00 €" });
    await expect(fuel.getByRole("button", { expanded: true })).toBeVisible();
    await expect(fuel.getByRole("checkbox")).toHaveCount(0);
    await openPage(page, "/quitt");
    await page.getByRole("button", { name: "Rückzahlung erfassen" }).click();
    await page.getByLabel("Beschreibung", { exact: true }).fill(`${name} Teilzahlung`);
    await page.getByLabel("Betrag (€)").fill("3");
    await page.getByRole("radio", { name: "Simon", exact: true }).check();
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expectBalance(page, initial + 700);
    await reloadPage(page);
    await expectBalance(page, initial + 700);
    await expect(page.getByRole("link", { name: `${name} im Auto-Bereich ansehen`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tanken im Auto-Bereich ansehen" }).filter({ hasText: "80,00" })).toBeVisible();

    await page.getByRole("button", { name: "Rückzahlung erfassen" }).click();
    await page.getByLabel("Beschreibung", { exact: true }).fill(`${name} Restzahlung`);
    await page.getByLabel("Betrag (€)").fill("7");
    await page.getByRole("radio", { name: "Simon", exact: true }).check();
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expectBalance(page, initial);
    await reloadPage(page);
    await expectBalance(page, initial);
    await expect(page.getByRole("link", { name: `${name} im Auto-Bereich ansehen`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tanken im Auto-Bereich ansehen" }).filter({ hasText: "80,00" })).toBeVisible();
  } finally {
    await client.end();
  }
});
