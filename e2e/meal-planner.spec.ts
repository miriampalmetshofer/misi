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
  await expect(page.getByLabel("Gericht oder Essen")).toBeFocused();
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
  await expect(page.getByRole("dialog")).toBeFocused();
  await expect(page.getByLabel("Gericht oder Essen")).not.toBeFocused();
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

test("an older edit cannot overwrite or delete a newer meal", async ({
  page,
}) => {
  const original = `Pasta ${Date.now()}`;
  const changed = `Curry ${Date.now()}`;
  await page.goto("/speiseplan");
  const day = page.getByRole("region").filter({ hasText: "Heute" }).last();
  const dinner = day.getByRole("region", { name: "Abend", exact: true });
  await dinner
    .getByRole("button", { name: /Abendessen eintragen|Eintrag hinzufügen/ })
    .click();
  await page.getByLabel("Gericht oder Essen").fill(original);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `${original} bearbeiten` }),
  ).toBeVisible();

  const other = await page.context().newPage();
  try {
    await other.goto("/speiseplan");
    await other.getByRole("button", { name: `${original} bearbeiten` }).click();
    await page.getByRole("button", { name: `${original} bearbeiten` }).click();
    await page.getByLabel("Gericht oder Essen").fill(changed);
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(
      page.getByRole("button", { name: `${changed} bearbeiten` }),
    ).toBeVisible();

    await other.getByRole("checkbox", { name: "Miriam" }).uncheck();
    await other.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(other.getByRole("alert")).toContainText(
      "inzwischen geändert oder gelöscht",
    );
    await expect(other.getByLabel("Gericht oder Essen")).toHaveValue(original);
    await expect(other.getByRole("checkbox", { name: "Simon" })).toBeChecked();
    await expect(
      other.getByRole("checkbox", { name: "Miriam" }),
    ).not.toBeChecked();
    await other.getByRole("button", { name: "Löschen", exact: true }).click();
    await other.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(other.getByRole("alert")).toContainText(
      "inzwischen geändert oder gelöscht",
    );
    await expect(other.getByLabel("Gericht oder Essen")).toHaveValue(original);
    await other.getByRole("button", { name: "Schließen" }).click();
    await other.reload();
    const saved = other.getByRole("button", { name: `${changed} bearbeiten` });
    await expect(saved).toContainText("Beide");
    await expect(
      other.getByRole("button", { name: `${original} bearbeiten` }),
    ).toHaveCount(0);
  } finally {
    await other.close();
  }
});

test("the meal overlay fits the visible area when a keyboard opens", async ({
  page,
}) => {
  await page.goto("/speiseplan");
  const day = page.getByRole("region").filter({ hasText: "Heute" }).last();
  await day
    .getByRole("region", { name: "Mittag", exact: true })
    .getByRole("button", { name: /Mittagessen eintragen|Eintrag hinzufügen/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(page.getByLabel("Gericht oder Essen")).toBeFocused();
  await page.getByLabel("Gericht oder Essen").fill("Pasta");

  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(viewport, "offsetTop", {
      configurable: true,
      value: 48,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return box !== null && box.y >= 64 && box.y + box.height <= 392;
    })
    .toBe(true);
  await expect(
    dialog.getByRole("button", { name: "Speichern", exact: true }),
  ).toBeInViewport();

  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      value: 260,
    });
    Object.defineProperty(viewport, "offsetTop", {
      configurable: true,
      value: 80,
    });
    viewport.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return box !== null && box.y >= 96 && box.y + box.height <= 324;
    })
    .toBe(true);
  const save = dialog.getByRole("button", { name: "Speichern", exact: true });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await page.getByRole("button", { name: "Schließen" }).click();
});
