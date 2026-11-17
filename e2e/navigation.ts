import type { Page } from "@playwright/test";

async function waitForHydration(page: Page) {
  // Next attaches this element in a client effect after the router has mounted.
  await page.locator("next-route-announcer").waitFor({ state: "attached" });
}

export async function openPage(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page);
}

export async function reloadPage(page: Page) {
  await page.reload();
  await waitForHydration(page);
}
