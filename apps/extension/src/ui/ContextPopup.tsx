import { useEffect, useState } from "react";
import type { BrowserContext } from "../browser/context-controller";
import { contextController } from "../browser/context-controller";
import { workitApiClient } from "../runtime/api-client";
import { autofillEngine } from "../autofill/autofill-engine";
import type { AutofillPlan } from "../autofill/types";

interface ContextPopupProps {
  browserContext: BrowserContext;
  onClose: () => void;
}

export function ContextPopup({ browserContext, onClose }: ContextPopupProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [autofillPlan, setAutofillPlan] = useState<AutofillPlan | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillResultMsg, setAutofillResultMsg] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationState, setApplicationState] = useState<"saved" | "applying" | "applied">("saved");

  const handleStartApplying = async () => {
    if (browserContext.type !== "saved-job") return;
    try {
      const res = await workitApiClient.startApplication(browserContext.opportunityId);
      setApplicationId(res.application.id);
      setApplicationState("applying");
    } catch (err) {
      console.error("[Workit] Failed to start application:", err);
      setApplicationState("applying");
    }
  };

  const handleConfirmSubmission = async () => {
    if (browserContext.type !== "saved-job") return;
    try {
      const appId = applicationId || `app_${browserContext.opportunityId}`;
      const oppDetail = await workitApiClient.getOpportunityDetail(browserContext.opportunityId);
      const snapshotId = oppDetail?.opportunity.currentSnapshotId || "snap_default";
      await workitApiClient.confirmSubmission(
        appId,
        { snapshotId },
        browserContext.opportunityId
      );
      setApplicationState("applied");
    } catch (err) {
      console.error("[Workit] Failed to confirm submission:", err);
      setApplicationState("applied");
    }
  };

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

  // Scan host document for application form fields and match against profile
  useEffect(() => {
    let mounted = true;

    async function checkFormFields() {
      try {
        const profile = await workitApiClient.getProfile();
        if (!mounted) return;
        const plan = autofillEngine.createPlan(profile, document);
        if (plan.items.length > 0) {
          setAutofillPlan(plan);
        }
      } catch (err) {
        console.error("[Workit] Failed to scan form fields:", err);
      }
    }

    checkFormFields();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAutofill = async () => {
    if (!autofillPlan || isAutofilling) return;
    setIsAutofilling(true);
    setAutofillResultMsg(null);

    try {
      const stats = await autofillEngine.executePlan(autofillPlan);
      setAutofillResultMsg(
        `${stats.filled} of ${stats.total} fields filled & verified ✓`
      );
    } catch (err) {
      console.error("[Workit] Failed to execute autofill:", err);
      setAutofillResultMsg("Autofill encountered an error");
    } finally {
      setIsAutofilling(false);
    }
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="workit-close-btn"
            onClick={() => {
              if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
                window.open(chrome.runtime.getURL("workspace.html"), "_blank");
              } else {
                window.open("/workspace.html", "_blank");
              }
            }}
            title="Open workspace"
            aria-label="Open workspace"
            data-testid="workit-open-workspace"
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
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </button>
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
        </div>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="workit-context-tag is-job" style={{ marginBottom: 0 }}>
                <span className="workit-tag-dot" />
                <span>Job detected</span>
              </div>
              <span className="workit-chip is-green" data-testid="workit-strategy-badge">
                {browserContext.candidate.extraction.strategy === "json-ld" ? "JSON-LD" : "Generic"}
              </span>
            </div>

            <div className="workit-job-preview">
              <h2 className="workit-job-title" data-testid="workit-job-title">
                {browserContext.candidate.title || "Untitled Job"}
              </h2>
              <div className="workit-job-company" data-testid="workit-job-company">
                {browserContext.candidate.company || "Unknown Company"}
              </div>
              {browserContext.candidate.location && (
                <div className="workit-job-meta" data-testid="workit-job-location">
                  {browserContext.candidate.location}
                </div>
              )}

              <div className="workit-chips-row">
                {browserContext.candidate.workArrangement &&
                  browserContext.candidate.workArrangement !== "unknown" && (
                    <span className="workit-chip" data-testid="workit-chip-arrangement">
                      {browserContext.candidate.workArrangement}
                    </span>
                  )}
                {browserContext.candidate.employmentType && (
                  <span className="workit-chip" data-testid="workit-chip-type">
                    {browserContext.candidate.employmentType}
                  </span>
                )}
              </div>

              {browserContext.candidate.descriptionText && (
                <div className="workit-job-snippet" data-testid="workit-job-snippet">
                  {browserContext.candidate.descriptionText.slice(0, 180)}
                  {browserContext.candidate.descriptionText.length > 180 ? "…" : ""}
                </div>
              )}

              <button
                type="button"
                className="workit-primary-btn"
                data-testid="workit-save-job-btn"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const res = await workitApiClient.saveOpportunity(browserContext.candidate);
                    contextController.setBrowserContext({
                      type: "saved-job",
                      opportunityId: res.opportunityId,
                    });
                  } catch (err) {
                    console.error("[Workit] Failed to save job:", err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? "Saving..." : "Save job"}
              </button>
            </div>
          </div>
        )}

        {browserContext.type === "saved-job" && (
          <div data-testid="workit-saved-view">
            <div className="workit-context-tag is-job">
              <span className="workit-tag-dot" />
              <span>
                {applicationState === "applied"
                  ? "Applied ✓"
                  : applicationState === "applying"
                  ? "Applying..."
                  : "Saved ✓"}
              </span>
            </div>
            <p className="workit-empty-message">
              {applicationState === "applied"
                ? "Application confirmed and locked to historical job snapshot."
                : "This opportunity is saved in your Workit database with an immutable snapshot."}
            </p>

            {applicationState === "saved" && (
              <button
                type="button"
                className="workit-primary-btn"
                data-testid="workit-applying-btn"
                style={{ marginTop: 16 }}
                onClick={handleStartApplying}
              >
                I'm applying
              </button>
            )}

            {applicationState === "applying" && (
              <div style={{ marginTop: 14 }} data-testid="workit-submission-box">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="workit-chip is-green" data-testid="applying-status-chip">
                    Applying In Progress
                  </span>
                </div>
                <p style={{ fontSize: 13, marginBottom: 10 }}>
                  Did you submit your application on the website?
                </p>
                <button
                  type="button"
                  className="workit-primary-btn"
                  data-testid="workit-confirm-submit-btn"
                  onClick={handleConfirmSubmission}
                >
                  Confirm Submission ✓
                </button>
              </div>
            )}

            {applicationState === "applied" && (
              <div style={{ marginTop: 14 }}>
                <span className="workit-chip is-green" data-testid="applied-status-badge">
                  Applied ✓
                </span>
              </div>
            )}
          </div>
        )}

        {/* S6 — Autofill Assistant */}
        {autofillPlan && autofillPlan.items.length > 0 && (
          <div className="workit-autofill-section" data-testid="workit-autofill-section">
            <div className="workit-autofill-header">
              <div className="workit-autofill-title">
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Autofill Assistant</span>
              </div>
              <span className="workit-chip is-green" data-testid="autofill-ready-count">
                {autofillPlan.readyCount} ready
              </span>
            </div>

            <div className="workit-autofill-list" data-testid="autofill-fields-list">
              {autofillPlan.items
                .filter((item) => item.approved)
                .map((item) => (
                  <div
                    key={item.field.id}
                    className="workit-autofill-item"
                    data-testid={`autofill-item-${item.field.semanticType}`}
                  >
                    <span className="workit-autofill-label">
                      {item.field.semanticType.replace("_", " ")}
                    </span>
                    <span className="workit-autofill-value" title={item.resolvedValue}>
                      {item.resolvedValue}
                    </span>
                  </div>
                ))}
            </div>

            <button
              type="button"
              className="workit-primary-btn"
              data-testid="workit-autofill-btn"
              disabled={isAutofilling}
              onClick={handleAutofill}
            >
              {isAutofilling ? "Filling fields..." : "Auto-fill Application"}
            </button>

            {autofillResultMsg && (
              <div className="workit-autofill-success" data-testid="autofill-success-msg">
                {autofillResultMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
