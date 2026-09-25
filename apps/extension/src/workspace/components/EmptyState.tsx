/**
 * EmptyState — centered empty-state placeholder inside a section card.
 *
 * Covers the repeated pattern in JobsView (no saved jobs), AnswersView (no answers),
 * and SelectedJobPreview (no requirements detected).
 *
 * Usage:
 *   <EmptyState
 *     title="No answers saved yet"
 *     description="Add answers to enable 1-click suggestions."
 *   />
 *
 *   <EmptyState title="Loading..." isLoading />
 */

interface EmptyStateProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  "data-testid"?: string;
}

export function EmptyState({
  title,
  description,
  isLoading = false,
  "data-testid": testId,
}: EmptyStateProps) {
  return (
    <div className="empty-state-card" data-testid={testId}>
      <p className="empty-state-title">{title}</p>
      {description && (
        <p className="empty-state-desc">{description}</p>
      )}
      {isLoading && <span className="empty-state-loader" aria-busy="true" />}
    </div>
  );
}
