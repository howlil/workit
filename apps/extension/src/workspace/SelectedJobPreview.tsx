import type { StoredOpportunityItem } from "../runtime/api-client";

interface SelectedJobPreviewProps {
  item: StoredOpportunityItem;
  onClose: () => void;
}

export function SelectedJobPreview({ item, onClose }: SelectedJobPreviewProps) {
  const { opportunity, currentSnapshot } = item;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="preview-pane" data-testid="selected-job-preview">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className={`status-badge ${opportunity.state}`}>
          {opportunity.state}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 18,
            padding: 4,
          }}
          aria-label="Close preview"
          data-testid="close-preview-btn"
        >
          ×
        </button>
      </div>

      <div className="preview-header" style={{ marginTop: 12 }}>
        <h2 className="preview-title" data-testid="preview-title">{opportunity.title}</h2>
        <div className="preview-company" data-testid="preview-company">{opportunity.company}</div>
        {opportunity.location && (
          <div className="preview-location" data-testid="preview-location">{opportunity.location}</div>
        )}
      </div>

      <div className="preview-actions">
        {opportunity.canonicalUrl && (
          <a
            href={opportunity.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            data-testid="preview-open-original"
          >
            <span>Open original</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
        <button
          type="button"
          className="btn-primary"
          data-testid="preview-apply-btn"
        >
          I'm applying
        </button>
      </div>

      <div className="preview-section">
        <div className="preview-section-title">Captured Snapshot</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {opportunity.workArrangement && (
            <span className="filter-chip" style={{ cursor: "default" }}>
              {opportunity.workArrangement}
            </span>
          )}
          {opportunity.employmentType && (
            <span className="filter-chip" style={{ cursor: "default" }}>
              {opportunity.employmentType}
            </span>
          )}
          <span className="filter-chip" style={{ cursor: "default", color: "var(--text-faint)" }}>
            Captured {formatDate(currentSnapshot.capturedAt)}
          </span>
        </div>

        <div className="preview-body-text" data-testid="preview-description">
          {currentSnapshot.descriptionText}
        </div>
      </div>
    </div>
  );
}
