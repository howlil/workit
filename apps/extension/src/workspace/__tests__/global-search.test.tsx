import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { GlobalSearchModal } from "../GlobalSearchModal";
import { workitApiClient } from "../../runtime/api-client";
import type { SearchResultItem } from "@workit/contracts";

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("S12 — Global Search (Cmd+K Command Palette)", () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockResults: SearchResultItem[] = [
    {
      id: "opp_1",
      type: "opportunity",
      title: "Senior Distributed Systems Engineer",
      subtitle: "Databricks • San Francisco, CA (saved)",
      metadata: { company: "Databricks", state: "saved" },
    },
    {
      id: "ans_1",
      type: "answer",
      title: "What consensus algorithms have you implemented?",
      subtitle: "Category: technical",
      snippet: "I implemented a Raft consensus cluster in Go...",
    },
    {
      id: "prof_1",
      type: "profile",
      title: "Skills: Distributed Systems, Raft, Go",
      subtitle: "3 matching skills",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it("renders search input, filter pills, and keyboard shortcuts hint when open", async () => {
    await act(async () => {
      root.render(
        <GlobalSearchModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectResult={vi.fn()}
        />
      );
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-testid="global-search-modal"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="global-search-input"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="search-filter-all"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="search-filter-opportunity"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="search-filter-answer"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="search-filter-profile"]')).not.toBeNull();
    });
  });

  it("searches and renders matching results with badges and subtitles", async () => {
    vi.spyOn(workitApiClient, "searchGlobal").mockResolvedValue(mockResults);

    await act(async () => {
      root.render(
        <GlobalSearchModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectResult={vi.fn()}
        />
      );
    });

    const input = container.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')!;
    expect(input).not.toBeNull();

    await act(async () => {
      setInputValue(input, "Distributed");
    });

    await vi.waitFor(() => {
      const items = container.querySelectorAll('[data-testid="search-result-item"]');
      expect(items.length).toBe(3);
    }, { timeout: 1000 });

    expect(container.textContent).toContain("Senior Distributed Systems Engineer");
    expect(container.textContent).toContain("Databricks • San Francisco, CA (saved)");
  });

  it("filters results when clicking scope tabs", async () => {
    vi.spyOn(workitApiClient, "searchGlobal").mockResolvedValue(mockResults);

    await act(async () => {
      root.render(
        <GlobalSearchModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectResult={vi.fn()}
        />
      );
    });

    const input = container.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')!;
    await act(async () => {
      setInputValue(input, "Raft");
    });

    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-testid="search-result-item"]').length).toBe(3);
    }, { timeout: 1000 });

    // Click Jobs filter tab
    const jobsTab = container.querySelector<HTMLButtonElement>('[data-testid="search-filter-opportunity"]')!;
    await act(async () => {
      jobsTab.click();
    });

    expect(container.querySelectorAll('[data-testid="search-result-item"]').length).toBe(1);
    expect(container.textContent).toContain("Senior Distributed Systems Engineer");

    // Click Answers filter tab
    const answersTab = container.querySelector<HTMLButtonElement>('[data-testid="search-filter-answer"]')!;
    await act(async () => {
      answersTab.click();
    });

    expect(container.querySelectorAll('[data-testid="search-result-item"]').length).toBe(1);
    expect(container.textContent).toContain("What consensus algorithms have you implemented?");
  });

  it("selects result on click and closes modal", async () => {
    vi.spyOn(workitApiClient, "searchGlobal").mockResolvedValue(mockResults);
    const onSelect = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <GlobalSearchModal
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelect}
        />
      );
    });

    const input = container.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')!;
    await act(async () => {
      setInputValue(input, "Distributed");
    });

    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-testid="search-result-item"]').length).toBe(3);
    }, { timeout: 1000 });

    const firstItem = container.querySelector<HTMLButtonElement>('[data-testid="search-result-item"]')!;
    await act(async () => {
      firstItem.click();
    });

    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape key press", async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <GlobalSearchModal
          isOpen={true}
          onClose={onClose}
          onSelectResult={vi.fn()}
        />
      );
    });

    const input = container.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')!;
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
  });
});
