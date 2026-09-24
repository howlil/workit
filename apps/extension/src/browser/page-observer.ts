export type NavigationCallback = (url: string) => void;

let originalPushState: typeof history.pushState | null = null;
let originalReplaceState: typeof history.replaceState | null = null;
let navigationTimer: ReturnType<typeof setTimeout> | null = null;
let activeCallback: NavigationCallback | null = null;
let isObserving = false;

function triggerNavigation(): void {
  if (navigationTimer) {
    clearTimeout(navigationTimer);
  }
  navigationTimer = setTimeout(() => {
    if (activeCallback) {
      activeCallback(window.location.href);
    }
  }, 300);
}

function handlePopState(): void {
  triggerNavigation();
}

export function startPageObserver(onNavigate?: NavigationCallback): () => void {
  if (isObserving) {
    if (onNavigate) activeCallback = onNavigate;
    return stopPageObserver;
  }

  isObserving = true;
  activeCallback = onNavigate || null;

  // Listen to browser back/forward navigation
  window.addEventListener("popstate", handlePopState);

  // Intercept history.pushState and history.replaceState for SPA frameworks
  if (typeof history !== "undefined") {
    originalPushState = history.pushState.bind(history);
    originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      const result = originalPushState?.apply(this, args);
      triggerNavigation();
      return result;
    };

    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      const result = originalReplaceState?.apply(this, args);
      triggerNavigation();
      return result;
    };
  }

  return stopPageObserver;
}

export function stopPageObserver(): void {
  if (!isObserving) return;

  isObserving = false;
  activeCallback = null;

  if (navigationTimer) {
    clearTimeout(navigationTimer);
    navigationTimer = null;
  }

  window.removeEventListener("popstate", handlePopState);

  if (originalPushState && typeof history !== "undefined") {
    history.pushState = originalPushState;
    originalPushState = null;
  }

  if (originalReplaceState && typeof history !== "undefined") {
    history.replaceState = originalReplaceState;
    originalReplaceState = null;
  }
}
