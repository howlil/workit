import { useEffect } from "react";
import type { BrowserContext } from "../browser/context-controller";

interface ContextPopupProps {
  browserContext: BrowserContext;
  onClose: () => void;
}

export function ContextPopup({ browserContext, onClose }: ContextPopupProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose]);

  return (
    <div
      className="workit-popup"
      data-testid="workit-popup"
      role="dialog"
      aria-label="Workit Context"
    >
      <header className="workit-popup-header">
        <div className="workit-brand">
          <span className="workit-brand-logo">W</span>
          <span className="workit-brand-name">Workit</span>
        </div>
        <button
          type="button"
          className="workit-close-btn"
          onClick={onClose}
          aria-label="Close"
          data-testid="workit-close-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="3" x2="11" y2="11" />
            <line x1="11" y1="3" x2="3" y2="11" />
          </svg>
        </button>
      </header>

      <div className="workit-popup-body">
        {browserContext.type === "ordinary" && (
          <div>
            <div className="workit-context-tag">
              <span className="workit-tag-dot" />
              <span>No job detected</span>
            </div>
            <p className="workit-empty-message">
              Browse a job listing and Workit will automatically extract details,
              inspect requirement matches, and help you save it.
            </p>
            <p className="workit-empty-subtext">
              Compatible with LinkedIn, Greenhouse, Lever, Ashby, and general career sites.
            </p>
          </div>
        )}

        {browserContext.type === "job" && (
          <div>
            <div className="workit-context-tag is-job">
              <span className="workit-tag-dot" />
              <span>Job detected</span>
            </div>
            <div className="workit-job-preview">
              <h2 className="workit-job-title">
                {browserContext.candidate.title || "Untitled Job"}
              </h2>
              <div className="workit-job-company">
                {browserContext.candidate.company || "Unknown Company"}
              </div>
              {browserContext.candidate.location && (
                <div className="workit-job-meta">
                  {browserContext.candidate.location}
                  {browserContext.candidate.workArrangement &&
                    ` · ${browserContext.candidate.workArrangement}`}
                </div>
              )}
              <button
                type="button"
                className="workit-primary-btn"
                data-testid="workit-save-job-btn"
              >
                Save job
              </button>
            </div>
          </div>
        )}

        {browserContext.type === "saved-job" && (
          <div>
            <div className="workit-context-tag is-job">
              <span className="workit-tag-dot" />
              <span>Saved ✓</span>
            </div>
            <p className="workit-empty-message">
              This job is saved in your Workit workspace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
