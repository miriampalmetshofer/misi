import { expect, test } from "@playwright/test";

test("Quitt expenses and dated repayments persist and can be edited and deleted", async ({
  page,
}) => {
  const name = `Quitt Test ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("link", { name: /Quitt/ }).click();
  await expect(
    page.getByText("Gemeinsame Ausgaben", { exact: true }),
  ).toBeVisible();
  const balance = page.getByRole("region", { name: "Balance" });
  const initialBalance = await balance.innerText();
  await page
    .getByRole("button", { name: "Ausgabe eintragen", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Ausgabe eintragen" }),
  ).toBeVisible();
  await page.getByLabel("Beschreibung", { exact: true }).fill(name);
  await page.getByLabel("Betrag (€)", { exact: true }).fill("48,00");
  await page.getByLabel("Datum des Einkaufs").fill("2026-11-16");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText("48,00");
  await page.reload();
  await expect(row).toContainText("16.11.2026");
  await expect(row).toContainText("Miriam · für beide");
  await row.getByRole("button").click();
  await expect(
    page.getByRole("dialog", { name: "Eintrag bearbeiten" }),
  ).toBeFocused();
  await page.getByLabel("Betrag (€)", { exact: true }).fill("50,00");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(row).toContainText("50,00");
  await page.reload();
  await expect(row).toContainText("50,00");

  await page
    .getByRole("button", { name: "Rückzahlung erfassen", exact: true })
    .click();
  await page
    .getByLabel("Beschreibung", { exact: true })
    .fill(`${name} Rückzahlung`);
  await page.getByLabel("Betrag (€)", { exact: true }).fill("25");
  await page.getByRole("radio", { name: "Simon", exact: true }).check();
  await page.getByLabel("Datum der Rückzahlung").fill("2026-11-17");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const repayment = page
    .getByRole("listitem")
    .filter({ hasText: `${name} Rückzahlung` });
  await expect(repayment).toContainText("Simon an Miriam");
  await page.reload();
  await expect(repayment).toContainText("17.11.2026");
  await expect(balance).toHaveText(initialBalance.replaceAll("\n", ""));
  for (const description of [`${name} Rückzahlung`, name]) {
    await page
      .getByRole("button", { name: `${description} bearbeiten`, exact: true })
      .click();
    await page.getByRole("button", { name: "Löschen", exact: true }).click();
    await page
      .getByRole("button", { name: "Endgültig löschen", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: `${description} bearbeiten`,
        exact: true,
      }),
    ).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});
