import { useState, useEffect } from "react";
import type { StoredOpportunityItem } from "../runtime/api-client";
import { workitApiClient } from "../runtime/api-client";
import type { JobMatchAnalysis } from "@workit/domain";

interface SelectedJobPreviewProps {
  item: StoredOpportunityItem;
  onClose: () => void;
}

export function SelectedJobPreview({ item, onClose }: SelectedJobPreviewProps) {
  const { opportunity, currentSnapshot } = item;
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadMatch() {
      if (!currentSnapshot.descriptionText) return;
      setIsLoadingMatch(true);
      try {
        const analysis = await workitApiClient.matchJobEvidence(currentSnapshot.descriptionText);
        if (mounted) setMatchAnalysis(analysis);
      } catch (err) {
        console.error("[Workit] Failed to analyze job match:", err);
      } finally {
        if (mounted) setIsLoadingMatch(false);
      }
    }
    loadMatch();
    return () => {
      mounted = false;
    };
  }, [currentSnapshot.id, currentSnapshot.descriptionText]);

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
          className="btn-quiet"
          aria-label="Close preview"
          data-testid="close-preview-btn"
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
      </div>

      <div className="preview-header" style={{ marginTop: 8 }}>
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

      {/* S9 — Evidence Match Card */}
      <div className="preview-section" data-testid="evidence-match-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div className="preview-section-title" style={{ margin: 0 }}>Requirement Match</div>
          {matchAnalysis && (
            <span
              className={`filter-chip ${matchAnalysis.overallScore >= 70 ? "is-active" : ""}`}
              style={{ fontWeight: 600 }}
              data-testid="overall-match-score"
            >
              {matchAnalysis.overallScore}% match
            </span>
          )}
        </div>

        {isLoadingMatch ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Analyzing requirements against profile...</div>
        ) : matchAnalysis && matchAnalysis.matches.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {matchAnalysis.matchedCount} matched • {matchAnalysis.partialCount} partial • {matchAnalysis.missingCount} missing
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }} data-testid="match-breakdown-list">
              {matchAnalysis.matches.map((m, idx) => (
                <div
                  key={idx}
                  className="match-item-box"
                  data-testid={`match-item-${m.status}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontWeight: 500, color: "var(--text)" }}>{m.requirement}</span>
                    <span
                      className={`match-status-badge ${m.status}`}
                      data-testid={`status-badge-${m.status}`}
                    >
                      {m.status === "matched" ? "✓ Matched" : m.status === "partial" ? "~ Partial" : "✗ Missing"}
                    </span>
                  </div>

                  {m.evidenceSummary && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }} data-testid="evidence-summary">
                      {m.status !== "missing" ? (
                        <span>
                          <strong style={{ color: "var(--text)" }}>Evidence: </strong>
                          {m.evidenceSummary}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-faint)" }}>{m.evidenceSummary}</span>
                      )}
                    </div>
                  )}

                  {m.evidenceFactIds.length > 0 && (
                    <div style={{ marginTop: 4, display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {m.evidenceFactIds.map((factId) => (
                        <span
                          key={factId}
                          className="fact-id-chip"
                          data-testid="evidence-fact-id"
                        >
                          {factId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No requirements detected in job snapshot.</div>
        )}
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
