import { useState, useEffect } from "react";
import type { Opportunity } from "@workit/domain";
import type { OpportunityState, SearchResultItem } from "@workit/contracts";
import { workitApiClient, type StoredOpportunityItem } from "../runtime/api-client";
import { Sidebar, type WorkspaceView } from "./Sidebar";
import { JobsTable } from "./JobsTable";
import { SelectedJobPreview } from "./SelectedJobPreview";
import { ProfileView } from "./ProfileView";
import { AnswersView } from "./AnswersView";
import { GlobalSearchModal } from "./GlobalSearchModal";


type FilterTab = "all" | OpportunityState;

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "applying", label: "Applying" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "closed", label: "Closed" },
];

export function WorkspaceApp() {
  const [currentView, setCurrentView] = useState<WorkspaceView>("jobs");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedItem, setSelectedItem] = useState<StoredOpportunityItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const fetchOpportunities = async (filter: FilterTab) => {
    setIsLoading(true);
    try {
      const stateParam = filter === "all" ? undefined : filter;
      const list = await workitApiClient.listOpportunities({ state: stateParam });
      setOpportunities(list);

      // If selected item is no longer in list, clear it
      if (selectedItem && !list.find((o) => o.id === selectedItem.opportunity.id)) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("[Workit] Failed to load opportunities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === "jobs") {
      fetchOpportunities(activeFilter);
    }
  }, [activeFilter, currentView]);

  const handleSelect = async (id: string) => {
    try {
      const detail = await workitApiClient.getOpportunityDetail(id);
      if (detail) {
        setSelectedItem(detail);
      }
    } catch (err) {
      console.error("[Workit] Failed to load opportunity detail:", err);
    }
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    if (result.type === "opportunity") {
      setCurrentView("jobs");
      handleSelect(result.id);
    } else if (result.type === "answer") {
      setCurrentView("answers");
    } else if (result.type === "profile") {
      setCurrentView("profile");
    }
  };

  return (
    <div className="workspace-layout">
      <Sidebar
        activeCount={opportunities.length}
        currentView={currentView}
        onSelectView={setCurrentView}
      />


      <main className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-title-row">
            <h1 className="workspace-title">
              {currentView === "jobs"
                ? "Opportunities"
                : currentView === "profile"
                ? "Career Profile"
                : "Answer Memory"}
            </h1>
            <button
              type="button"
              className="workspace-search-trigger"
              onClick={() => setIsSearchOpen(true)}
              title="Search workspace (⌘K)"
              aria-label="Search workspace"
              data-testid="topbar-search-trigger"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Search workspace...</span>
              <kbd className="workspace-search-shortcut">⌘K</kbd>
            </button>
          </div>

          {currentView === "jobs" && (
            <div className="filter-chips">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`filter-chip ${activeFilter === tab.id ? "is-active" : ""}`}
                  onClick={() => setActiveFilter(tab.id)}
                  data-testid={`filter-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {currentView === "jobs" ? (
          <div className="workspace-split-content">
            {isLoading ? (
              <div className="empty-state-view" data-testid="workspace-loading">
                Loading opportunities...
              </div>
            ) : (
              <JobsTable
                opportunities={opportunities}
                selectedId={selectedItem?.opportunity.id || null}
                onSelect={handleSelect}
              />
            )}

            {selectedItem && (
              <SelectedJobPreview
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
              />
            )}
          </div>
        ) : currentView === "profile" ? (
          <ProfileView />
        ) : (
          <AnswersView />
        )}
      </main>

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
}

