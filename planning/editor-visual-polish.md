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

## Phase 2: Unified UI Primitives ✅ COMPLETE (commit `7e22bb6`)

Unified the 5 most repeated UI patterns across all components (commit `7e22bb6`):

- **Inputs**: Consistent padding, background, border-radius, focus ring across BlockCard, RuneAttributes, FrontmatterEditor, modals, NavEditor, TagsInput
- **Buttons (3 tiers)**: Primary (accent bg, white text), Secondary (surface bg, border), Ghost (transparent, hover fill), Danger (red variant)
- **Cards**: Baseline shadow + consistent border-radius on BlockCard, RegionCard, InsertMenu
- **Segmented Controls**: iOS/Linear-style with gray track + white active segment + shadow (mode toggles, form/raw toggles)
- **Badges**: Pill shape with consistent sizing (BlockCard category, FileTree draft indicator)

---

## Phase 3: Component-Level Polish ✅ COMPLETE

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

## Phase 4: Interaction Polish ✅ COMPLETE

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

## Svelte Component → Identity Transform Migration Analysis

5 runes can move from Svelte components to identity transform via `postTransform`:

| Component | Effort | Approach |
|---|---|---|
| **Testimonial** | ~30 lines | Inject 5 star spans, CSS handles fill via `[data-rating]` + `:nth-child` |
| **DesignContext** | Trivial | Already a wrapper. Sandbox reads tokens from its own meta tags instead |
| **Embed** | ~40 lines | Create iframe with `aspect-ratio` CSS (replaces JS padding hack) |
| **Chart** | ~100 lines | Parse JSON data from meta, compute SVG geometry (deterministic math) |
| **Comparison** | ~150 lines | Build table or card grid from children |

4 runes must remain as Svelte components: **Diagram** (Mermaid.js), **Map** (Leaflet), **Nav** (app context), **Sandbox** (interactive iframe).

No engine changes needed — all use `postTransform`. Inline preview coverage goes from ~90% to ~96%.

---

## Phase 5: Inline Block Previews (Shadow DOM) ✅ COMPLETE

### Architecture Decision

Evaluated four approaches for inline preview:
- **Option A (side-by-side)**: Current layout — works but cognitive disconnect between editing and seeing
- **Option B (per-block iframes)**: Rejected — 20+ iframes causes memory/performance problems
- **Option C (Shadow DOM per block)**: **Selected** — inline HTML previews via Shadow DOM, ~90% pixel-perfect, ~10% placeholder for Svelte-component runes
- **Option D (single iframe editor)**: Investigated — CSS isolation problem (theme global resets bleed into editor controls), state management split via postMessage, behavior conflicts. ~5-8 weeks vs ~2-3 weeks for Option C. Not recommended.

The identity transform pipeline (`createTransform()` + `renderToHtml()`) is fully client-safe (zero `node:` imports, pure functions, sub-millisecond per block). CSS isolation is clean: theme uses `--rf-*` tokens, editor uses `--ed-*` — zero collision. Shadow DOM traps theme `global.css` resets.

### 5A. Server — Expose Theme Data

Add `themeCss` and a JSON-safe `themeConfig` to the existing `/api/config` response in `packages/editor/src/server.ts`. Both values are already computed at startup. Strip the single `postTransform` function from the config (only the `Preview` rune uses it).

### 5B. Client State — Store Theme Data

Add `themeCss: string` and `themeConfig: ThemeConfig | null` fields to `EditorState`. Fetch on init alongside the existing config request.

### 5C. Client Renderer Module

Create `packages/editor/app/src/lib/preview/block-renderer.ts`:
- Import Markdoc (already an editor dependency), rune schemas, `createTransform` + `renderToHtml` from `@refrakt-md/transform`
- Export `renderBlockPreview(source: string, themeConfig: ThemeConfig): string`
- Pure function: parse → transform → identity transform → HTML string
- Sub-millisecond per block, no server round-trip

### 5D. BlockCard — Shadow DOM Preview

In `BlockCard.svelte`, add a preview section below the form controls:
- Attach Shadow DOM, inject theme CSS + rendered HTML
- Re-render on block source changes with ~50ms debounce
- Svelte-component runes (~10%) show a styled placeholder
- Preview is visible when the card is expanded

### 5E. Preview Toggle

Add a "Full Preview" button in `HeaderBar.svelte`:
- Center panel switches from BlockEditor to full-width PreviewPane
- Reuses the existing iframe mechanism
- Provides layout context and full-fidelity rendering for all rune types

### Critical files

| File | Changes |
|------|---------|
| `packages/editor/src/server.ts` | Add `themeCss` + `themeConfig` to `/api/config` |
| `packages/editor/app/src/lib/state/editor.svelte.ts` | `themeCss`, `themeConfig` fields |
| `packages/editor/app/src/lib/preview/block-renderer.ts` | **New** — client-side Markdoc→HTML pipeline |
| `packages/editor/app/src/lib/components/BlockCard.svelte` | Shadow DOM preview section |
| `packages/editor/app/src/lib/components/BlockEditor.svelte` | Pass theme data context |
| `packages/editor/app/src/lib/components/HeaderBar.svelte` | "Full Preview" toggle |
| `packages/editor/app/src/lib/components/EditorLayout.svelte` | Panel layout switching for preview mode |

---

## Future Enhancements (post Phase 5)

These items were considered during planning and remain good candidates for future work:

- **Inline heading/paragraph editing** — contenteditable with Markdoc round-trip
- **Click-to-highlight preview bridge** — clicking in preview scrolls to block in editor
- **Page-oriented file tree** — show titles from frontmatter instead of filenames
- **Auto-save with status indicator** — debounced save after ~2s of inactivity
- **Document-level undo/redo** — Cmd+Z/Cmd+Shift+Z in Visual mode
- **Floating toolbar** — formatting toolbar on text selection
- **Focus preview for complex runes** — single shared iframe renders the selected Svelte-component rune with full fidelity (enhancement to Phase 5)

---

## Verification

1. **Visual diff**: Run the editor (`cd packages/editor && npm run dev`) and compare each area against the changes
2. **Interaction check**: Test save, expand/collapse, drag-drop, mode switching, file navigation, context menus, modals
3. **Browser compatibility**: Check in Chrome and Safari (macOS primary targets)
4. **No functional regressions**: All editing, saving, preview, and file operations must work identically
5. **Inline preview** (Phase 5): Expand a rune block card → verify Shadow DOM preview renders correctly with theme CSS. Check Hint, Api, Hero, Steps for variety. Verify Svelte-component runes (Diagram, Map) show placeholders. Toggle full preview and verify it shows the complete page.
