import { createRoot, type Root } from "react-dom/client";
import { WorkitRoot } from "../ui/WorkitRoot";

export const WORKIT_CONTAINER_ID = "workit-root";

let activeRoot: Root | null = null;
let activeHost: HTMLElement | null = null;

export function mountWorkit(): { unmount: () => void; host: HTMLElement; shadowRoot: ShadowRoot } | null {
  // Guarantee single instance
  const existing = document.getElementById(WORKIT_CONTAINER_ID);
  if (existing && existing.shadowRoot) {
    return null;
  }

  // If container exists without shadowRoot (stale node), remove it
  if (existing) {
    existing.remove();
  }

  // Create isolated host element
  const host = document.createElement("div");
  host.id = WORKIT_CONTAINER_ID;
  host.setAttribute("data-workit-host", "true");

  // Attach open shadow root for complete style isolation
  const shadowRoot = host.attachShadow({ mode: "open" });

  // Append host to body
  const target = document.body || document.documentElement;
  target.appendChild(host);

  // Mount React tree into the shadow root
  const root = createRoot(shadowRoot);
  root.render(<WorkitRoot />);

  activeRoot = root;
  activeHost = host;

  return {
    host,
    shadowRoot,
    unmount: () => {
      if (activeRoot) {
        activeRoot.unmount();
        activeRoot = null;
      }
      if (activeHost) {
        activeHost.remove();
        activeHost = null;
      }
    },
  };
}

export function unmountWorkit(): void {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
  }
  if (activeHost) {
    activeHost.remove();
    activeHost = null;
  }
  const leftover = document.getElementById(WORKIT_CONTAINER_ID);
  if (leftover) {
    leftover.remove();
  }
}
