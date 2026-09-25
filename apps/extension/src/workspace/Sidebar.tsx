import { BrandLogo } from "../ui/BrandLogo";

export type WorkspaceView = "jobs" | "profile" | "answers";

interface SidebarProps {
  activeCount: number;
  currentView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
}

export function Sidebar({ activeCount, currentView, onSelectView }: SidebarProps) {
  return (
    <aside className="workspace-sidebar" data-testid="workspace-sidebar">
      <div className="sidebar-header">
        <BrandLogo size={28} className="sidebar-logo" alt="Workit Logo" />
        <span className="sidebar-title">Workit</span>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`nav-item ${currentView === "jobs" ? "is-active" : ""}`}
          data-testid="nav-jobs"
          onClick={() => onSelectView("jobs")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectView("jobs");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span>Jobs</span>
          {activeCount > 0 && <span className="nav-item-badge">{activeCount}</span>}
        </div>

        <div
          className={`nav-item ${currentView === "profile" ? "is-active" : ""}`}
          data-testid="nav-profile"
          onClick={() => onSelectView("profile")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectView("profile");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
          <span>Profile</span>
        </div>

        <div
          className={`nav-item ${currentView === "answers" ? "is-active" : ""}`}
          data-testid="nav-answers"
          onClick={() => onSelectView("answers")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectView("answers");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Answers</span>
        </div>
      </nav>
    </aside>
  );
}

