import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { Sidebar } from "../Sidebar";
import { JobsTable } from "../JobsTable";
import { SelectedJobPreview } from "../SelectedJobPreview";
import { ProfileView } from "../ProfileView";
import type { Opportunity, JobSnapshot } from "@workit/domain";
import type { StoredOpportunityItem } from "../../runtime/api-client";

describe("S4 — Jobs Workspace Components", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  const mockOpportunity: Opportunity = {
    id: "opp_test_1",
    userId: "usr_1",
    sourceProvider: "greenhouse",
    sourceJobId: "gh_123",
    canonicalUrl: "https://boards.greenhouse.io/acme/jobs/123",
    company: "Acme Corp",
    title: "Senior Backend Engineer",
    location: "Jakarta, Indonesia",
    workArrangement: "remote",
    employmentType: "Full-time",
    state: "saved",
    currentSnapshotId: "snap_test_1",
    createdAt: "2026-09-25T00:00:00Z",
    updatedAt: "2026-09-25T00:00:00Z",
  };

  const mockSnapshot: JobSnapshot = {
    id: "snap_test_1",
    opportunityId: "opp_test_1",
    company: "Acme Corp",
    title: "Senior Backend Engineer",
    location: "Jakarta, Indonesia",
    workArrangement: "remote",
    employmentType: "Full-time",
    descriptionText: "We are seeking a senior backend engineer to scale our platform.",
    sourceUrl: "https://boards.greenhouse.io/acme/jobs/123",
    capturedAt: "2026-09-25T00:00:00Z",
    contentHash: "hash123",
  };

  const mockItem: StoredOpportunityItem = {
    opportunity: mockOpportunity,
    currentSnapshot: mockSnapshot,
  };

  describe("Sidebar", () => {
    it("renders Jobs navigation as active with count badge", async () => {
      const handleSelectView = vi.fn();
      root.render(<Sidebar activeCount={3} currentView="jobs" onSelectView={handleSelectView} />);

      await vi.waitFor(() => {
        const jobsNav = container.querySelector('[data-testid="nav-jobs"]');
        expect(jobsNav).not.toBeNull();
        expect(jobsNav?.className).toContain("is-active");
        expect(jobsNav?.textContent).toContain("Jobs");
        expect(jobsNav?.textContent).toContain("3");
      });

      const searchNav = container.querySelector('[data-testid="nav-search"]');
      expect(searchNav?.className).toContain("is-disabled");

      const profileNav = container.querySelector<HTMLElement>('[data-testid="nav-profile"]');
      expect(profileNav).not.toBeNull();
      expect(profileNav?.className).not.toContain("is-disabled");

      // Click profile nav
      profileNav?.click();
      expect(handleSelectView).toHaveBeenCalledWith("profile");
    });

    it("renders Profile as active when currentView is profile", async () => {
      root.render(<Sidebar activeCount={0} currentView="profile" onSelectView={() => {}} />);

      await vi.waitFor(() => {
        const profileNav = container.querySelector('[data-testid="nav-profile"]');
        expect(profileNav?.className).toContain("is-active");
      });
    });
  });

  describe("JobsTable", () => {
    it("renders opportunities table with status badge and row data", async () => {
      const handleSelect = vi.fn();
      root.render(
        <JobsTable
          opportunities={[mockOpportunity]}
          selectedId={null}
          onSelect={handleSelect}
        />
      );

      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="jobs-table"]')).not.toBeNull();
      });

      const titleCell = container.querySelector('[data-testid="opp-row-title"]');
      expect(titleCell?.textContent).toBe("Senior Backend Engineer");

      const statusBadge = container.querySelector('[data-testid="opp-row-status"]');
      expect(statusBadge?.textContent).toBe("saved");

      // Click row
      const row = container.querySelector<HTMLTableRowElement>('[data-testid="opportunity-row-opp_test_1"]');
      expect(row).not.toBeNull();
      row?.click();
      expect(handleSelect).toHaveBeenCalledWith("opp_test_1");
    });

    it("renders empty state when opportunities list is empty", async () => {
      root.render(
        <JobsTable
          opportunities={[]}
          selectedId={null}
          onSelect={() => {}}
        />
      );

      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="jobs-empty-state"]')).not.toBeNull();
        expect(container.textContent).toContain("No opportunities found");
      });
    });
  });

  describe("SelectedJobPreview", () => {
    it("renders job header, actions, and snapshot content", async () => {
      const handleClose = vi.fn();
      root.render(<SelectedJobPreview item={mockItem} onClose={handleClose} />);

      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="selected-job-preview"]')).not.toBeNull();
      });

      const title = container.querySelector('[data-testid="preview-title"]');
      expect(title?.textContent).toBe("Senior Backend Engineer");

      const company = container.querySelector('[data-testid="preview-company"]');
      expect(company?.textContent).toBe("Acme Corp");

      const desc = container.querySelector('[data-testid="preview-description"]');
      expect(desc?.textContent).toContain("scale our platform");

      const link = container.querySelector<HTMLAnchorElement>('[data-testid="preview-open-original"]');
      expect(link?.href).toBe("https://boards.greenhouse.io/acme/jobs/123");
      expect(link?.target).toBe("_blank");

      const applyBtn = container.querySelector('[data-testid="preview-apply-btn"]');
      expect(applyBtn?.textContent).toBe("I'm applying");

      // Click close
      const closeBtn = container.querySelector<HTMLButtonElement>('[data-testid="close-preview-btn"]');
      closeBtn?.click();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("ProfileView", () => {
    it("renders identity form, experiences, education, and skills", async () => {
      root.render(<ProfileView />);

      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="profile-view"]')).not.toBeNull();
      });

      expect(container.querySelector('[data-testid="profile-identity-section"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="profile-experience-section"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="profile-education-section"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="profile-skills-section"]')).not.toBeNull();

      const fullNameInput = container.querySelector<HTMLInputElement>('[data-testid="input-fullname"]');
      expect(fullNameInput).not.toBeNull();
      expect(fullNameInput?.value).toBe("Alex Developer");

      const saveIdentityBtn = container.querySelector<HTMLButtonElement>('[data-testid="btn-save-identity"]');
      expect(saveIdentityBtn).not.toBeNull();
    });
  });
});

