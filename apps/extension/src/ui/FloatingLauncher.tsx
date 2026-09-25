import type { BrowserContext, OverlayState } from "../browser/context-controller";
import { BrandLogo } from "./BrandLogo";

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
      <BrandLogo size={24} className="workit-launcher-mark" alt="Workit" />
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
