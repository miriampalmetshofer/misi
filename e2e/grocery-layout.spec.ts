import { expect, test } from "@playwright/test";

test("quick-entry footer leaves the last item accessible with enlarged text", async ({ page }) => {
  await page.goto("/einkauf");
  const input = page.getByRole("textbox", { name: "Artikel hinzufügen", exact: true });
  const name = `Layout-${Date.now()}`;
  await input.fill(name);
  await input.press("Enter");
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row).not.toHaveAttribute("data-syncing", "true");

  for (const size of [16, 24]) {
    await page.evaluate((fontSize) => {
      document.documentElement.style.fontSize = `${fontSize}px`;
    }, size);
    // Allow reflow and scroll anchoring to settle before scrolling to the end.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeInViewport();
    const rowBox = await row.boundingBox();
    const footerBox = await footer.boundingBox();
    expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(footerBox!.y);
  }
});
