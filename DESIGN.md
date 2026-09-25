# Workit Design System

Status: **Canonical visual rules**
Applies to: extension launcher, contextual popup, application assistant, workspace

---

## 1. Direction

Workit is a serious productivity tool.

The interface should feel:

- white-dominant;
- calm;
- precise;
- compact;
- technical;
- functional;
- high-density without feeling cramped.

Build hierarchy in this order:

```text
position
→ spacing
→ typography
→ surface
→ border
→ elevation
→ green
```

Color is never decoration.

---

## 2. Color

### Neutral structure

```css
:root {
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
}
```

### 70 / 20 / 10

```text
70% white
20% soft green
10% green
```

This is a visual emphasis rule, not a required pixel calculation.

White:
- page;
- popup body;
- table;
- content;
- form.

Soft green:
- selected state;
- ready-to-autofill state;
- canonical source notice;
- AI/memory suggestion;
- subtle positive context.

Green:
- primary CTA;
- progress;
- active indicator;
- confirmed positive evidence.

Orange/red:
- semantic warning/failure only.

No other decorative hue.

---

## 3. Typography

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  sans-serif;
```

Scale:

```text
12px metadata
13px controls / table rows
14px important body
16px section heading
18px secondary screen heading
24px maximum page heading
```

Weights:

```text
400 regular
500 medium
600 semibold
```

Rules:

- primary text = `#444444`;
- avoid pure black;
- avoid heavy bold;
- use weight before increasing size;
- keep product copy operational and short.

---

## 4. Spacing

```text
4px   micro
6px   related metadata / tight control
8px   compact content / element gap
10px  dense layout rhythm
12px  standard component padding
14px  compact card padding
16px  baseline layout / container padding
```

Compact does not mean cramped.

### Layout Grid & Density Standards (16px Baseline Rhythm)

All workspace surfaces share a unified horizontal baseline rhythm:

- **Shell horizontal baseline:** `16px` (flushed across Topbar Header, Table first column, and Document containers).
- **Topbar Header:** `padding: 10px 16px` (slim, persistent header with view title and right-aligned global search trigger).
- **Jobs Table:** Header `th` and cells `td` use `padding: 7px 12px`, with first column (`th:first-child`, `td:first-child`) and last column having `16px` outer padding.
- **Document Containers (`.profile-container`):** `padding: 16px 16px 40px; max-width: 860px; margin: 0;` (aligns left boundary directly with the 16px topbar grid).
- **Cards (`.profile-card`):** `padding: 14px 16px; margin-bottom: 12px; border-radius: var(--radius-control);`.
- **Sidebar:** `190px` width, `10px 14px` header, `8px` nav padding with `6px 10px` nav items.
- **Preview Drawer (`.preview-pane`):** `380px` width, `16px` padding.

---

## 5. Radius

```css
--radius-chip: 6px;
--radius-control: 8px;
--radius-card: 10px;
--radius-popup: 14px;
--radius-pill: 999px;
```

Do not assign arbitrary radius values.

Avoid oversized rounded SaaS cards.

---

## 6. Border

Default:

```css
border: 1px solid var(--line);
```

Use `--line-strong` for:

- popup outer edge;
- focused controls;
- important structural boundaries;
- menus.

Prefer dividers and spacing before creating another card.

---

## 7. Elevation

The product should feel mostly flat.

Use:

```text
precise 1px edge
+
small layered shadow
```

Only contextual overlays and popup surfaces should clearly float.

Do not use giant blurred shadows or glowing borders.

---

## 8. Buttons

### Primary

```text
green background
white text
```

Used for one dominant action.

Examples:

- Save job
- Auto-fill 8 fields
- Add job

### Secondary

```text
white background
neutral border
#444444 text
```

### Quiet

Transparent normally, subtle neutral background on hover.

Examples:

- row menu;
- close;
- settings;
- toolbar icon.

### Interaction

```text
hover   → background/border change
active  → scale(.97)
disabled → opacity .5
```

No dramatic motion.

---

## 9. Status

### Positive

```text
green foreground
+
soft green background
```

### Warning

```text
warning foreground
+
warning-soft background
```

### Failure / closed / destructive

```text
danger foreground
+
danger-soft background
```

Do not use large saturated status surfaces.

---

## 10. Tables & Workspace Shell

Jobs Workspace uses a continuous table surface.

Prefer:

```text
one surface
+
precise row dividers
+
compact cells (7px 12px)
```

Do not render every job as a floating card.

Selected row:

```text
soft-green background
+
2px green left indicator
```

### Global Search Placement

Global Search (⌘K Command Palette) is a global modal action, not a page view:
- Placed in the **Topbar Header** (`.workspace-header`) on the right side as a persistent `.workspace-search-trigger`.
- The Sidebar `<nav>` is strictly reserved for page view navigation (`Jobs`, `Profile`, `Answers`). It must never contain modal dialog triggers or actions.

---

## 11. Floating Workit launcher

```text
44 × 44px
fixed bottom-right
20px from viewport edges
```

The launcher:

- sits above the website;
- does not resize the site;
- opens a contextual popup;
- remains visible while popup is open.

Popup entry:

```text
opacity 0 → 1
translateY(8px) → 0
150–200ms
```

Close via:

- launcher click;
- close button;
- Escape;
- optional outside click where safe.

---

## 12. Popup

Capture:

```text
360–380px width
max-height ~680px
```

Application Assistant:

```text
420–460px width
max-height viewport - 32px
```

Popup structure:

```text
Header
↓
Current context
↓
State / useful data
↓
Primary action
```

Use internal scroll instead of making the popup excessively tall.

---

## 13. AI and autofill state

AI and automation must expose state.

Do not collapse everything into spinner → result.

Useful states:

```text
Detecting fields…
Matching profile data…
Searching answer memory…
Ready
Needs review
Filled
Failed
```

Suggested data is not the same as applied data.

```text
suggestion
→ review
→ approve
→ fill
```

---

## 14. Motion

Motion communicates:

- open/close;
- state change;
- progress;
- spatial relationship.

Durations:

```text
100–150ms hover / feedback
150–200ms control / popup
220–300ms movement / expansion
```

Avoid:

- bounce;
- elastic movement;
- permanent ambient animation;
- decorative motion.

Respect `prefers-reduced-motion`.

---

## 15. Iconography

Use thin, geometric icons.

Typical:

```text
12px micro
14px normal
16px prominent
```

Do not place every icon inside a visible circle.

Use text when icon meaning is ambiguous.

---

## 16. Screen-specific color use

### Browser Capture

Mostly white.

Soft green:
- job detected;
- positive evidence.

Green:
- Save job.

Status color:
- unsupported/gap only.

### Jobs

Mostly white table.

Soft green:
- selected row;
- active filter.

Green:
- active positive status;
- progress;
- Add job.

### Job Detail

Mostly white.

Soft green:
- strong evidence labels;
- application positive state.

Warning/danger:
- partial/gap only.

### Profile

Mostly white.

Soft green:
- canonical source notice;
- profile completion positive states.

Green:
- primary import/action only when needed.

### Application Assistant

Mostly white.

Soft green:
- ready fields;
- saved-answer suggestion.

Green:
- Auto-fill CTA;
- confirmed field states.

Warning:
- question needs review;
- missing canonical data.

---

## 17. Acceptance test

Before shipping a screen, verify:

### Hierarchy
Can the primary information be found immediately?

### Density
Is space used for meaningful information rather than decorative whitespace?

### Color
Does every non-neutral hue communicate state or action?

### White dominance
Is the screen visually dominated by white rather than green tint?

### Text
Is primary copy `#444444`, never harsh pure black?

### Surfaces
Is every card/container structurally necessary?

### State
Can the user distinguish suggested, ready, filled, warning, and completed states?

### Action
Is one primary next action obvious?

### Consistency
Would this screen look native beside the other Workit screens?
