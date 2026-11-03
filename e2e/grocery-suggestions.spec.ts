import { expect, test } from "@playwright/test";

test("category suggestions can be changed, used and cleared after reload", async ({ page }) => {
  await page.goto("/einkauf");
  const section = page.getByRole("region", { name: "Gebäck", exact: true });
  const name = `Testgebäck-${Date.now()}`;
  await section.getByRole("button", { name: "Gebäck: Vorschläge bearbeiten" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Neuer Vorschlag" }).fill(name);
  await dialog.getByRole("button", { name: "Vorschlag hinzufügen" }).click();
  await dialog.getByRole("textbox", { name: "Neuer Vorschlag" }).fill("Semmeln");
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(section.getByRole("button", { name: `${name} schnell hinzufügen`, exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: "Semmeln schnell hinzufügen", exact: true })).toHaveCount(1);
  await section.getByRole("button", { name: `${name} schnell hinzufügen`, exact: true }).click();
  const row = section.getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row).not.toHaveAttribute("data-syncing", "true");
  await page.reload();
  await expect(row).toBeVisible();
  await expect(section.getByRole("button", { name: `${name} schnell hinzufügen`, exact: true })).toHaveCount(0);
  await section.getByRole("button", { name: "Gebäck: Vorschläge bearbeiten" }).click();
  while (await dialog.getByRole("button", { name: /entfernen$/ }).count()) {
    await dialog.getByRole("button", { name: /entfernen$/ }).first().click();
  }
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(section.getByRole("button", { name: "Semmeln schnell hinzufügen", exact: true })).toHaveCount(0);
  await expect(section.getByRole("button", { name: "Gebäck: Vorschläge bearbeiten" })).toBeVisible();
});

test("a concurrent edit does not overwrite the other person's suggestions", async ({ page, context }) => {
  await page.goto("/einkauf");
  const other = await context.newPage();
  await other.goto("/einkauf");
  const section = page.getByRole("region", { name: "Haushalt", exact: true });
  const otherSection = other.getByRole("region", { name: "Haushalt", exact: true });
  await section.getByRole("button", { name: "Haushalt: Vorschläge bearbeiten" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Neuer Vorschlag" }).fill("Eigene Änderung");
  await otherSection.getByRole("button", { name: "Haushalt: Vorschläge bearbeiten" }).click();
  const otherDialog = other.getByRole("dialog");
  await otherDialog.getByRole("textbox", { name: "Neuer Vorschlag" }).fill("Geteilte Änderung");
  await otherDialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(otherDialog).toHaveCount(0);
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("inzwischen geändert");
  await expect(dialog.getByRole("textbox", { name: "Neuer Vorschlag" })).toHaveValue("Eigene Änderung");
  await page.reload();
  await expect(section.getByRole("button", { name: "Geteilte Änderung schnell hinzufügen", exact: true })).toBeVisible();
  await other.close();
});
