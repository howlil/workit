import { useState, useEffect } from "react";
import type { Opportunity } from "@workit/domain";
import type { OpportunityState } from "@workit/contracts";
import { workitApiClient, type StoredOpportunityItem } from "../runtime/api-client";
import { Sidebar, type WorkspaceView } from "./Sidebar";
import { JobsTable } from "./JobsTable";
import { SelectedJobPreview } from "./SelectedJobPreview";
import { ProfileView } from "./ProfileView";

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

  return (
    <div className="workspace-layout">
      <Sidebar
        activeCount={opportunities.length}
        currentView={currentView}
        onSelectView={setCurrentView}
      />

      <main className="workspace-main">
        {currentView === "jobs" ? (
          <>
            <header className="workspace-header">
              <div className="workspace-title-row">
                <h1 className="workspace-title">Opportunities</h1>
              </div>

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
            </header>

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
          </>
        ) : (
          <>
            <header className="workspace-header">
              <div className="workspace-title-row">
                <h1 className="workspace-title">Career Profile</h1>
              </div>
            </header>

            <ProfileView />
          </>
        )}
      </main>
    </div>
  );
}
