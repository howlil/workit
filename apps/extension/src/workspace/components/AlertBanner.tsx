/**
 * AlertBanner — full-width inline alert for success / warning / error states.
 *
 * Covers the repeated inline-styled alert pattern in AnswersView (success banner)
 * and the draft-level error message in ProfileView.  Uses only canonical CSS
 * tokens — no hardcoded hex values.
 *
 * Usage:
 *   <AlertBanner variant="success" message={saveSuccessMsg} />
 *   <AlertBanner variant="error" message={importStatusMsg} />
 *   <AlertBanner variant="warning" message="Partial match detected." />
 */

interface AlertBannerProps {
  variant: "success" | "error" | "warning";
  message: string | null;
  "data-testid"?: string;
}

const VARIANT_CLASS: Record<AlertBannerProps["variant"], string> = {
  success: "alert-banner is-success",
  error: "alert-banner is-error",
  warning: "alert-banner is-warning",
};

export function AlertBanner({
  variant,
  message,
  "data-testid": testId,
}: AlertBannerProps) {
  if (!message) return null;

  return (
    <div className={VARIANT_CLASS[variant]} role="alert" data-testid={testId}>
      {message}
    </div>
  );
}
