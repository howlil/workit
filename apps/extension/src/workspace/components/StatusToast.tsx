/**
 * StatusToast — inline save-status feedback indicator.
 *
 * Renders a transient success or error message inline next to an action button.
 * Owns no timer logic — the parent controls visibility by toggling `message`.
 *
 * Usage:
 *   <StatusToast message={identitySaved ? "Saved ✓" : null} />
 *   <StatusToast message={errorMsg} variant="error" />
 */

interface StatusToastProps {
  message: string | null;
  variant?: "success" | "error";
  "data-testid"?: string;
}

export function StatusToast({
  message,
  variant = "success",
  "data-testid": testId,
}: StatusToastProps) {
  if (!message) return null;

  if (variant === "error") {
    return (
      <span className="save-status-msg is-error" data-testid={testId}>
        {message}
      </span>
    );
  }

  return (
    <span className="save-status-msg" data-testid={testId}>
      {message}
    </span>
  );
}
