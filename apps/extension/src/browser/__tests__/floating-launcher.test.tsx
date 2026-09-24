import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { contextController } from "../context-controller";
import { mountWorkit, unmountWorkit, WORKIT_CONTAINER_ID } from "../mount-workit";
import { startPageObserver, stopPageObserver } from "../page-observer";

describe("S1 — Floating Launcher & ShadowRoot Isolation", () => {
  beforeEach(() => {
    // Reset DOM and controller state before each test
    document.body.innerHTML = "";
    contextController.closeOverlay();
    contextController.setBrowserContext({ type: "ordinary" });
  });

  afterEach(() => {
    unmountWorkit();
    stopPageObserver();
    document.body.innerHTML = "";
  });

  it("mounts #workit-root into document.body with an open ShadowRoot", async () => {
    const result = mountWorkit();
    expect(result).not.toBeNull();

    const host = document.getElementById(WORKIT_CONTAINER_ID);
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    expect(host?.shadowRoot?.mode).toBe("open");

    // Wait for React to render in the shadowRoot
    await vi.waitFor(() => {
      const launcher = host?.shadowRoot?.querySelector('[data-testid="workit-launcher"]');
      expect(launcher).not.toBeNull();
    });
  });

  it("enforces singleton guarantee: calling mountWorkit() multiple times does not duplicate host", () => {
    const first = mountWorkit();
    const second = mountWorkit();

    expect(first).not.toBeNull();
    expect(second).toBeNull();

    const hosts = document.querySelectorAll(`#${WORKIT_CONTAINER_ID}`);
    expect(hosts.length).toBe(1);
  });

  it("toggles popup open and closed when clicking the launcher", async () => {
    mountWorkit();
    const host = document.getElementById(WORKIT_CONTAINER_ID)!;

    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-launcher"]')).not.toBeNull();
    });

    const launcher = host.shadowRoot?.querySelector<HTMLButtonElement>('[data-testid="workit-launcher"]')!;

    // Initial state: popup is closed
    expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).toBeNull();
    expect(launcher.getAttribute("aria-expanded")).toBe("false");

    // Click launcher -> opens popup
    launcher.click();
    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).not.toBeNull();
      expect(launcher.getAttribute("aria-expanded")).toBe("true");
    });

    // Click launcher again -> closes popup
    launcher.click();
    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).toBeNull();
      expect(launcher.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("closes the popup when Escape key is pressed", async () => {
    mountWorkit();
    const host = document.getElementById(WORKIT_CONTAINER_ID)!;

    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-launcher"]')).not.toBeNull();
    });

    // Open popup
    contextController.openOverlay();
    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).not.toBeNull();
    });

    // Press Escape
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).toBeNull();
    });
  });

  it("closes the popup when close button is clicked", async () => {
    mountWorkit();
    const host = document.getElementById(WORKIT_CONTAINER_ID)!;

    contextController.openOverlay();
    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).not.toBeNull();
    });

    const closeBtn = host.shadowRoot?.querySelector<HTMLButtonElement>('[data-testid="workit-close-btn"]')!;
    expect(closeBtn).not.toBeNull();

    closeBtn.click();
    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-popup"]')).toBeNull();
    });
  });

  it("shows indicator dot when a job context is detected", async () => {
    mountWorkit();
    const host = document.getElementById(WORKIT_CONTAINER_ID)!;

    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-launcher"]')).not.toBeNull();
    });

    // Initial ordinary context: no dot
    expect(host.shadowRoot?.querySelector('[data-testid="workit-indicator-dot"]')).toBeNull();

    // Context changes to job
    contextController.setBrowserContext({
      type: "job",
      candidate: {
        source: { canonicalUrl: "https://example.com/job/1" },
        title: "Staff Software Engineer",
        company: "Acme Cloud",
        location: "Remote",
        descriptionText: "Build scalable distributed systems.",
        extractedAt: new Date().toISOString(),
        extraction: { strategy: "json-ld", confidence: 0.95 },
      },
    });

    await vi.waitFor(() => {
      expect(host.shadowRoot?.querySelector('[data-testid="workit-indicator-dot"]')).not.toBeNull();
    });

    // Open popup and verify job details rendered
    contextController.openOverlay();
    await vi.waitFor(() => {
      const popup = host.shadowRoot?.querySelector('[data-testid="workit-popup"]');
      expect(popup?.textContent).toContain("Staff Software Engineer");
      expect(popup?.textContent).toContain("Acme Cloud");
      expect(popup?.textContent).toContain("Remote");
    });
  });

  it("preserves isolation under hostile host page CSS", async () => {
    // Inject hostile light DOM styles
    const hostileStyle = document.createElement("style");
    hostileStyle.textContent = `
      * {
        box-sizing: content-box !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      button {
        all: unset !important;
        background: red !important;
        color: white !important;
        font-size: 8px !important;
      }
      div {
        font-family: "Comic Sans MS", cursive !important;
        color: magenta !important;
        font-size: 40px !important;
      }
      [style*="position: fixed"] {
        display: none !important;
      }
    `;
    document.head.appendChild(hostileStyle);

    mountWorkit();
    const host = document.getElementById(WORKIT_CONTAINER_ID)!;

    await vi.waitFor(() => {
      const launcher = host.shadowRoot?.querySelector<HTMLButtonElement>('[data-testid="workit-launcher"]');
      expect(launcher).not.toBeNull();
    });

    // Verify shadow DOM stylesheet exists and protects the elements
    const shadowStyles = host.shadowRoot?.querySelector("style");
    expect(shadowStyles).not.toBeNull();
    expect(shadowStyles?.textContent).toContain(".workit-launcher");
    expect(shadowStyles?.textContent).toContain("--green: #2F7D44");
    expect(shadowStyles?.textContent).toContain("position: fixed");

    // Clean up hostile style
    hostileStyle.remove();
  });

  it("page-observer debounces SPA navigation and keeps single instance", async () => {
    vi.useFakeTimers();

    let navigationCount = 0;
    startPageObserver(() => {
      navigationCount++;
    });

    mountWorkit();
    expect(document.querySelectorAll(`#${WORKIT_CONTAINER_ID}`).length).toBe(1);

    // Rapid pushState calls (simulating SPA router)
    history.pushState({}, "", "/jobs/1");
    history.pushState({}, "", "/jobs/2");
    history.pushState({}, "", "/jobs/3");

    expect(navigationCount).toBe(0); // Debounced

    vi.advanceTimersByTime(350);
    expect(navigationCount).toBe(1);

    // Still only 1 Workit instance
    expect(document.querySelectorAll(`#${WORKIT_CONTAINER_ID}`).length).toBe(1);

    vi.useRealTimers();
  });
});
