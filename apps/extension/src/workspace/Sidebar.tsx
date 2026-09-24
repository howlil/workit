interface SidebarProps {
  activeCount: number;
}

export function Sidebar({ activeCount }: SidebarProps) {
  return (
    <aside className="workspace-sidebar" data-testid="workspace-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">W</div>
        <span className="sidebar-title">Workit</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-item is-active" data-testid="nav-jobs">
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

        <div className="nav-item is-disabled" title="Coming in S12" data-testid="nav-search">
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
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>Search</span>
          <span className="nav-item-badge">⌘K</span>
        </div>

        <div className="nav-item is-disabled" title="Coming in S5" data-testid="nav-profile">
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
          <span className="nav-item-badge">S5</span>
        </div>
      </nav>
    </aside>
  );
}
