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
    expect(pageBtnColor).toBe("rgb(255, 0, 0)");

    // Verify Workit launcher is unaffected by hostile CSS
    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await expect(launcher).toBeVisible();

    const box = await launcher.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(44);
    expect(Math.round(box!.height)).toBe(44);

    const launcherBg = await launcher.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(launcherBg).toBe("rgb(255, 255, 255)");

    await launcher.click();
    const popup = workitHost.locator('[data-testid="workit-popup"]');
    await expect(popup).toBeVisible();

    const popupBg = await popup.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(popupBg).toBe("rgb(255, 255, 255)");

    await context.close();
  });
});

test.describe("S2 — Job Detection E2E", () => {
  test("detects JSON-LD job, shows launcher indicator dot, and renders candidate in popup", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/jobs/json-ld-complete.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // Verify indicator dot appears on launcher
    const dot = workitHost.locator('[data-testid="workit-indicator-dot"]');
    await expect(dot).toBeVisible({ timeout: 5000 });

    // Open popup
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    const popup = workitHost.locator('[data-testid="workit-popup"]');
    await expect(popup).toBeVisible();

    // Verify extracted job content
    await expect(workitHost.locator('[data-testid="workit-strategy-badge"]')).toHaveText("JSON-LD");
    await expect(workitHost.locator('[data-testid="workit-job-title"]')).toHaveText("Software Engineer");
    await expect(workitHost.locator('[data-testid="workit-job-company"]')).toHaveText("Example Corp");
    await expect(workitHost.locator('[data-testid="workit-job-location"]')).toContainText("Jakarta");
    await expect(workitHost.locator('[data-testid="workit-chip-arrangement"]')).toHaveText("remote");
    await expect(workitHost.locator('[data-testid="workit-chip-type"]')).toHaveText("FULL_TIME");
    await expect(workitHost.locator('[data-testid="workit-save-job-btn"]')).toBeVisible();

    await context.close();
  });

  test("detects generic job page fallback from DOM signals", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/jobs/generic-job.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // Verify indicator dot appears on launcher
    const dot = workitHost.locator('[data-testid="workit-indicator-dot"]');
    await expect(dot).toBeVisible({ timeout: 5000 });

    // Open popup
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    // Verify generic extraction values
    await expect(workitHost.locator('[data-testid="workit-strategy-badge"]')).toHaveText("Generic");
    await expect(workitHost.locator('[data-testid="workit-job-title"]')).toHaveText("Data Analyst");
    await expect(workitHost.locator('[data-testid="workit-job-company"]')).toHaveText("Acme Corp");
    await expect(workitHost.locator('[data-testid="workit-job-location"]')).toHaveText("Bandung, Indonesia");
    await expect(workitHost.locator('[data-testid="workit-save-job-btn"]')).toBeVisible();

    await context.close();
  });

  test("does not detect non-job page", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/jobs/non-job.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // Wait briefly for detection to complete
    await page.waitForTimeout(500);

    // Verify NO indicator dot
    const dot = workitHost.locator('[data-testid="workit-indicator-dot"]');
    await expect(dot).toBeHidden();

    // Open popup -> verify "No job detected"
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    const popup = workitHost.locator('[data-testid="workit-popup"]');
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("No job detected");

    await context.close();
  });
});

test.describe("S3 — Capture + Persist Opportunity E2E", () => {
  test("golden path: open job -> save job -> transitions to saved -> reload -> recognized as Saved", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/jobs/json-ld-complete.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // Open popup
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    // 1. Verify "Save job" button is visible and click it
    const saveBtn = workitHost.locator('[data-testid="workit-save-job-btn"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 2. Verify popup transitions to "Saved ✓" and displays "I'm applying" button
    const savedView = workitHost.locator('[data-testid="workit-saved-view"]');
    await expect(savedView).toBeVisible({ timeout: 5000 });
    await expect(savedView).toContainText("Saved ✓");

    const applyingBtn = workitHost.locator('[data-testid="workit-applying-btn"]');
    await expect(applyingBtn).toBeVisible();
    await expect(applyingBtn).toHaveText("I'm applying");

    // 3. Reload the page (simulating user revisiting this job opportunity)
    await page.reload();

    const reloadedHost = page.locator("#workit-root");
    await expect(reloadedHost).toBeAttached({ timeout: 5000 });

    // 4. Open launcher again
    const reloadedLauncher = reloadedHost.locator('[data-testid="workit-launcher"]');
    await reloadedLauncher.click();

    // 5. Popup immediately recognizes the saved job!
    const reloadedSavedView = reloadedHost.locator('[data-testid="workit-saved-view"]');
    await expect(reloadedSavedView).toBeVisible({ timeout: 5000 });
    await expect(reloadedSavedView).toContainText("Saved ✓");
    await expect(reloadedHost.locator('[data-testid="workit-applying-btn"]')).toBeVisible();

    await context.close();
  });
});
