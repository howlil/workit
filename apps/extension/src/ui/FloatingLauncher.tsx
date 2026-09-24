import type { BrowserContext, OverlayState } from "../browser/context-controller";

interface FloatingLauncherProps {
  overlayState: OverlayState;
  browserContext: BrowserContext;
  onToggle: () => void;
}

export function FloatingLauncher({
  overlayState,
  browserContext,
  onToggle,
}: FloatingLauncherProps) {
  const isOpen = overlayState.type === "open";
  const hasJobContext = browserContext.type === "job";

  return (
    <button
      type="button"
      className={`workit-launcher ${isOpen ? "is-open" : ""}`}
      onClick={onToggle}
      aria-label="Toggle Workit"
      aria-expanded={isOpen}
      data-testid="workit-launcher"
    >
      <span className="workit-launcher-mark">W</span>
      {hasJobContext && (
        <span
          className="workit-indicator-dot"
          data-testid="workit-indicator-dot"
          aria-label="Job detected"
        />
      )}
    </button>
  );
}
