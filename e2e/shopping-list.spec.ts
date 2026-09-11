import { expect, test, type Page } from "@playwright/test";

/**
 * These tests exist for one reason the component tests cannot cover: proving
 * that a change survives a reload, i.e. that the server action really wrote to
 * Postgres and `revalidatePath` served the new data back. Interaction detail
 * (Escape, blur, draft handling) is covered far more cheaply in
 * src/features/grocery/ShoppingList.test.tsx.
 */

/** Item names are unique per run so a failed run cannot poison the next one. */
function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** The row for an item, scoped so the name does not also match the check button. */
function row(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

/**
 * Put a row into edit mode by tapping its name. Anchored on the page rather
 * than the row: in edit mode the name lives in an input value, so a row located
 * by its text no longer matches.
 */
async function startEditing(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

async function addItem(page: Page, category: string, name: string) {
  const section = page.getByRole("region", { name: category });
  await section.getByRole("button", { name: /hinzufügen/i }).click();

  const input = section.getByRole("textbox");
  await input.fill(name);
  await input.press("Enter");

  // The row shows up optimistically before the insert finishes. Reloading at
  // that point can beat the write, so wait for the syncing flag to clear —
  // that is the UI saying the server action has come back.
  await expect(page.getByText(name)).toBeVisible();
  await expect(row(page, name)).not.toHaveAttribute("data-syncing", "true");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/einkauf");
  await expect(
    page.getByRole("heading", { name: "Einkaufsliste" }),
  ).toBeVisible();
});

test("an added item survives a reload", async ({ page }) => {
  const name = uniqueName("Semmeln");

  await addItem(page, "Gebäck", name);
  await page.reload();

  await expect(page.getByText(name)).toBeVisible();
});

test("a draft saved by tapping + survives a reload", async ({ page }) => {
  const name = uniqueName("Bananen");
  const section = page.getByRole("region", { name: "Gebäck" });
  const plus = section.getByRole("button", { name: /hinzufügen/i });

  await plus.click();
  await section.getByRole("textbox").fill(name);
  // Tap + instead of pressing Enter: the save rides on the input's blur, and
  // only a real browser orders that blur against the click. Worth an e2e test
  // even though the component test covers the same flow.
  await plus.click();

  await expect(row(page, name)).not.toHaveAttribute("data-syncing", "true");
  await page.reload();

  await expect(page.getByText(name)).toBeVisible();
});

test("a renamed item keeps its new name after a reload", async ({ page }) => {
  const name = uniqueName("Apfel");
  const renamed = `${name}-gruen`;

  await addItem(page, "Obst", name);
  // Reload first so the rename targets a real database row, not a pending one.
  await page.reload();

  await startEditing(page, name);
  const input = page.getByRole("textbox");
  await input.fill(renamed);
  await input.press("Enter");
  await expect(row(page, renamed)).not.toHaveAttribute("data-syncing", "true");

  await page.reload();
  await expect(page.getByText(renamed)).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});

test("a deleted item stays gone after a reload", async ({ page }) => {
  const name = uniqueName("Mehl");

  await addItem(page, "Sonstiges", name);
  await page.reload();

  await startEditing(page, name);
  // By label, not role: the button is aria-hidden until the row is edited, so
  // it has no role to query even once it is on screen.
  await page.getByLabel(`${name} löschen`).click();
  await expect(page.getByText(name)).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("an item checked off leaves the list and stays off it", async ({
  page,
}) => {
  const name = uniqueName("Milch");

  await addItem(page, "Kühlregal", name);
  await page.reload();

  await page
    .getByRole("button", { name: `${name} erledigt markieren` })
    .click();
  await expect(page.getByText(name)).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(name)).toHaveCount(0);
});
