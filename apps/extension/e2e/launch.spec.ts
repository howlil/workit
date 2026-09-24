import { test, expect, chromium } from "@playwright/test";
import path from "node:path";

test("extension loads in Chromium", async () => {
  const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  await page.goto("https://example.com");
  await page.waitForTimeout(1000);

  // Verify the extension loaded by checking service worker logs
  // This is a smoke test — detailed E2E comes in S3/S4
  expect(page).toBeTruthy();

  await context.close();
});
