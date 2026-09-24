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

test.describe("S4 — Jobs Workspace E2E", () => {
  test("end-to-end: capture job in popup -> browse workspace -> view details -> filter by state", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    // 1. Capture a job first
    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/jobs/json-ld-complete.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    const saveBtn = workitHost.locator('[data-testid="workit-save-job-btn"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    const savedView = workitHost.locator('[data-testid="workit-saved-view"]');
    await expect(savedView).toBeVisible({ timeout: 5000 });

    // 2. Open Workspace page via extension URL
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    // 3. Verify Workspace shell (Sidebar + Title + Filter chips)
    await expect(wsPage.locator('[data-testid="workspace-sidebar"]')).toBeVisible();
    await expect(wsPage.locator('[data-testid="nav-jobs"]')).toHaveClass(/is-active/);
    await expect(wsPage.locator("h1")).toHaveText("Opportunities");

    // 4. Verify Table renders the saved opportunity
    const table = wsPage.locator('[data-testid="jobs-table"]');
    await expect(table).toBeVisible({ timeout: 5000 });

    const rowTitle = wsPage.locator('[data-testid="opp-row-title"]');
    await expect(rowTitle).toHaveText("Software Engineer");

    const rowStatus = wsPage.locator('[data-testid="opp-row-status"]');
    await expect(rowStatus).toHaveText("saved");

    // 5. Click the row -> SelectedJobPreview opens
    await rowTitle.click();

    const preview = wsPage.locator('[data-testid="selected-job-preview"]');
    await expect(preview).toBeVisible({ timeout: 5000 });

    await expect(wsPage.locator('[data-testid="preview-title"]')).toHaveText("Software Engineer");
    await expect(wsPage.locator('[data-testid="preview-company"]')).toHaveText("Example Corp");
    await expect(wsPage.locator('[data-testid="preview-description"]')).toContainText(
      "TypeScript or JavaScript"
    );

    const openOriginal = wsPage.locator('[data-testid="preview-open-original"]');
    await expect(openOriginal).toBeVisible();

    // 6. Test state filtering
    // Click "Closed" filter -> row should disappear, empty state should show
    await wsPage.click('[data-testid="filter-closed"]');
    await expect(wsPage.locator('[data-testid="jobs-empty-state"]')).toBeVisible({ timeout: 5000 });

    // Click "All" filter -> row should reappear
    await wsPage.click('[data-testid="filter-all"]');
    await expect(wsPage.locator('[data-testid="jobs-table"]')).toBeVisible({ timeout: 5000 });
    await expect(wsPage.locator('[data-testid="opp-row-title"]')).toHaveText("Software Engineer");

    await context.close();
  });
});

test.describe("S5 — Career Profile E2E", () => {
  test("edit career profile identity, experiences, and skills -> reload workspace -> canonical values persist", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    // 1. Navigate to Profile tab
    const profileNav = wsPage.locator('[data-testid="nav-profile"]');
    await expect(profileNav).toBeVisible({ timeout: 5000 });
    await profileNav.click();

    // 2. Verify ProfileView is mounted
    const profileView = wsPage.locator('[data-testid="profile-view"]');
    await expect(profileView).toBeVisible({ timeout: 5000 });

    // 3. Edit Personal Identity fields
    const fullNameInput = wsPage.locator('[data-testid="input-fullname"]');
    await fullNameInput.fill("Jane Doe");

    const emailInput = wsPage.locator('[data-testid="input-email"]');
    await emailInput.fill("jane.doe@workit.dev");

    const locationInput = wsPage.locator('[data-testid="input-location"]');
    await locationInput.fill("Jakarta, Indonesia");

    const linkedinInput = wsPage.locator('[data-testid="input-linkedin"]');
    await linkedinInput.fill("https://linkedin.com/in/janedoe");

    // 4. Click explicit "Save Identity" button
    const saveIdentityBtn = wsPage.locator('[data-testid="btn-save-identity"]');
    await saveIdentityBtn.click();

    const saveStatus = wsPage.locator('[data-testid="identity-save-status"]');
    await expect(saveStatus).toBeVisible();
    await expect(saveStatus).toContainText("Identity saved ✓");

    // 5. Add a Work Experience with Facts
    await wsPage.locator('[data-testid="input-exp-company"]').fill("GoTo Financial");
    await wsPage.locator('[data-testid="input-exp-title"]').fill("Lead Software Engineer");
    await wsPage.locator('[data-testid="input-exp-location"]').fill("Jakarta");
    await wsPage.locator('[data-testid="input-exp-start"]').fill("2021-03");
    await wsPage.locator('[data-testid="input-exp-current"]').check();
    await wsPage.locator('[data-testid="input-exp-facts"]').fill("Built RBAC for three roles\nScaled API to 10k requests/second");

    await wsPage.locator('[data-testid="btn-add-experience"]').click();

    // Verify added experience and its facts appear in the list
    await expect(wsPage.locator('[data-testid="experience-list"]')).toContainText("Lead Software Engineer");
    await expect(wsPage.locator('[data-testid="experience-list"]')).toContainText("GoTo Financial");
    await expect(wsPage.locator('[data-testid="experience-facts-list"]')).toContainText("Built RBAC for three roles");
    await expect(wsPage.locator('[data-testid="experience-facts-list"]')).toContainText("Scaled API to 10k requests/second");

    // 6. Add a Skill and Save Skills
    await wsPage.locator('[data-testid="input-skill-entry"]').fill("Rust");
    await wsPage.locator('[data-testid="btn-add-skill-tag"]').click();
    await expect(wsPage.locator('[data-testid="skill-chip-Rust"]')).toBeVisible();

    await wsPage.locator('[data-testid="btn-save-skills"]').click();
    await expect(wsPage.locator('[data-testid="skills-save-status"]')).toBeVisible();

    // 7. RELOAD the Workspace (Critical S5 Verification)
    await wsPage.reload();

    // Navigate to Profile again
    await wsPage.locator('[data-testid="nav-profile"]').click();
    await expect(wsPage.locator('[data-testid="profile-view"]')).toBeVisible({ timeout: 5000 });

    // 8. Assert exact canonical values are preserved across reload!
    await expect(wsPage.locator('[data-testid="input-fullname"]')).toHaveValue("Jane Doe");
    await expect(wsPage.locator('[data-testid="input-email"]')).toHaveValue("jane.doe@workit.dev");
    await expect(wsPage.locator('[data-testid="input-location"]')).toHaveValue("Jakarta, Indonesia");
    await expect(wsPage.locator('[data-testid="input-linkedin"]')).toHaveValue("https://linkedin.com/in/janedoe");

    // Assert experience and facts persisted
    await expect(wsPage.locator('[data-testid="experience-list"]')).toContainText("Lead Software Engineer");
    await expect(wsPage.locator('[data-testid="experience-facts-list"]')).toContainText("Built RBAC for three roles");

    // Assert skills persisted
    await expect(wsPage.locator('[data-testid="skill-chip-Rust"]')).toBeVisible();

    await context.close();
  });
});

test.describe("S6 — Basic Autofill E2E", () => {
  test("scans application form, generates plan from profile, and autofills controlled and native inputs with verification", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    // 1. Setup profile values in workspace first
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    await wsPage.locator('[data-testid="nav-profile"]').click();
    await wsPage.locator('[data-testid="input-fullname"]').fill("Jane Doe");
    await wsPage.locator('[data-testid="input-email"]').fill("jane.doe@workit.dev");
    await wsPage.locator('[data-testid="input-phone"]').fill("+1 555-0199");
    await wsPage.locator('[data-testid="input-location"]').fill("Jakarta, Indonesia");
    await wsPage.locator('[data-testid="input-linkedin"]').fill("https://linkedin.com/in/janedoe");
    await wsPage.locator('[data-testid="input-portfolio"]').fill("https://janedoe.dev");
    await wsPage.locator('[data-testid="input-summary"]').fill("Passionate engineer building accessible web applications.");
    await wsPage.locator('[data-testid="btn-save-identity"]').click();
    await expect(wsPage.locator('[data-testid="identity-save-status"]')).toBeVisible();

    // 2. Open job application form fixture page
    const formPage = await context.newPage();
    await formPage.goto(`http://localhost:${serverPort}/forms/application-form.html`);

    const workitHost = formPage.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // 3. Open Workit Popup
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    const popup = workitHost.locator('[data-testid="workit-popup"]');
    await expect(popup).toBeVisible();

    // 4. Verify Autofill Assistant is rendered with detected fields
    const autofillSection = workitHost.locator('[data-testid="workit-autofill-section"]');
    await expect(autofillSection).toBeVisible({ timeout: 5000 });

    await expect(workitHost.locator('[data-testid="autofill-ready-count"]')).toBeVisible();
    await expect(workitHost.locator('[data-testid="autofill-item-full_name"]')).toContainText("Jane Doe");
    await expect(workitHost.locator('[data-testid="autofill-item-email"]')).toContainText("jane.doe@workit.dev");
    await expect(workitHost.locator('[data-testid="autofill-item-phone"]')).toContainText("+1 555-0199");
    await expect(workitHost.locator('[data-testid="autofill-item-location"]')).toContainText("Jakarta, Indonesia");
    await expect(workitHost.locator('[data-testid="autofill-item-linkedin"]')).toContainText("https://linkedin.com/in/janedoe");
    await expect(workitHost.locator('[data-testid="autofill-item-portfolio"]')).toContainText("https://janedoe.dev");

    // 5. Click "Auto-fill Application"
    const autofillBtn = workitHost.locator('[data-testid="workit-autofill-btn"]');
    await autofillBtn.click();

    // 6. Verify success confirmation in popup
    const successMsg = workitHost.locator('[data-testid="autofill-success-msg"]');
    await expect(successMsg).toBeVisible({ timeout: 5000 });
    await expect(successMsg).toContainText("filled & verified ✓");

    // 7. Verify DOM values directly on the host webpage!
    await expect(formPage.locator("#applicant-name")).toHaveValue("Jane Doe");
    await expect(formPage.locator("#applicant-email")).toHaveValue("jane.doe@workit.dev");
    await expect(formPage.locator("#applicant-phone")).toHaveValue("+1 555-0199");
    await expect(formPage.locator("#applicant-location")).toHaveValue("Jakarta, Indonesia");
    await expect(formPage.locator("#applicant-linkedin")).toHaveValue("https://linkedin.com/in/janedoe");
    await expect(formPage.locator("#applicant-portfolio")).toHaveValue("https://janedoe.dev");
    await expect(formPage.locator("#applicant-summary")).toHaveValue("Passionate engineer building accessible web applications.");

    // 8. Crucial check: verify controlled input synced state tracker got notified
    const controlledDisplay = formPage.locator("#linkedin-synced-state");
    await expect(controlledDisplay).toHaveText("State: https://linkedin.com/in/janedoe");

    await context.close();
  });
});

test.describe("S7 — Application Lifecycle + Historical Snapshot E2E", () => {
  test("saved opportunity -> start application (applying) -> confirm submission -> transitions to applied -> visible under applied filter in workspace", async () => {
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

    // 1. Open popup and save the job
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    const saveBtn = workitHost.locator('[data-testid="workit-save-job-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    const savedView = workitHost.locator('[data-testid="workit-saved-view"]');
    await expect(savedView).toBeVisible({ timeout: 5000 });

    // 2. Click "I'm applying" -> starts application
    const applyingBtn = workitHost.locator('[data-testid="workit-applying-btn"]');
    await expect(applyingBtn).toBeVisible();
    await applyingBtn.click();

    // 3. Verify transition to applying state and submission confirmation prompt
    await expect(workitHost.locator('[data-testid="applying-status-chip"]')).toBeVisible({ timeout: 5000 });
    const submissionBox = workitHost.locator('[data-testid="workit-submission-box"]');
    await expect(submissionBox).toBeVisible();

    const confirmSubmitBtn = workitHost.locator('[data-testid="workit-confirm-submit-btn"]');
    await expect(confirmSubmitBtn).toBeVisible();

    // 4. Click "Confirm Submission ✓"
    await confirmSubmitBtn.click();

    // 5. Verify transition to "Applied ✓"
    const appliedBadge = workitHost.locator('[data-testid="applied-status-badge"]');
    await expect(appliedBadge).toBeVisible({ timeout: 5000 });

    // 6. Navigate to Workspace
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    // 7. Click "Applied" filter chip
    await wsPage.click('[data-testid="filter-applied"]');

    // 8. Assert opportunity row appears with status "applied"
    const oppTable = wsPage.locator('[data-testid="jobs-table"]');
    await expect(oppTable).toBeVisible({ timeout: 5000 });

    const rowTitle = wsPage.locator('[data-testid="opp-row-title"]');
    await expect(rowTitle).toHaveText("Software Engineer");

    const rowStatus = wsPage.locator('[data-testid="opp-row-status"]');
    await expect(rowStatus).toHaveText("applied");

    await context.close();
  });
});

test.describe("S8 — Answer Memory E2E", () => {
  test("saves reusable answer in workspace -> suggests answer on matching application form question -> fills and verifies textarea", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    // 1. Open Workspace and go to Answers
    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    await wsPage.click('[data-testid="nav-answers"]');
    await expect(wsPage.locator('[data-testid="answers-view"]')).toBeVisible({ timeout: 5000 });

    // 2. Add reusable answer
    await wsPage.click('[data-testid="btn-add-answer"]');
    await expect(wsPage.locator('[data-testid="add-answer-form"]')).toBeVisible();

    await wsPage.fill('[data-testid="input-new-question"]', "Why do you want to work at our company?");
    await wsPage.fill(
      '[data-testid="input-new-answer"]',
      "I am excited to build scalable developer tooling that empowers engineers."
    );
    await wsPage.fill('[data-testid="input-new-category"]', "motivation");
    await wsPage.click('[data-testid="btn-save-answer-submit"]');

    await expect(wsPage.locator('[data-testid="answer-save-success"]')).toBeVisible({ timeout: 5000 });
    await expect(wsPage.locator('text="Why do you want to work at our company?"')).toBeVisible();

    // 3. Open application form with employer questions
    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/forms/application-form.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // 4. Open Workit Popup
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    // 5. Verify Answer Memory section is suggested
    const answerSection = workitHost.locator('[data-testid="workit-answer-memory-section"]');
    await expect(answerSection).toBeVisible({ timeout: 5000 });

    // 6. Click "Use Answer"
    const useAnswerBtn = workitHost.locator('[data-testid="btn-use-answer"]');
    await expect(useAnswerBtn).toBeVisible();
    await useAnswerBtn.click();

    // 7. Verify Answer in host textarea
    const motivationTextarea = page.locator("#applicant-motivation");
    await expect(motivationTextarea).toHaveValue(
      "I am excited to build scalable developer tooling that empowers engineers."
    );

    // 8. Verify popup status updated to "Filled & verified ✓"
    await expect(workitHost.locator('text="Filled & verified ✓"')).toBeVisible();

    await context.close();
  });
});

test.describe("S9 — Evidence Match E2E", () => {
  test("analyzes job requirements against career profile facts and displays canonical evidence breakdown", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    // 1. Open Workspace and set up profile skills
    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    await wsPage.click('[data-testid="nav-profile"]');
    await expect(wsPage.locator('[data-testid="profile-view"]')).toBeVisible({ timeout: 5000 });

    // 2. Add skill "TypeScript"
    await wsPage.fill('[data-testid="input-skill-entry"]', "TypeScript");
    await wsPage.click('[data-testid="btn-add-skill-tag"]');
    await wsPage.click('[data-testid="btn-save-skills"]');
    await expect(wsPage.locator('[data-testid="skills-save-status"]')).toBeVisible({ timeout: 5000 });

    // 3. Open job page (which requires TypeScript & REST APIs)
    const page = await context.newPage();
    await page.goto(`http://localhost:${serverPort}/jobs/json-ld-complete.html`);

    const workitHost = page.locator("#workit-root");
    await expect(workitHost).toBeAttached({ timeout: 5000 });

    // 4. Open Workit Popup
    const launcher = workitHost.locator('[data-testid="workit-launcher"]');
    await launcher.click();

    // 5. Verify match score badge is visible in popup
    const matchBadge = workitHost.locator('[data-testid="workit-match-badge"]');
    await expect(matchBadge).toBeVisible({ timeout: 5000 });

    // 6. Save the job
    const saveBtn = workitHost.locator('[data-testid="workit-save-job-btn"]');
    await saveBtn.click();
    await expect(workitHost.locator('[data-testid="workit-saved-view"]')).toBeVisible({ timeout: 5000 });

    // 7. Return to Workspace -> Jobs Table
    await wsPage.bringToFront();
    await wsPage.click('[data-testid="nav-jobs"]');
    const jobsTable = wsPage.locator('[data-testid="jobs-table"]');
    await expect(jobsTable).toBeVisible({ timeout: 5000 });

    // 8. Click on the saved opportunity row
    const rowTitle = wsPage.locator('[data-testid="opp-row-title"]').first();
    await rowTitle.click();

    // 9. Assert Requirement Match card in SelectedJobPreview
    const matchCard = wsPage.locator('[data-testid="evidence-match-card"]');
    await expect(matchCard).toBeVisible({ timeout: 5000 });

    const overallScore = wsPage.locator('[data-testid="overall-match-score"]');
    await expect(overallScore).toBeVisible();

    // 10. Assert match items and canonical evidence summary
    const matchedItems = wsPage.locator('[data-testid="match-item-matched"]');
    await expect(matchedItems.first()).toBeVisible({ timeout: 5000 });

    const evidenceSummary = wsPage.locator('[data-testid="evidence-summary"]').first();
    await expect(evidenceSummary).toBeVisible();
    await expect(evidenceSummary).toContainText("Evidence:");

    const factIdTag = wsPage.locator('[data-testid="evidence-fact-id"]').first();
    await expect(factIdTag).toBeVisible();

    await context.close();
  });
});

test.describe("S10 — Resume Import E2E", () => {
  test("paste resume text -> parse draft proposal -> review draft -> confirm populate profile -> persists across reload", async () => {
    const extensionPath = path.resolve(__dirname, "../.output/chrome-mv3");

    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];

    const wsPage = await context.newPage();
    await wsPage.goto(`chrome-extension://${extensionId}/workspace.html`);

    // 1. Navigate to Profile tab
    await wsPage.click('[data-testid="nav-profile"]');
    await expect(wsPage.locator('[data-testid="profile-view"]')).toBeVisible({ timeout: 5000 });

    // 2. Paste raw resume text into import zone
    const sampleResume = `
Jordan Lee
Austin, TX
jordan.lee@example.com | (512) 555-0144
https://linkedin.com/in/jordanlee

SUMMARY
Senior Cloud Architect with extensive experience building fault-tolerant microservices.

EXPERIENCE
Principal Engineer at CloudVenture
Jan 2021 - Present
• Designed distributed streaming architecture using Apache Kafka and Redis.
• Reduced operational cloud infrastructure spend by 28%.

EDUCATION
B.S. in Computer Science - University of Texas at Austin
2013 - 2017

SKILLS
TypeScript, Go, Kubernetes, Terraform, Docker, Kafka
    `.trim();

    const resumeInput = wsPage.locator('[data-testid="textarea-resume-text"]');
    await expect(resumeInput).toBeVisible();
    await resumeInput.fill(sampleResume);

    // 3. Click Parse Resume
    const parseBtn = wsPage.locator('[data-testid="btn-parse-resume"]');
    await parseBtn.click();

    // 4. Assert review modal/box proposal appears
    const draftReview = wsPage.locator('[data-testid="resume-draft-review"]');
    await expect(draftReview).toBeVisible({ timeout: 5000 });
    await expect(draftReview).toContainText("Jordan Lee");
    await expect(draftReview).toContainText("jordan.lee@example.com");
    await expect(draftReview).toContainText("Kafka");

    // 5. Click Confirm & Populate Profile
    const confirmBtn = wsPage.locator('[data-testid="btn-confirm-resume-draft"]');
    await confirmBtn.click();

    // 6. Assert success banner and updated profile identity fields
    await expect(wsPage.locator('[data-testid="resume-import-status"]')).toContainText(
      "Profile successfully populated from resume! ✓"
    );

    await expect(wsPage.locator('[data-testid="input-fullname"]')).toHaveValue("Jordan Lee");
    await expect(wsPage.locator('[data-testid="input-email"]')).toHaveValue("jordan.lee@example.com");
    await expect(wsPage.locator('[data-testid="input-location"]')).toHaveValue("Austin, TX");
    await expect(wsPage.locator('[data-testid="input-linkedin"]')).toHaveValue("https://linkedin.com/in/jordanlee");

    // 7. Reload workspace and verify persistence
    await wsPage.reload();
    await wsPage.click('[data-testid="nav-profile"]');
    await expect(wsPage.locator('[data-testid="profile-view"]')).toBeVisible({ timeout: 5000 });

    await expect(wsPage.locator('[data-testid="input-fullname"]')).toHaveValue("Jordan Lee");
    await expect(wsPage.locator('[data-testid="input-email"]')).toHaveValue("jordan.lee@example.com");
    await expect(wsPage.locator('[data-testid="input-location"]')).toHaveValue("Austin, TX");

    await context.close();
  });
});
