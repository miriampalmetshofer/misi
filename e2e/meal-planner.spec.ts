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
  async function expandMonday() {
    await expect(monday).toBeVisible();
    const toggle = monday.getByRole("button", {
      name: /Montag/,
      expanded: false,
    });
    if (await toggle.count()) await toggle.click();
  }
  await expandMonday();
  const lunch = monday.getByRole("region", { name: "Mittag", exact: true });
  const dinner = monday.getByRole("region", { name: "Abend", exact: true });
  const lunchCount = await lunch.getByRole("listitem").count();
  await dinner
    .getByRole("button", { name: /Abendessen eintragen|Eintrag hinzufügen/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Essen eintragen" }),
  ).toContainText("Montag Abend");
  await page.getByLabel("Gericht oder Essen").fill(name);
  await expect(page.getByRole("checkbox", { name: "Miriam" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Simon" })).toBeChecked();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const entry = page.getByRole("button", { name: `${name} bearbeiten` });
  await expect(entry).toBeVisible();
  await page.reload();
  await expandMonday();
  await expect(entry).toContainText("Beide");
  await expect(lunch.getByRole("listitem")).toHaveCount(lunchCount);
  const tuesday = page.getByRole("region", { name: "Dienstag, 3. November" });
  await expect(
    tuesday.getByRole("button", { name: `${name} bearbeiten` }),
  ).toHaveCount(0);

  await lunch
    .getByRole("button", { name: /Mittagessen eintragen|Eintrag hinzufügen/ })
    .click();
  await page.getByLabel("Gericht oder Essen").fill(workMeal);
  await page.getByRole("checkbox", { name: "Simon", exact: true }).uncheck();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    lunch.getByRole("button", { name: `${workMeal} bearbeiten` }),
  ).toBeVisible();
  await lunch.getByRole("button", { name: "Eintrag hinzufügen" }).click();
  await page.getByLabel("Gericht oder Essen").fill(pasta);
  await page.getByRole("checkbox", { name: "Miriam", exact: true }).uncheck();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    lunch.getByRole("button", { name: `${pasta} bearbeiten` }),
  ).toBeVisible();
  await page.reload();
  await expandMonday();
  await expect(lunch).toContainText("Miriam");
  await expect(lunch).toContainText("Simon");
  await expect(lunch.getByRole("listitem")).toHaveCount(lunchCount + 2);

  await entry.click();
  await page.getByLabel("Gericht oder Essen").fill(`${name} geändert`);
  await page.getByRole("checkbox", { name: "Miriam", exact: true }).uncheck();
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const edited = page.getByRole("button", {
    name: `${name} geändert bearbeiten`,
  });
  await expect(edited).toContainText("Simon");
  await page.reload();
  await expandMonday();
  await expect(edited).toContainText("Simon");

  await page.getByRole("link", { name: "Nächste Woche" }).click();
  await expect(page).toHaveURL(/woche=2026-11-09/);
  await expect(edited).toHaveCount(0);
  await page.goBack();
  await expandMonday();
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
  await expandMonday();
  await expect(edited).toHaveCount(0);
  await expect(lunch.getByRole("listitem")).toHaveCount(lunchCount + 2);
});
