export type OverlayState =
  | { type: "closed" }
  | { type: "open" };

export interface JobCandidateStub {
  source: {
    canonicalUrl: string;
    provider?: string;
    sourceJobId?: string;
  };
  company?: string;
  title?: string;
  location?: string;
  workArrangement?: "remote" | "hybrid" | "onsite" | "unknown";
  employmentType?: string;
  descriptionText: string;
  descriptionHtml?: string;
  extraction: {
    strategy: "json-ld" | "adapter" | "generic";
    confidence: number;
  };
}

export type BrowserContext =
  | { type: "ordinary" }
  | { type: "job"; candidate: JobCandidateStub }
  | { type: "saved-job"; opportunityId: string };

type Listener = () => void;

class ContextController {
  private overlayState: OverlayState = { type: "closed" };
  private browserContext: BrowserContext = { type: "ordinary" };
  private listeners: Set<Listener> = new Set();

  getOverlayState(): OverlayState {
    return this.overlayState;
  }

  getBrowserContext(): BrowserContext {
    return this.browserContext;
  }

  setOverlayState(state: OverlayState): void {
    if (this.overlayState.type === state.type) return;
    this.overlayState = state;
    this.notify();
  }

  toggleOverlay(): void {
    this.setOverlayState(
      this.overlayState.type === "open"
        ? { type: "closed" }
        : { type: "open" }
    );
  }

  closeOverlay(): void {
    this.setOverlayState({ type: "closed" });
  }

  openOverlay(): void {
    this.setOverlayState({ type: "open" });
  }

  setBrowserContext(ctx: BrowserContext): void {
    this.browserContext = ctx;
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("[Workit] ContextController listener error:", err);
      }
    }
  }
}

export const contextController = new ContextController();
