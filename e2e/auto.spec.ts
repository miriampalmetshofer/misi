import { expect, test } from "@playwright/test";

test("an expense can be created, edited and deleted across reloads", async ({
  page,
}) => {
  const description = `Winterreifen ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("link", { name: /^Auto/ }).click();
  await page.getByRole("link", { name: "Reparaturen & Einkäufe" }).click();
  await page.getByRole("button", { name: "Eintrag hinzufügen" }).click();
  await page.getByLabel("Datum", { exact: true }).fill("2026-10-24");
  await page.getByLabel("Was wurde gemacht oder gekauft?").fill(description);
  await page.getByLabel("Gesamtkosten").fill("480");
  await page.getByLabel("Anteil Miriam", { exact: true }).fill("40");
  await page.getByLabel("Notiz").fill("Werkstatt");
  await expect(page.getByLabel("Anteil Simon", { exact: true })).toHaveValue(
    "60",
  );
  await expect(page.getByLabel("Eurobetrag Miriam")).toHaveText(/192,00/);
  await expect(page.getByLabel("Eurobetrag Simon")).toHaveText(/288,00/);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: description });
  await expect(row).toBeVisible();
  await page.reload();
  await expect(row).toContainText("24.10.2026");
  await expect(row).toContainText("480,00");
  await row.getByRole("button", { expanded: false }).click();
  await expect(row).toContainText("Werkstatt");
  await row.getByRole("checkbox", { name: "Zahlung beglichen" }).click();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await page.reload();
  await expect(row.getByRole("button", { expanded: false })).toContainText(
    "Zahlung beglichen",
  );
  await row.getByRole("button", { expanded: false }).click();
  await expect(row.getByRole("checkbox")).toBeChecked();

  await row.getByRole("button", { name: /bearbeiten/ }).click();
  await expect(page.getByLabel("Anteil Miriam", { exact: true })).toHaveValue(
    "40",
  );
  await page.getByLabel("Datum", { exact: true }).fill("2026-10-25");
  await page.getByLabel("Gesamtkosten").fill("500");
  await page.getByLabel("Anteil Simon", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(row).toContainText("500,00");
  await page.reload();
  await expect(row).toContainText("25.10.2026");
  await row.getByRole("button", { expanded: false }).click();
  await expect(row).toContainText("Miriam · 75 %");
  await expect(row).toContainText("375,00");
  await expect(row).toContainText("125,00");
  await expect(row.getByRole("checkbox")).toBeChecked();
  await row.getByRole("checkbox").click();
  await expect(row.getByRole("checkbox")).not.toBeChecked();
  await page.reload();
  await expect(row.getByRole("button", { expanded: false })).not.toContainText(
    "Zahlung beglichen",
  );
  await row.getByRole("button", { expanded: false }).click();
  await expect(row.getByRole("checkbox")).not.toBeChecked();

  await row.getByRole("button", { name: /bearbeiten/ }).click();
  await page
    .getByRole("form", { name: "Eintrag bearbeiten" })
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Abbrechen" })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(row).toBeVisible();
  await page
    .getByRole("form", { name: "Eintrag bearbeiten" })
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Löschen", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(row).toHaveCount(0);
});

test("old fuel links keep their overview and the sections support browser back", async ({
  page,
}) => {
  await page.goto("/tanken?ansicht=uebersicht");
  await expect(page).toHaveURL(/\/auto\?ansicht=uebersicht$/);
  await expect(
    page.getByRole("link", { name: "Übersicht", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Reparaturen & Einkäufe" }).click();
  await expect(
    page.getByRole("heading", { name: "Reparaturen & Einkäufe" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Übersicht", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
