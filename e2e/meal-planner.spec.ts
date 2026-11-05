import { expect, test } from "@playwright/test";

test("independent meals and people persist across reloads and week navigation", async ({
  page,
}) => {
  const token = Date.now();
  const name = `Curry ${token}`;
  const workMeal = `Essen in der Arbeit ${token}`;
  const pasta = `Pasta ${token}`;
  await page.goto("/");
  await page.getByRole("link", { name: /^Speiseplan/ }).click();
  await page.goto("/speiseplan?woche=2026-11-02");
  const monday = page.getByRole("region", { name: "Montag, 2. November" });
  const lunch = monday.getByRole("region", { name: "Mittag", exact: true });
  const dinner = monday.getByRole("region", { name: "Abend", exact: true });
  const lunchCount = await lunch.getByRole("listitem").count();
  await dinner
    .getByRole("button", { name: /Abendessen eintragen|Eintrag hinzufügen/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Essen eintragen" }),
  ).toContainText("Montag, 2. November 2026 · Abend");
  await page.getByLabel("Gericht oder Essen").fill(name);
  await expect(page.getByRole("radio", { name: "Wir beide" })).toBeChecked();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const entry = page.getByRole("button", { name: `${name} bearbeiten` });
  await expect(entry).toBeVisible();
  await page.reload();
  await expect(entry).toContainText("Wir beide");
  await expect(lunch.getByRole("listitem")).toHaveCount(lunchCount);
  const tuesday = page.getByRole("region", { name: "Dienstag, 3. November" });
  await expect(
    tuesday.getByRole("button", { name: `${name} bearbeiten` }),
  ).toHaveCount(0);

  await lunch
    .getByRole("button", { name: /Mittagessen eintragen|Eintrag hinzufügen/ })
    .click();
  await page.getByLabel("Gericht oder Essen").fill(workMeal);
  await page.getByRole("radio", { name: "Miriam", exact: true }).check();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    lunch.getByRole("button", { name: `${workMeal} bearbeiten` }),
  ).toBeVisible();
  await lunch.getByRole("button", { name: "Eintrag hinzufügen" }).click();
  await page.getByLabel("Gericht oder Essen").fill(pasta);
  await page.getByRole("radio", { name: "Simon", exact: true }).check();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    lunch.getByRole("button", { name: `${pasta} bearbeiten` }),
  ).toBeVisible();
  await page.reload();
  await expect(lunch).toContainText("Miriam");
  await expect(lunch).toContainText("Simon");
  await expect(lunch.getByRole("listitem")).toHaveCount(lunchCount + 2);

  await entry.click();
  await page.getByLabel("Gericht oder Essen").fill(`${name} geändert`);
  await page.getByRole("radio", { name: "Simon", exact: true }).check();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const edited = page.getByRole("button", {
    name: `${name} geändert bearbeiten`,
  });
  await expect(edited).toContainText("Simon");
  await page.reload();
  await expect(edited).toContainText("Simon");

  await page.getByRole("link", { name: "Nächste Woche" }).click();
  await expect(page).toHaveURL(/woche=2026-11-09/);
  await expect(edited).toHaveCount(0);
  await page.goBack();
  await expect(edited).toBeVisible();
  await edited.click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("button", { name: "Zurück" }).click();
  await page.getByRole("button", { name: "Abbrechen" }).click();
  await expect(edited).toBeVisible();
  await edited.click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(edited).toHaveCount(0);
  await page.reload();
  await expect(edited).toHaveCount(0);
  await expect(lunch.getByRole("listitem")).toHaveCount(lunchCount + 2);
});
