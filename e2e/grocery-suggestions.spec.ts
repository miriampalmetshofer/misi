import { expect, test } from "@playwright/test";

test("category suggestions can be changed, used and cleared after reload", async ({ page }) => {
  await page.goto("/einkauf");
  const section = page.getByRole("region", { name: "Gebäck", exact: true });
  const name = `Testgebäck-${Date.now()}`;
  await section.getByRole("button", { name: "Gebäck: Vorschläge bearbeiten" }).click();
  await section.getByRole("textbox", { name: "Ein Vorschlag pro Zeile" }).fill(`${name}\nSemmeln\n semmeln `);
  await section.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(section.getByRole("textbox")).toHaveCount(0);
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
  await section.getByRole("textbox").fill("");
  await section.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(section.getByRole("textbox")).toHaveCount(0);
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
  await section.getByRole("textbox").fill("Eigene Änderung");
  await otherSection.getByRole("button", { name: "Haushalt: Vorschläge bearbeiten" }).click();
  await otherSection.getByRole("textbox").fill("Geteilte Änderung");
  await otherSection.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(otherSection.getByRole("textbox")).toHaveCount(0);
  await section.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(section.getByRole("alert")).toContainText("inzwischen geändert");
  await expect(section.getByRole("textbox")).toHaveValue("Eigene Änderung");
  await page.reload();
  await expect(section.getByRole("button", { name: "Geteilte Änderung schnell hinzufügen", exact: true })).toBeVisible();
  await other.close();
});
