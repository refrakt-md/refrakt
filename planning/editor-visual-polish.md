# Editor Visual Polish Plan

## Context

The content editor (`packages/editor/`) is functionally solid but feels like a developer tool prototype. Target users are marketing/content teams who need an approachable, polished experience — "VSCode meets Squarespace." This plan focuses on visual consistency, depth, and interaction polish without adding features or rewriting components.

**Root problem:** No shared design system. Each of the 26 components defines its own hardcoded colors, spacing, font sizes, shadows, and button styles. This creates visual inconsistency that makes the whole editor feel unfinished.

---

## Phase 1: Design Token Foundation

**Create** `packages/editor/app/src/lib/styles/tokens.css` — a single source of truth for all visual values. Import it in `App.svelte`.

**Token categories:**

```css
:root {
  /* Surfaces (4 levels of depth) */
  --ed-surface-0: #ffffff;        /* cards, inputs, modals */
  --ed-surface-1: #f8fafc;        /* sidebar, header, code bg */
  --ed-surface-2: #f1f5f9;        /* hover states, gutters, segmented control track */
  --ed-surface-3: #e2e8f0;        /* active states, separators */

  /* Borders (3 levels) */
  --ed-border-default: #e2e8f0;
  --ed-border-subtle: #f1f5f9;
  --ed-border-strong: #cbd5e1;

  /* Text (4 levels) */
  --ed-text-primary: #1a1a2e;
  --ed-text-secondary: #475569;
  --ed-text-tertiary: #64748b;
  --ed-text-muted: #94a3b8;

  /* Accent */
  --ed-accent: #0ea5e9;
  --ed-accent-hover: #0284c7;
  --ed-accent-subtle: #e0f2fe;
  --ed-accent-ring: rgba(14, 165, 233, 0.15);

  /* Semantic */
  --ed-warning: #d97706;
  --ed-warning-subtle: #fef3c7;
  --ed-danger: #ef4444;
  --ed-danger-hover: #dc2626;
  --ed-danger-subtle: #fef2f2;
  --ed-success: #16a34a;

  /* Typography — consolidate from 6 sizes to 5 */
  --ed-text-xs: 0.6875rem;   /* 11px - tiny labels */
  --ed-text-sm: 0.75rem;     /* 12px - labels, captions */
  --ed-text-base: 0.8125rem; /* 13px - standard UI text */
  --ed-text-md: 0.875rem;    /* 14px - inputs, body */
  --ed-text-lg: 1rem;        /* 16px - titles */

  /* Spacing — consolidate to 6 steps */
  --ed-space-1: 0.25rem;  --ed-space-2: 0.5rem;  --ed-space-3: 0.75rem;
  --ed-space-4: 1rem;     --ed-space-5: 1.25rem;  --ed-space-6: 1.5rem;

  /* Radii */
  --ed-radius-sm: 4px;  --ed-radius-md: 6px;  --ed-radius-lg: 8px;

  /* Shadows (currently almost none — this is the biggest visual upgrade) */
  --ed-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --ed-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03);
  --ed-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.10), 0 0 0 1px rgba(0, 0, 0, 0.04);

  /* Transitions */
  --ed-transition-fast: 120ms ease;
  --ed-transition-normal: 180ms ease;
  --ed-transition-slow: 280ms ease;
}
```

**Then:** Mechanically replace all hardcoded values across all 26 components with `var(--ed-*)` references. This is a zero-visual-change refactor — same values, just centralized.

### Files to modify
Every `.svelte` file in `packages/editor/app/src/lib/components/` plus `App.svelte`.

---

## Phase 2: Unified UI Primitives

Define consistent patterns for the 5 most repeated UI elements. Each component's `<style>` block adopts these patterns (no component library — just consistent specs).

### Inputs
**Problem:** 5 different background colors, 3 different paddings, 3 different border-radius values.
**Fix:** All inputs get: `padding: var(--ed-space-2) var(--ed-space-3)`, `background: var(--ed-surface-0)`, `border-radius: var(--ed-radius-sm)`, `border: 1px solid var(--ed-border-default)`. Focus state: `border-color: var(--ed-accent); box-shadow: 0 0 0 3px var(--ed-accent-ring)`.
**Affects:** BlockCard, RuneAttributes, FrontmatterEditor, modals, NavEditor, TagsInput

### Buttons (3 tiers)
**Problem:** 8+ distinct button styles.
**Fix:**
- **Primary** (Save, Create): `background: var(--ed-accent)`, white text, `box-shadow: var(--ed-shadow-sm)`, hover lifts 1px
- **Secondary** (Cancel, mode toggles, add-field): `background: var(--ed-surface-0)`, `border: 1px solid var(--ed-border-default)`, hover fills `var(--ed-surface-2)`
- **Ghost** (icon buttons, remove, file-tree actions): transparent bg, hover fills `var(--ed-surface-2)`
- **Danger**: Same as primary but red
**Affects:** HeaderBar, modals, BlockCard, InsertMenu, FrontmatterEditor, FileTree, ContextMenu

### Cards
**Problem:** BlockCards have no baseline shadow, barely visible borders when collapsed.
**Fix:** `background: var(--ed-surface-0); border: 1px solid var(--ed-border-default); border-radius: var(--ed-radius-lg); box-shadow: var(--ed-shadow-sm)`. Hover: `box-shadow: var(--ed-shadow-md)`.
**Affects:** BlockCard, RegionCard, InsertMenu panel

### Segmented Controls
**Problem:** Mode toggles (Code/Visual, replace/prepend/append) use bordered buttons with blue active fill — looks dated.
**Fix:** iOS/Linear-style: gray track (`var(--ed-surface-2)`) with white active segment + shadow. Much more modern and approachable.
**Affects:** App.svelte mode-toggle, FrontmatterEditor form/raw toggle, LayoutEditor visual/raw toggle, RegionCard mode buttons

### Badges
**Problem:** Category badges are rectangular with inconsistent sizing.
**Fix:** Pill shape (`border-radius: 99px`), consistent padding, `font-size: var(--ed-text-xs)`, `font-weight: 600`.
**Affects:** BlockCard category, FileTree draft indicator

---

## Phase 3: Component-Level Polish

### 3A. HeaderBar
- Replace `border-bottom` with `box-shadow` for depth separation from content
- Add subtle logo accent (small colored dot via `::before`)
- File path → breadcrumb segments (split by `/`, separator in muted color, document icon)
- Unsaved dot: add pulse animation
- Viewport toggles: wrap in segmented control background
- Save button: apply primary button style. Show checkmark icon briefly after successful save

### 3B. FileTree + FileTreeNode
- Add SVG icons: document (pages), grid (layouts), folder (directories), folder-open (expanded)
- Replace text `▸` arrow with SVG chevron that rotates smoothly
- Active state: 3px left accent border + `var(--ed-accent-subtle)` background
- Draft files: full opacity + "Draft" pill badge instead of `opacity: 0.5`
- Loading state: skeleton shimmer bars instead of plain text

### 3C. FrontmatterEditor
- Collapsed summary: show title + truncated description instead of just "Frontmatter"
- Left accent border (amber for layouts, blue for pages)
- Smooth expand/collapse animation via `grid-template-rows: 0fr / 1fr` transition
- Apply unified input primitives
- Replace native checkbox with toggle switch for Draft field

### 3D. BlockCard
- Apply card primitive (baseline shadow, consistent border-radius)
- Type-colored left accent border: heading=blue, rune=amber, content=gray
- Replace `☰` drag handle with 6-dot grip SVG (consistent with NavItemRow)
- Smooth expand/collapse animation
- Drag-over: add glow effect (`box-shadow: 0 -4px 12px var(--ed-accent-ring)`)
- Apply unified input primitives

### 3E. InsertMenu
- Rune buttons get small colored category dots + description text below name
- Content block buttons get small icons (H, pilcrow, code brackets, line)
- Grid layout (`grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))`) instead of flex-wrap
- Shadow upgrade to `var(--ed-shadow-lg)`, radius to `var(--ed-radius-xl)`

### 3F. PreviewPane
- Add thin "Preview" header bar with refresh indicator
- Loading state: thin indeterminate progress bar at top during debounce
- Mobile/tablet: subtle device chrome (rounded corners, status bar dots) via CSS pseudo-elements
- Better empty state with browser-window illustration

### 3G. ResizeHandle
- Center three-dot grip indicator (CSS pseudo-element), visible on hover
- Hover: fill with `var(--ed-accent-subtle)`, slight width expansion
- Active/dragging: `var(--ed-accent)` at reduced opacity

### 3H. Modals + ContextMenu
- Backdrop: add `backdrop-filter: blur(4px)`
- Enter animation: `translateY(8px) scale(0.98)` → origin
- Context menu: scale-from-95% + fade-in entrance animation
- Template selector (CreatePageModal): add small icons above template names
- Context menu items: add 14px SVG icons (pencil, copy, trash, eye)

---

## Phase 4: Interaction Polish

### Global focus ring
Add to `App.svelte` global styles:
```css
:global(:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 3px var(--ed-accent-ring);
}
```

### Loading states
- File tree: skeleton shimmer bars (CSS `@keyframes shimmer` with gradient)
- File loading: thin indeterminate progress bar at top of center panel
- Preview: thin progress bar during debounce window

### Save feedback
After successful save: Save button briefly shows green checkmark for 1.5s, then transitions back. Small `saveJustCompleted` state flag with `setTimeout` reset.

### Expand/collapse animations
FrontmatterEditor and BlockCard bodies use CSS grid animation:
```css
.collapse-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--ed-transition-slow); }
.collapse-wrapper.open { grid-template-rows: 1fr; }
.collapse-wrapper > div { overflow: hidden; }
```

### Drag-and-drop feedback
- Source card: `opacity: 0.6; transform: rotate(1deg)` during drag
- Drop target: accent glow

### Empty states
Three decorative illustrations (48px inline SVG + text):
1. No file selected (center panel)
2. No blocks (visual editor)
3. No preview (right panel)

---

## Critical Files

| File | Changes |
|------|---------|
| `packages/editor/app/src/lib/styles/tokens.css` | **New** — design token definitions |
| `packages/editor/app/src/App.svelte` | Token import, global styles, mode-toggle segmented control |
| `packages/editor/app/src/lib/components/HeaderBar.svelte` | Shadow, breadcrumbs, save feedback, viewport controls |
| `packages/editor/app/src/lib/components/FileTree.svelte` | Header shadow, loading skeleton |
| `packages/editor/app/src/lib/components/FileTreeNode.svelte` | Icons, active accent, draft badges, chevron animation |
| `packages/editor/app/src/lib/components/FrontmatterEditor.svelte` | Summary, expand animation, input unification |
| `packages/editor/app/src/lib/components/BlockCard.svelte` | Card primitive, type accent, grip SVG, expand animation |
| `packages/editor/app/src/lib/components/BlockEditor.svelte` | InsertMenu redesign, empty state, drag feedback |
| `packages/editor/app/src/lib/components/RuneAttributes.svelte` | Input unification |
| `packages/editor/app/src/lib/components/PreviewPane.svelte` | Header bar, loading indicator, device chrome, empty state |
| `packages/editor/app/src/lib/components/EditorLayout.svelte` | Panel token migration |
| `packages/editor/app/src/lib/components/ResizeHandle.svelte` | Grip indicator, hover/active states |
| `packages/editor/app/src/lib/components/ContextMenu.svelte` | Icons, enter animation |
| `packages/editor/app/src/lib/components/CreatePageModal.svelte` | Backdrop blur, enter animation, template icons |
| `packages/editor/app/src/lib/components/ConfirmDialog.svelte` | Backdrop blur, enter animation, button unification |
| `packages/editor/app/src/lib/components/LayoutEditor.svelte` | Segmented control, token migration |
| `packages/editor/app/src/lib/components/RegionCard.svelte` | Segmented control, input unification |

---

## Verification

1. **Visual diff**: Run the editor (`cd packages/editor && npm run dev`) and compare each area against the changes
2. **Interaction check**: Test save, expand/collapse, drag-drop, mode switching, file navigation, context menus, modals
3. **Browser compatibility**: Check in Chrome and Safari (macOS primary targets)
4. **No functional regressions**: All editing, saving, preview, and file operations must work identically
