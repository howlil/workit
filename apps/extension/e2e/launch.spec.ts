import { test, expect, chromium } from "@playwright/test";
import path from "node:path";
import http from "node:http";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../../../fixtures");

let server: http.Server;
let serverPort: number;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const safePath = path.normalize(req.url || "/").replace(/^(\.\.[\/\\])+/, "");
    let filePath = path.join(fixturesDir, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime = ext === ".html" ? "text/html" : "text/plain";
      res.writeHead(200, { "Content-Type": mime });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        serverPort = addr.port;
      }
      resolve();
    });
  });
});

test.afterAll(async () => {
  server.close();
});

test.describe("S1 — Floating Launcher E2E", () => {
  test("loads in Chromium, renders 44x44 launcher in ShadowRoot, toggles popup", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/spa-fixture/index.html`);

    // 1. Verify host and launcher mount
    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await expect(launcher).toBeVisible();

    // 2. Geometry check (44x44px)
    const box = await launcher.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(44);
    expect(Math.round(box!.height)).toBe(44);

    // 3. Click launcher -> opens popup
    await launcher.click();
    const popup = workitHost.locator('[data-testid="workit-popup"]');
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Workit");
    await expect(popup).toContainText("No job detected");

    // 4. Escape -> closes popup
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();

    // 5. Test SPA navigation (clicking link that uses history.pushState)
    await page.click('text="Job Page"');
    await page.waitForTimeout(400);

    // Verify launcher still exists and is single instance
    const hostCount = await page.locator("#workit-root").count();
    expect(hostCount).toBe(1);
    await expect(launcher).toBeVisible();

    await context.close();
  });

  test("maintains complete style isolation under aggressive hostile CSS", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/hostile-css.html`);

    // Verify host page button is affected by hostile CSS (red background)
    const pageButton = page.locator("body > button");
    const pageBtnColor = await pageButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(pageBtnColor).toBe("rgb(255, 0, 0)"); // red

    // Verify Workit launcher is unaffected by hostile CSS
    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await expect(launcher).toBeVisible();

    const box = await launcher.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(44);
    expect(Math.round(box!.height)).toBe(44);

    // Verify launcher background is white, NOT red
    const launcherBg = await launcher.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(launcherBg).toBe("rgb(255, 255, 255)"); // #FFFFFF

    // Verify launcher can be opened even on hostile page
    await launcher.click();
    const popup = workitHost.locator('[data-testid="workit-popup"]');
    await expect(popup).toBeVisible();

    // Verify popup background is white, NOT magenta/unstyled
    const popupBg = await popup.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(popupBg).toBe("rgb(255, 255, 255)");

    await context.close();
  });
});
