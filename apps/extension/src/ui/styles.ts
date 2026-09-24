export const WORKIT_SHADOW_STYLES = `
:host {
  all: initial;
  display: block;
  position: static;
  z-index: 2147483647;
}

.workit-root {
  --white: #FFFFFF;
  --text: #444444;
  --text-muted: #777777;
  --text-faint: #9A9A9A;
  --line: #E9E9E9;
  --line-strong: #DCDCDC;
  --hover: #F8F8F8;

  --green: #2F7D44;
  --green-hover: #286D3B;
  --green-soft: #F2F8F3;
  --green-soft-2: #EAF4EC;
  --green-line: #D8EADB;

  --warning: #B86B00;
  --warning-soft: #FFF6E8;
  --danger: #C94646;
  --danger-soft: #FFF1F1;

  --radius-chip: 6px;
  --radius-control: 8px;
  --radius-card: 10px;
  --radius-popup: 14px;
  --radius-pill: 999px;

  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.workit-root *,
.workit-root *::before,
.workit-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: inherit;
}

/* Floating Launcher */
.workit-launcher {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-popup);
  background: var(--white);
  border: 1px solid var(--line-strong);
  color: var(--green);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2147483647;
  transition: background 150ms ease, border-color 150ms ease, transform 100ms ease, box-shadow 150ms ease;
  user-select: none;
  outline: none;
}

.workit-launcher:hover {
  background: var(--hover);
  border-color: var(--green-line);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
}

.workit-launcher:active {
  transform: scale(0.97);
}

.workit-launcher.is-open {
  border-color: var(--green);
  background: var(--green-soft);
}

.workit-launcher:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}

.workit-launcher-mark {
  font-weight: 700;
  font-size: 17px;
  line-height: 1;
  letter-spacing: -0.5px;
  color: var(--green);
}

.workit-indicator-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  border-radius: var(--radius-pill);
  background: var(--green);
  border: 2px solid var(--white);
}

/* Context Popup */
.workit-popup {
  position: fixed;
  right: 20px;
  bottom: 74px;
  width: 360px;
  max-height: min(680px, calc(100vh - 94px));
  border-radius: var(--radius-popup);
  background: var(--white);
  border: 1px solid var(--line-strong);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  z-index: 2147483647;
  overflow: hidden;
  color: var(--text);
  animation: workit-popup-in 160ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes workit-popup-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.workit-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--white);
}

.workit-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workit-brand-logo {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-chip);
  background: var(--green);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
}

.workit-brand-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  letter-spacing: -0.2px;
}

.workit-close-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  transition: background 120ms ease, color 120ms ease;
  outline: none;
}

.workit-close-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.workit-close-btn:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 1px;
}

.workit-popup-body {
  padding: 16px;
  overflow-y: auto;
  max-height: 580px;
}

.workit-context-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: var(--radius-chip);
  font-size: 12px;
  font-weight: 500;
  background: var(--hover);
  color: var(--text-muted);
  border: 1px solid var(--line);
  margin-bottom: 12px;
}

.workit-context-tag.is-job {
  background: var(--green-soft);
  color: var(--green);
  border-color: var(--green-line);
}

.workit-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--text-faint);
}

.workit-context-tag.is-job .workit-tag-dot {
  background: var(--green);
}

.workit-empty-message {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 4px;
}

.workit-empty-subtext {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

/* Job Preview Card in Popup */
.workit-job-preview {
  margin-top: 8px;
}

.workit-job-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.workit-job-company {
  font-size: 13px;
  font-weight: 500;
  color: var(--green);
  margin-top: 2px;
}

.workit-job-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.workit-primary-btn {
  margin-top: 16px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--green);
  color: var(--white);
  border: 1px solid var(--green);
  border-radius: var(--radius-control);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease, transform 100ms ease;
  outline: none;
}

.workit-primary-btn:hover {
  background: var(--green-hover);
}

.workit-primary-btn:active {
  transform: scale(0.98);
}

.workit-primary-btn:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 2px;
}
`;
