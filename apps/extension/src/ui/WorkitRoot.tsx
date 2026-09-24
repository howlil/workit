import { useEffect, useState } from "react";
import { contextController } from "../browser/context-controller";
import { FloatingLauncher } from "./FloatingLauncher";
import { ContextPopup } from "./ContextPopup";
import { WORKIT_SHADOW_STYLES } from "./styles";

export function WorkitRoot() {
  const [overlayState, setOverlayState] = useState(() =>
    contextController.getOverlayState()
  );
  const [browserContext, setBrowserContext] = useState(() =>
    contextController.getBrowserContext()
  );

  useEffect(() => {
    return contextController.subscribe(() => {
      setOverlayState(contextController.getOverlayState());
      setBrowserContext(contextController.getBrowserContext());
    });
  }, []);

  const handleToggle = () => {
    contextController.toggleOverlay();
  };

  const handleClose = () => {
    contextController.closeOverlay();
  };

  return (
    <>
      <style>{WORKIT_SHADOW_STYLES}</style>
      <div className="workit-root" data-testid="workit-shadow-root">
        {overlayState.type === "open" && (
          <ContextPopup
            browserContext={browserContext}
            onClose={handleClose}
          />
        )}
        <FloatingLauncher
          overlayState={overlayState}
          browserContext={browserContext}
          onToggle={handleToggle}
        />
      </div>
    </>
  );
}
