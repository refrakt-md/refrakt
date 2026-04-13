{% spec id="SPEC-026" status="accepted" tags="lumina, themes, css, reference-implementation" %}

# Lumina Theme — Reference Implementation

Lumina is the default theme and reference implementation of the universal theming dimensions (SPEC-024, SPEC-025). This spec documents Lumina's concrete choices for surface assignments, sentiment colours, density behaviour, media sizing, and per-rune overrides — proving the dimension model works end-to-end and serving as the template for community themes.

---

## Overview

Lumina provides CSS for 78 runes across core and all 9 community packages. Today, each rune has its own CSS file with per-rune rules. After implementing SPEC-024 and SPEC-025, Lumina will shift to a layered approach:

1. **Generic dimension CSS** (~40 rules) — handles every rune's metadata, sections, density, state, and media
2. **Surface assignments** (~4 selector groups) — assigns runes to card/inline/banner/inset
3. **Per-rune overrides** — only where a rune needs treatment beyond the generic rules

The existing 78 per-rune CSS files will be gradually refactored. Runes whose current CSS closely matches the generic treatment can drop most of their rules. Runes with unique visual treatment keep per-rune overrides.

---

## Design Tokens

Lumina's tokens in `packages/lumina/tokens/base.css` map to the dimension system's custom properties:

### Colour Tokens

| Token | Light | Dark | Dimension use |
|-------|-------|------|---------------|
| `--rf-color-success` | `#10b981` (emerald) | `#34d399` | `--meta-color` for `positive` sentiment |
| `--rf-color-danger` | `#ef4444` (red) | `#f87171` | `--meta-color` for `negative` sentiment |
| `--rf-color-warning` | `#f59e0b` (amber) | `#fbbf24` | `--meta-color` for `caution` sentiment |
| `--rf-color-muted` | `#64748b` (slate) | `#94a3b8` | `--meta-color` for `neutral` sentiment |
| `--rf-color-primary-500` | `#0ea5e9` (sky) | `#38bdf8` | Accent for `active` state indicators |
| `--rf-color-surface` | `#ffffff` | `#1e293b` | Card/banner backgrounds |
| `--rf-color-bg` | `#ffffff` | `#0f172a` | Page background |
| `--rf-color-border` | `#e2e8f0` | `#334155` | Card borders, footer separators |

### Spacing Tokens

| Token | Value | Dimension use |
|-------|-------|---------------|
| `--rf-space-xs` | `0.25rem` | `--rune-padding` at `minimal` density |
| `--rf-space-sm` | `0.5rem` | `--rune-padding` at `compact` density |
| `--rf-space-md` | `1.5rem` | `--rune-padding` at `full` density (default) |
| `--rf-space-lg` | `2rem` | Section margins at `full` density |

### Radius Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--rf-radius-sm` | `6px` | Category chips, thumbnail corners |
| `--rf-radius-md` | `10px` | Card containers, cover image top corners |
| `--rf-radius-lg` | `16px` | Hero sections |
| `--rf-radius-full` | `9999px` | Status pills, portrait crops |

### Typography Tokens

| Token | Value | Dimension use |
|-------|-------|---------------|
| `--rf-font-sans` | Outfit, system-ui, sans-serif | Body, section titles |
| `--rf-font-mono` | JetBrains Mono, Fira Code, monospace | `[data-meta-type="id"]` |

---

## Surface Assignments

Lumina assigns every container-level rune to one of four surfaces. These are the concrete CSS selector groups.

### Card

Elevated container with background, border, and border-radius. Used for standalone entity runes that represent a discrete "thing".

```css
.rf-recipe,
.rf-character,
.rf-work,
.rf-bug,
.rf-decision,
.rf-spec,
.rf-milestone,
.rf-testimonial,
.rf-event,
.rf-realm,
.rf-faction,
.rf-lore,
.rf-plot,
.rf-bond,
.rf-playlist,
.rf-track,
.rf-budget,
.rf-cast,
.rf-organization,
.rf-timeline,
.rf-swatch,
.rf-palette,
.rf-typography,
.rf-itinerary,
.rf-symbol,
.rf-changelog,
.rf-api,
.rf-howto,
.rf-comparison,
.rf-pricing {
  background: var(--rf-color-surface);
  border: 1px solid var(--rf-color-border);
  border-radius: var(--rf-radius-md);
  padding: var(--rune-padding, var(--rf-space-md));
}
```

### Inline

No visual boundary — flows with surrounding prose. Used for runes that augment or annotate content rather than standing alone.

```css
.rf-hint,
.rf-details,
.rf-sidenote,
.rf-conversation,
.rf-annotate,
.rf-xref,
.rf-diff,
.rf-pullquote,
.rf-textblock,
.rf-nav,
.rf-breadcrumb,
.rf-toc,
.rf-datatable,
.rf-form {
  padding: var(--rune-padding, var(--rf-space-sm)) 0;
}
```

### Banner

Full-width strip with background. Used for marketing/landing page runes that span the viewport.

```css
.rf-hero,
.rf-cta,
.rf-feature,
.rf-steps,
.rf-bento,
.rf-storyboard,
.rf-map {
  background: var(--rf-color-surface);
  padding: var(--rune-padding, var(--rf-space-xl)) 0;
}
```

### Inset

Recessed container with muted background. Used for code/media containers and interactive sandboxes.

```css
.rf-codegroup,
.rf-sandbox,
.rf-preview,
.rf-mockup,
.rf-showcase,
.rf-diagram,
.rf-chart,
.rf-embed,
.rf-juxtapose,
.rf-gallery,
.rf-figure,
.rf-reveal {
  background: var(--rf-color-surface);
  border-radius: var(--rf-radius-md);
  padding: var(--rune-padding, var(--rf-space-md));
}
```

### Unsurfaced Runes

These runes are structural/utility and don't receive surface treatment:

- **Layout runes**: `layout`, `region`, `page-section`, `grid`, `mediatext`, `bg`, `tint`
- **Child runes**: `accordion-item`, `tab`, `bento-cell`, `comparison-column`, `timeline-entry`, `itinerary-day`, `itinerary-stop`, `map-pin`, `cast-member`, etc.

---

## Sentiment Colours

Lumina maps the four sentiments to its semantic colour tokens:

```css
[data-meta-sentiment="positive"] { --meta-color: var(--rf-color-success); }
[data-meta-sentiment="negative"] { --meta-color: var(--rf-color-danger); }
[data-meta-sentiment="caution"]  { --meta-color: var(--rf-color-warning); }
[data-meta-sentiment="neutral"]  { --meta-color: var(--rf-color-muted); }
```

These four rules cascade into all meta type styles. Dark mode works automatically — the token values in `tokens/dark.css` provide lighter variants of each colour for dark backgrounds.

### Sentiment in Context

| Sentiment | Light mode | Dark mode | Example fields |
|-----------|-----------|-----------|----------------|
| `positive` | Emerald `#10b981` | `#34d399` | alive, done, easy, accepted, alliance |
| `negative` | Red `#ef4444` | `#f87171` | dead, blocked, critical, deprecated, rivalry |
| `caution` | Amber `#f59e0b` | `#fbbf24` | review, high priority, hard, caution, missing |
| `neutral` | Slate `#64748b` | `#94a3b8` | draft, medium, in-progress, neutral alignment |

---

## Density Behaviour

### Padding Scale

```css
[data-density="full"]    { --rune-padding: var(--rf-space-md); }  /* 1.5rem */
[data-density="compact"] { --rune-padding: var(--rf-space-sm); }  /* 0.5rem */
[data-density="minimal"] { --rune-padding: var(--rf-space-xs); }  /* 0.25rem */
```

### Content Visibility

| Section | `full` | `compact` | `minimal` |
|---------|--------|-----------|-----------|
| header (metadata) | Visible | Visible (secondary hidden) | Visible (secondary hidden) |
| title | Full size | Reduced (`1.125rem`) | Small (`1rem`) |
| description | Visible | 2-line clamp | Hidden |
| body | Visible | Visible | Hidden |
| footer | Visible | Visible | Hidden |
| media | Full size | Reduced size | Hidden |

### Compact Specifics

```css
[data-density="compact"] [data-section="title"] {
  font-size: 1.125rem;
}

[data-density="compact"] [data-section="description"] {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

[data-density="compact"] [data-meta-rank="secondary"] {
  display: none;
}

[data-density="compact"] [data-media="portrait"] {
  --media-portrait-size: 3rem;
}

[data-density="compact"] [data-media="cover"] {
  aspect-ratio: 3 / 1;
}
```

### Minimal Specifics

```css
[data-density="minimal"] [data-section="description"],
[data-density="minimal"] [data-section="body"],
[data-density="minimal"] [data-section="footer"] {
  display: none;
}

[data-density="minimal"] [data-meta-rank="secondary"] {
  display: none;
}

[data-density="minimal"] [data-media] {
  display: none;
}
```

---

## Section Anatomy Styling

Lumina's visual treatment for each section role:

```css
[data-section="header"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: var(--rf-space-sm);
}

[data-section="title"] {
  font-family: var(--rf-font-sans);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--rf-color-text);
  margin: 0;
}

[data-section="description"] {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--rf-color-muted);
  margin: var(--rf-space-xs) 0 var(--rf-space-md);
}

[data-section="body"] {
  line-height: 1.6;
  color: var(--rf-color-text);
}

[data-section="footer"] {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rf-space-sm);
  margin-top: var(--rf-space-md);
  padding-top: var(--rf-space-sm);
  border-top: 1px solid var(--rf-color-border);
}

[data-section="media"] {
  margin: var(--rf-space-sm) 0;
}
```

---

## Media Slot Sizing

| Slot | Lumina sizing | Notes |
|------|--------------|-------|
| `portrait` | `5rem` (80px), circular | Character, cast member, artist |
| `cover` | 100% width, `16:9` aspect | Recipe, event, album |
| `thumbnail` | `3rem` (48px), `--rf-radius-sm` corners | Track artwork, list items |
| `hero` | 100% width, responsive height | Hero background images |
| `icon` | `2rem` (32px), no crop | Logos, small illustrations |

```css
[data-media="portrait"] {
  border-radius: var(--rf-radius-full);
  aspect-ratio: 1 / 1;
  object-fit: cover;
  width: var(--media-portrait-size, 5rem);
  height: var(--media-portrait-size, 5rem);
}

[data-media="cover"] {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--rf-radius-md) var(--rf-radius-md) 0 0;
}

[data-media="thumbnail"] {
  width: var(--media-thumbnail-size, 3rem);
  height: var(--media-thumbnail-size, 3rem);
  border-radius: var(--rf-radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

[data-media="hero"] {
  width: 100%;
  object-fit: cover;
}

[data-media="icon"] {
  width: var(--media-icon-size, 2rem);
  height: var(--media-icon-size, 2rem);
  object-fit: contain;
  flex-shrink: 0;
}
```

---

## Interactive State Transitions

Lumina provides smooth transitions for state changes:

### Open/Closed

```css
[data-state="open"] > [class*="__content"] {
  display: block;
  animation: rf-expand 0.2s ease-out;
}

[data-state="closed"] > [class*="__content"] {
  display: none;
}

@keyframes rf-expand {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Active/Inactive (Tabs)

```css
button[data-state="active"] {
  border-bottom: 2px solid var(--rf-color-primary-500);
  color: var(--rf-color-primary-500);
}

button[data-state="inactive"] {
  border-bottom: 2px solid transparent;
  color: var(--rf-color-muted);
}

[data-state="active"][data-section="body"] {
  display: block;
}

[data-state="inactive"][data-section="body"] {
  display: none;
}
```

### Selected/Disabled

```css
[data-state="selected"] {
  background: color-mix(in oklch, var(--rf-color-primary-500) 10%, transparent);
  outline: 2px solid var(--rf-color-primary-500);
}

[data-state="disabled"] {
  opacity: 0.4;
  pointer-events: none;
}
```

---

## Per-Rune Overrides

After the generic dimension rules, these runes need Lumina-specific overrides:

### Hint

Hint uses coloured left borders based on type (info/warning/danger/success) — a visual treatment not covered by the generic inline surface:

```css
.rf-hint {
  border-left: 3px solid var(--rf-color-info);
  padding-left: var(--rf-space-md);
}

.rf-hint--warning { border-left-color: var(--rf-color-warning); }
.rf-hint--danger  { border-left-color: var(--rf-color-danger); }
.rf-hint--success { border-left-color: var(--rf-color-success); }
```

### Api

The API method badge has specific per-method background colours beyond what sentiment provides (GET is green, POST is blue, PUT is orange, DELETE is red). Lumina keeps per-method styling:

```css
.rf-api[data-method="GET"]    .rf-api__method { background: var(--rf-color-success); }
.rf-api[data-method="POST"]   .rf-api__method { background: var(--rf-color-primary-500); }
.rf-api[data-method="PUT"]    .rf-api__method { background: var(--rf-color-warning); }
.rf-api[data-method="DELETE"] .rf-api__method { background: var(--rf-color-danger); }
```

### Accordion

Accordion panels have specific border and separator styling between items:

```css
.rf-accordion {
  border: 1px solid var(--rf-color-border);
  border-radius: var(--rf-radius-md);
  overflow: hidden;
}

.rf-accordion__panel + .rf-accordion__panel {
  border-top: 1px solid var(--rf-color-border);
}
```

### Tabs

Tab bar has a bottom border that the active tab indicator sits on:

```css
.rf-tabs__list {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--rf-color-border);
}
```

### Hero

Hero uses full-bleed layout with large typography beyond what the banner surface provides:

```css
.rf-hero {
  text-align: center;
  padding: var(--rf-space-2xl) var(--rf-space-lg);
}

.rf-hero [data-section="title"] {
  font-size: clamp(2rem, 5vw, 3.5rem);
}
```

### Pricing

Pricing tiers need highlighted/recommended column treatment:

```css
.rf-pricing__tier--highlighted {
  border-color: var(--rf-color-primary-500);
  box-shadow: var(--rf-shadow-md);
  transform: scale(1.02);
}
```

### Tint

Tint rune overrides the surface colour tokens within its scope — this is structural and cannot be handled by dimensions:

```css
[data-tint] {
  --rf-color-surface: var(--tint-background, var(--rf-color-surface));
  --rf-color-text: var(--tint-text, var(--rf-color-text));
}
```

---

## Migration Path

### Phase 1: Add Generic Dimension CSS

Create a new `packages/lumina/styles/dimensions/` directory with:

- `meta-types.css` — 6 type rules
- `meta-sentiments.css` — 4 sentiment rules
- `meta-ranks.css` — 2 rank rules
- `surfaces.css` — 4 surface definitions + assignments
- `density.css` — 3 density levels + section interactions
- `sections.css` — 6 section anatomy rules
- `states.css` — 6 interactive state rules
- `media-slots.css` — 5 media slot rules

Import these in `index.css` before the per-rune imports.

### Phase 2: Audit Per-Rune CSS

For each of the 78 rune CSS files, compare the existing rules against what the generic dimension CSS provides. Categorise each rune:

| Category | Action | Example runes |
|----------|--------|---------------|
| **Fully generic** | Remove per-rune CSS entirely | bond, lore, plot, milestone, bug |
| **Mostly generic** | Keep only unique overrides | recipe (ingredient list), character (portrait layout) |
| **Needs overrides** | Keep per-rune file with reduced rules | hint (border-left), api (method colours), hero (full-bleed) |
| **Structural** | No dimension changes apply | tint, layout, region, grid |

### Phase 3: Incremental Migration

Migrate runes one package at a time:

1. **plan** package — all 5 runes are badge-heavy, ideal for metadata system validation
2. **storytelling** package — character, realm, faction test all dimensions (metadata, media, sections)
3. **docs** package — api and symbol test the `id` and `temporal` meta types
4. **learning** package — recipe and howto are the canonical examples from the specs
5. **marketing** package — hero, cta, feature test the banner surface
6. **core** runes — largest group, migrate last after patterns are proven

For each rune:
1. Add `metaType`/`metaRank`/`sentimentMap` to structure entry children in config
2. Verify output with `refrakt inspect <rune> --audit`
3. Remove redundant per-rune CSS rules
4. Run CSS coverage tests to verify nothing broke

---

## Acceptance Criteria

- [ ] Generic dimension CSS covers all 8 dimensions with ~40 rules
- [ ] Every container-level rune is assigned to a surface
- [ ] Sentiment colours use Lumina's semantic tokens
- [ ] Density levels hide/show content correctly at each level
- [ ] All existing visual tests pass after migration
- [ ] CSS coverage tests pass with updated `UNSTYLED_BLOCKS` / `KNOWN_MISSING_SELECTORS`
- [ ] Per-rune CSS files are reduced to overrides only
- [ ] Community runes (plan, storytelling, docs, etc.) look consistent with core runes
- [ ] Dark mode works correctly for all sentiment colours and surfaces

{% /spec %}
