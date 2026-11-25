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

test("a dragged meal keeps its new day and meal after reload", async ({
  page,
}) => {
  const name = `Verschieben ${Date.now()}`;
  await page.goto("/speiseplan?woche=2026-11-02");
  const monday = page.getByRole("region", { name: "Montag, 2. November" });
  const tuesday = page.getByRole("region", { name: "Dienstag, 3. November" });
  for (const day of [monday, tuesday]) {
    const toggle = day.getByRole("button", { expanded: false });
    if (await toggle.count()) await toggle.click();
  }
  await monday
    .getByRole("button", { name: /Mittagessen eintragen|Eintrag hinzufügen/ })
    .first()
    .click();
  await page.getByLabel("Gericht oder Essen").fill(name);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  const meal = page.getByRole("button", { name: `${name} bearbeiten` });
  await expect(meal).toBeVisible();
  await meal.scrollIntoViewIfNeeded();
  const target = tuesday.getByRole("region", { name: "Abend", exact: true });
  // Adjacent days fit together on desktop, so the test does not need to scroll during the hold.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await target.scrollIntoViewIfNeeded();
  const from = await meal.boundingBox();
  const to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(from!.x + 20, from!.y + 20);
  await page.mouse.down();
  await expect(meal.locator("..")).toHaveAttribute("data-dragging", "true");
  await page.mouse.move(to!.x + 30, to!.y + 30, { steps: 8 });
  await expect(target).toHaveAttribute("data-drop-target", "true");
  await page.mouse.up();
  await expect(
    target.getByRole("button", { name: `${name} bearbeiten` }),
  ).toBeEnabled();
  await page.reload();
  const toggle = tuesday.getByRole("button", { expanded: false });
  if (await toggle.count()) await toggle.click();
  await expect(
    target.getByRole("button", { name: `${name} bearbeiten` }),
  ).toContainText("Beide");
});

test("saved dish products are reused and reviewed before they reach the grocery list", async ({ page }) => {
  const suffix = Date.now();
  const pizza = `Pizza ${suffix}`;
  const mozzarella = `Mozzarella Mini ${suffix}`;
  const pastedMozzarella = `Mozzarella\u00a0Mini ${suffix}`;
  const sauce = `Tomatensauce ${suffix}`;
  const week = "/speiseplan?woche=2038-10-11";
  await page.goto(week);
  const monday = page.getByRole("region", { name: "Montag, 11. Oktober" });
  const dinner = monday.getByRole("region", { name: "Abend", exact: true });
  const products = page.getByRole("textbox", { name: /Produkte für den Einkauf/ });
  const save = page.getByRole("button", { name: "Speichern", exact: true });

  await dinner.getByRole("button", { name: /Abendessen eintragen|Eintrag hinzufügen/ }).click();
  await page.getByLabel("Gericht oder Essen").fill(`Piza ${suffix}`);
  await page.locator("summary").filter({ hasText: "Produkte für den Einkauf" }).click();
  await products.fill(`2x ${pastedMozzarella}\n${sauce}`);
  await page.getByLabel("Gericht oder Essen").fill(pizza);
  await expect(products).toHaveValue(`2x ${pastedMozzarella}\n${sauce}`);
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.reload();
  await dinner.getByRole("button", { name: "Eintrag hinzufügen" }).click();
  await page.getByLabel("Gericht oder Essen").fill(pizza);
  await page.locator("summary").filter({ hasText: "Produkte für den Einkauf" }).click();
  await expect(products).toHaveValue(`2× ${pastedMozzarella}\n${sauce}`);
  await products.fill(`2x ${mozzarella}\n${sauce}`);
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const prepare = page.getByRole("button", { name: "Einkauf vorbereiten" });
  const review = page.getByRole("dialog", { name: "Einkauf vorbereiten" });
  const apply = review.getByRole("button", { name: "Auswahl übernehmen" });
  await prepare.click();
  await expect(review.getByLabel(`Stückzahl für ${mozzarella}`)).toHaveValue("4");
  await review.getByRole("checkbox", { name: sauce }).uncheck();
  await review.getByLabel(`Stückzahl für ${mozzarella}`).fill("3");
  const other = await page.context().newPage();
  await other.goto(week);
  await other.getByRole("button", { name: "Einkauf vorbereiten" }).click();
  await expect(other.getByRole("checkbox", { name: mozzarella })).toBeChecked();
  await apply.click();
  await expect(review.getByRole("status")).toHaveText("Auswahl übernommen.");
  await other.getByRole("button", { name: "Auswahl übernehmen" }).click();
  await expect(other.getByRole("alert")).toContainText("Die Einkaufsliste wurde inzwischen geändert.");
  await other.close();

  await review.getByRole("link", { name: "Zur Einkaufsliste" }).click();
  await expect(page).toHaveURL(/\/einkauf$/);
  await page.reload();
  await expect(page.getByRole("button", { name: `3× ${mozzarella}`, exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: new RegExp(sauce) })).toHaveCount(0);

  const grocery = page.getByRole("button", { name: `3× ${mozzarella}`, exact: true });
  await grocery.click();
  const groceryName = page.getByRole("textbox", { name: /Mozzarella Mini.*bearbeiten/ });
  await groceryName.fill(`3x ${pastedMozzarella}`);
  await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/einkauf",
    ),
    groceryName.press("Enter"),
  ]);

  await page.goto(week);
  await prepare.click();
  const existing = review.getByRole("listitem").filter({ hasText: mozzarella });
  await expect(existing).toContainText("3 auf der Liste · 4 für den Speiseplan");
  await expect(existing.getByRole("checkbox")).not.toBeChecked();
  await review.getByRole("checkbox", { name: sauce }).uncheck();
  await expect(apply).toBeDisabled();
  await existing.getByRole("checkbox").check();
  await apply.click();
  await expect(review.getByRole("status")).toHaveText("Auswahl übernommen.");
  await review.getByRole("link", { name: "Zur Einkaufsliste" }).click();
  await expect(page).toHaveURL(/\/einkauf$/);
  await page.reload();
  await expect(page.getByRole("button", { name: `4× ${pastedMozzarella}`, exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: `3× ${pastedMozzarella}`, exact: true })).toHaveCount(0);
});
