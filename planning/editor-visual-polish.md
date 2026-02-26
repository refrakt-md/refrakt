# Editor Visual Polish Plan

## Context

The content editor (`packages/editor/`) is functionally solid but feels like a developer tool prototype. Target users are marketing/content teams who need an approachable, polished experience — "VSCode meets Squarespace." This plan focuses on visual consistency, depth, and interaction polish without adding features or rewriting components.

**Root problem:** No shared design system. Each of the 26 components defines its own hardcoded colors, spacing, font sizes, shadows, and button styles. This creates visual inconsistency that makes the whole editor feel unfinished.

---

## Phase 1: Design Token Foundation ✅ COMPLETE

**Created** `packages/editor/app/src/lib/styles/tokens.css` — a single source of truth for all visual values. Imported in `App.svelte`.

**Token categories defined:**

| Category | Tokens | Examples |
|----------|--------|---------|
| Surfaces | 4 levels | `--ed-surface-0` (cards) through `--ed-surface-3` (active states) |
| Borders | 3 levels | `--ed-border-default`, `--ed-border-subtle`, `--ed-border-strong` |
| Text | 4 levels | `--ed-text-primary` through `--ed-text-muted` |
| Accent | 5 variants | `--ed-accent`, `--ed-accent-hover`, `--ed-accent-subtle`, `--ed-accent-muted`, `--ed-accent-ring` |
| Semantic | Warning, danger, success, heading, unsaved | `--ed-warning`, `--ed-danger`, `--ed-success`, etc. |
| Typography | 5 sizes | `--ed-text-xs` (11px) through `--ed-text-lg` (16px) |
| Font families | 2 | `--ed-font-sans`, `--ed-font-mono` |
| Spacing | 6 steps | `--ed-space-1` (0.25rem) through `--ed-space-6` (1.5rem) |
| Radii | 3 sizes | `--ed-radius-sm` (4px), `--ed-radius-md` (6px), `--ed-radius-lg` (8px) |
| Shadows | 4 levels | `--ed-shadow-sm` through `--ed-shadow-xl` |
| Transitions | 3 speeds | `--ed-transition-fast` (120ms), `--ed-transition-normal` (180ms), `--ed-transition-slow` (280ms) |

**All 18 component files migrated** to use `var(--ed-*)` references instead of hardcoded values:

- `App.svelte` — token import, global body styles, mode-toggle
- `HeaderBar.svelte` — header, logo, file path, save button, viewport toggles
- `FileTree.svelte` + `FileTreeNode.svelte` — sidebar, tree items, active/hover/draft states
- `EditorLayout.svelte` + `ResizeHandle.svelte` — panel backgrounds, handle colors
- `BlockCard.svelte` + `BlockEditor.svelte` — cards, insert menu, drag states
- `FrontmatterEditor.svelte` + `RawYamlEditor.svelte` + `TagsInput.svelte` — form fields, inputs
- `PreviewPane.svelte` — viewport, iframe, empty state
- `RuneAttributes.svelte` — inputs, selects, toggle switch
- `LayoutEditor.svelte` + `RegionCard.svelte` — layout header, mode toggles, regions
- `NavEditor.svelte` + `NavItemRow.svelte` — group headers, items, drag states
- `CreatePageModal.svelte` + `CreateDirectoryModal.svelte` — modal shell, fields, buttons
- `RenameDialog.svelte` + `ConfirmDialog.svelte` — dialog shell, buttons
- `ContextMenu.svelte` — menu background, items
- `ExternalChangeBanner.svelte` — warning banner, buttons
- `MarkdownEditor.svelte` — empty state text

**Not migrated (intentional):** `InlineEditor.svelte` — CodeMirror theme colors are in JS objects (not CSS), so CSS custom properties can't be used there. A few `#ffffff` values for white text on colored buttons were left as absolute values.

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

---

## Phase 5: Block Editor as Primary Editing Surface

### Context

The visual polish (Phases 1–4) establishes a consistent design system. This phase addresses a deeper UX question: **what is the primary editing surface?** Currently, Visual mode feels secondary to Code mode — block cards show raw form controls, and the preview is a passive iframe. For non-engineer users, the block editor should feel like *the* editor, with the preview serving as real-time confirmation.

After evaluating three approaches:
- **A: Block Editor Primary** — enhance the center panel with inline WYSIWYG editing
- **B: Preview Primary** — make the preview interactive, center becomes property inspector
- **C: Convergence** — collapse editor and preview into one editable surface

**Decision: Block Editor Primary (A)** with a targeted borrow from B (click-to-highlight bridge).

**Why not Preview Primary or Convergence?**
- The iframe **must stay** for multi-framework support — React/Astro renderers will run inside it. No alternative (Shadow DOM, CSS Layers, direct embedding) provides equivalent CSS + JS + framework isolation.
- Making the preview editable requires source-position tracking through the entire transform pipeline and cooperation from every framework renderer. Very high complexity, fragile.
- Convergence requires reverse-mapping rendered DOM to Markdoc source and editing UI inside the iframe mixed with theme CSS. Even higher complexity, and each framework renderer must support editing. Prohibitive for multi-framework.

**Why Block Editor Primary works:**
- The block editor operates on Markdoc source, fully decoupled from the rendering framework. When React/Astro renderers arrive, the editor needs zero changes.
- The current block parser architecture (`ParsedBlock[]` → serialize → `editorState.updateBody()`) already supports incremental enhancement of individual block types.
- The iframe preview provides true WYSIWYG confirmation, and click-to-highlight creates the bridge between "what I see" and "what I edit."

### 5A. Inline Heading Editing

**What changes:** The heading block card replaces its `<input>` field with a contenteditable element styled as the appropriate heading level (h1–h6).

**Behavior:**
- Font sizes approximate the theme's heading scale (not exact theme values — the editor has its own design system, but h1 is visually large, h2 smaller, etc.)
- Basic text editing: typing, selection, cut/copy/paste
- Enter commits the edit (no multi-line headings)
- Escape reverts to the saved value
- On blur, serialize back to the markdown heading syntax (`# `, `## `, etc.)

**Files:**
- `packages/editor/app/src/lib/components/BlockCard.svelte` — heading block rendering
- `packages/editor/app/src/lib/editor/block-parser.ts` — ensure heading round-trip fidelity

### 5B. Inline Paragraph Editing

**What changes:** Paragraph blocks replace their CodeMirror/InlineEditor with a contenteditable `<div>` that supports basic inline formatting.

**Behavior:**
- Renders formatted text (bold, italic, links visible inline)
- Keyboard shortcuts: Cmd+B bold, Cmd+I italic, Cmd+K insert link
- On blur, serialize back to Markdoc syntax (`**bold**`, `*italic*`, `[text](url)`)
- Multi-line supported (paragraphs can contain line breaks)
- No block-level formatting inside paragraphs (that's what adding new blocks is for)

**Files:**
- `packages/editor/app/src/lib/components/BlockCard.svelte` — paragraph block rendering
- `packages/editor/app/src/lib/components/InlineEditor.svelte` — may be replaced or significantly reworked for paragraphs
- `packages/editor/app/src/lib/editor/block-parser.ts` — round-trip for inline formatting marks

### 5C. Click-to-Highlight Preview Bridge

**What changes:** Clicking an element in the preview scrolls to and highlights the corresponding block in the block editor.

**Implementation:**

1. **Block index injection (editor-specific):** When preparing preview data, inject `data-block-index` attributes onto top-level rendered elements. This maps each rendered element to its position in the `ParsedBlock[]` array from the block parser. This injection happens in the editor's preview data pipeline, NOT in the core identity transform engine.

2. **Preview runtime click handling:** Extend `preview-runtime/App.svelte` to intercept clicks, walk up to the nearest `[data-block-index]` ancestor, and send `postMessage({ type: 'preview-select', blockIndex: N })` to the parent editor.

3. **Selection overlay in preview:** Show a subtle highlight (blue outline + light fill) on the clicked element in the preview to confirm what was selected.

4. **Editor-side response:** `PreviewPane.svelte` receives the message and updates `editorState.selectedBlockIndex`. `BlockEditor.svelte` scrolls to that block card and applies a brief highlight animation (glow + fade).

5. **Graceful degradation:** In HTML fallback mode (no Svelte runtime), click-to-highlight is not available. No errors, just no click interception.

**Files:**
- `packages/editor/app/src/lib/components/PreviewPane.svelte` — message handler for `preview-select`
- `packages/editor/preview-runtime/App.svelte` — click interception, selection overlay
- `packages/editor/app/src/lib/components/BlockEditor.svelte` — scroll-to-block, highlight state
- `packages/editor/app/src/lib/state/editor.svelte.ts` — `selectedBlockIndex` state
- Editor server-side preview data endpoint — inject block indices into serialized tree

### 5D. Improved Rune Attribute Editing

**What changes:** Better visual treatment for rune attribute forms. Not adding mini-previews — the live preview with click-to-highlight provides sufficient visual feedback.

**Improvements:**
- Clearer field labels with short descriptions for non-obvious attributes
- Logical field grouping (primary attributes first, advanced collapsed)
- Consistent use of unified input primitives from Phase 2
- Type-appropriate inputs (color pickers for color values, dropdowns for enums, toggles for booleans)

**Files:**
- `packages/editor/app/src/lib/components/RuneAttributes.svelte` — layout, labels, field grouping

### 5E. Page-Oriented File Tree

**What changes:** The sidebar shows page titles from frontmatter instead of filenames. Non-engineers think in pages ("Getting Started"), not files (`getting-started.md`).

**Implementation:**
- Extend `GET /api/tree` response to include `title` and `description` from frontmatter in each `TreeNode`. The server already parses frontmatter to extract `draft` — extracting `title` is trivial.
- `FileTreeNode` displays `title` (falling back to `name` if no title). Optional truncated description snippet in muted text below the title.
- Keep the tree structure — the content model is hierarchical and a tree is the right UI.
- Breadcrumbs already planned in Phase 3A.

**Files:**
- `packages/editor/src/server.ts` — extend `directoryToJson()` to include `title` and `description`
- `packages/editor/app/src/lib/state/editor.svelte.ts` — extend `TreeNode` type with optional `title` and `description`
- `packages/editor/app/src/lib/components/FileTreeNode.svelte` — display title, optional description

### 5F. Auto-Save with Status Indicator

**What changes:** Content saves automatically after ~2s of inactivity. No more losing work.

**Behavior:**
- Debounce `editorContent` changes, auto-save after ~2s of inactivity
- Show status in header: "Saving..." → "Saved 2s ago" (relative time, updating)
- `Cmd+S` triggers immediate save (bypasses debounce)
- Configurable: user can toggle auto-save off, reverting to manual save with Save button
- Auto-save preference persisted in `localStorage`
- When auto-save is OFF: show current Save button with unsaved dot. `Cmd+S` still works.
- Own-write SSE suppression already exists, no changes needed.

**Files:**
- `packages/editor/app/src/lib/state/editor.svelte.ts` — `autoSave`, `saveStatus`, `lastSavedAt` state
- `packages/editor/app/src/App.svelte` — auto-save `$effect` with debounce, `localStorage` persistence
- `packages/editor/app/src/lib/components/HeaderBar.svelte` — status indicator, auto-save toggle

### 5G. Document-Level Undo/Redo

**What changes:** Cmd+Z / Cmd+Shift+Z work in Visual mode, undoing/redoing content changes.

**Approach:** Document-level snapshots of `editorContent`. Simple stack-based history.

**Behavior:**
- Push to undo stack on "meaningful changes" — block add/remove/reorder, attribute edit, text edit commit (on blur, not per-keystroke)
- `Cmd+Z` pops undo stack → pushes current state to redo → restores previous
- `Cmd+Shift+Z` pops redo stack → pushes current to undo
- Redo stack clears on new edits (standard)
- Stack capped at ~50 entries
- Only active in Visual mode — CodeMirror has its own undo in Code mode

**Files:**
- `packages/editor/app/src/lib/state/editor.svelte.ts` — `undoStack`, `redoStack`, `pushUndo()`, `undo()`, `redo()`
- `packages/editor/app/src/App.svelte` — keyboard handler for Cmd+Z/Cmd+Shift+Z in visual mode
- `packages/editor/app/src/lib/components/BlockEditor.svelte` — call `pushUndo()` before mutations

### 5H. Contextual Floating Toolbar

**What changes:** Floating toolbar appears on text selection in contenteditable paragraph blocks.

**Pairs with 5B** — without contenteditable paragraphs, there's nothing to show a toolbar for.

**Behavior:**
- Appears on text selection within a contenteditable block
- Shows: Bold (B), Italic (I), Link (chain icon)
- Positioned above the selection, centered horizontally
- Disappears on selection collapse or click outside
- Keyboard shortcuts still work — the toolbar is a visual affordance, not the only way

**Files:**
- New: `packages/editor/app/src/lib/components/FloatingToolbar.svelte`
- `packages/editor/app/src/lib/components/BlockCard.svelte` — selection listener, toolbar positioning

### Implementation Order

Within Phase 5:
1. Inline heading editing (5A) — highest visual impact, lowest complexity
2. Inline paragraph editing (5B) — contenteditable with basic formatting
3. Contextual floating toolbar (5H) — pairs with paragraph editing
4. Auto-save (5F) — replaces manual save, immediate UX improvement
5. Document-level undo/redo (5G) — safety net for visual editing
6. Smooth block interactions (already in Phase 4, continued here)
7. Page-oriented file tree (5E) — titles from frontmatter
8. Click-to-highlight bridge (5C) — preview → editor selection
9. Attribute form improvements (5D) — better rune editing UX

---

## Architectural Decisions Record

### Iframe stays (multi-framework requirement)

**Evaluated alternatives:**

| Alternative | CSS Isolation | Framework Isolation | Verdict |
|---|---|---|---|
| Shadow DOM | Partial (inherited props leak) | None — need to mount foreign frameworks | Breaks with React/Astro |
| CSS Layers | Weak (selectors match across boundaries) | None | Insufficient |
| CSS Containment | None (perf optimization only) | None | Irrelevant |
| Direct embedding | None without extra work | Same-framework only | Harmful for multi-framework |

The iframe provides: complete CSS isolation (`--ed-*` vs `--rf-*` namespaces), complete JS isolation (separate document/framework runtime), proper document context (`<head>`, `<body>`, `document.querySelector` for behaviors), and framework-agnostic hosting (any renderer runs inside it).

### No rune mini-previews in block editor

The live preview pane with click-to-highlight provides sufficient visual feedback. Mini-previews would require Shadow DOM isolation per block card with injected theme CSS — significant complexity for marginal UX gain.

### Block index mapping is editor-specific

The `data-block-index` injection happens in the editor's preview data pipeline, not in the core identity transform engine (`packages/transform/src/engine.ts`). This keeps the transform engine clean and avoids coupling it to the editor's block parser.

---

## Verification

1. **Visual diff**: Run the editor (`cd packages/editor && npm run dev`) and compare each area against the changes
2. **Interaction check**: Test save, expand/collapse, drag-drop, mode switching, file navigation, context menus, modals
3. **Browser compatibility**: Check in Chrome and Safari (macOS primary targets)
4. **No functional regressions**: All editing, saving, preview, and file operations must work identically
5. **Inline editing round-trip**: Edit a heading in the block editor → confirm correct markdown in Code mode and in preview
6. **Paragraph formatting**: Apply bold/italic via keyboard shortcuts → confirm Markdoc syntax round-trip
7. **Floating toolbar**: Select text in paragraph → toolbar appears → click Bold → text wraps in `**`
8. **Auto-save**: Edit content → wait 2s → "Saved" status in header. Toggle off → Save button reappears.
9. **Undo/redo**: Edit a block → Cmd+Z → previous state restores. Cmd+Shift+Z → redo works, clears on new edit.
10. **File tree titles**: Tree shows page titles from frontmatter, falls back to filename when no title
11. **Click-to-highlight**: Click an element in the preview → confirm block editor scrolls to correct block with highlight animation
12. **Fallback mode**: Test with HTML fallback preview (no Svelte runtime) → click-to-highlight should be absent but no errors
