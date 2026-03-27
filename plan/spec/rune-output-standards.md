{% spec id="SPEC-028" status="draft" tags="runes, transform, themes, architecture" %}

# Rune Output Standards

> Codify the structural patterns established by the recipe rune as the reference standard for all rune output — schema transforms, engine configs, and identity-transformed HTML.

---

## Overview

The recipe rune (in `@refrakt-md/learning`) has been refined to model best practices for rune output. This spec captures those patterns as enforceable standards so that existing and future runes produce consistent, well-structured HTML.

The goal is not visual uniformity — runes represent different domains and should look different. The goal is **structural consistency**: predictable BEM classes, meaningful data attributes, clean semantic markup, and correct use of the engine's declarative config.

---

## Standard 1 — BEM Modifier Classes for Enumerable Values Only

BEM modifier classes (`.rf-{block}--{value}`) must only be emitted for values drawn from a **constrained, enumerable set** that a theme would realistically target in CSS.

### Rule

- If the attribute has a `matches` constraint or a small fixed set of values (e.g. `layout`, `difficulty`, `status`, `role`), it **should** produce a BEM modifier class.
- If the attribute is free-form, numeric, or an unbounded string (e.g. `prepTime`, `servings`, `tags`, `aliases`, `id`), it **must** set `noBemClass: true` in the engine config.
- Data attributes (`data-*`) are always emitted regardless of `noBemClass` — these are the correct mechanism for free-form value selectors.

### Rationale

Classes like `.rf-recipe--PT5M` or `.rf-character--"Gandalf the Grey,Mithrandir"` are not useful CSS selectors. They bloat the class list and can't be anticipated by a theme. Data attributes (`[data-prep-time="PT5M"]`) are the right mechanism for targeting specific values or testing for presence (`[data-prep-time]`).

### Reference

Recipe config (`runes/learning/src/config.ts`):

```ts
modifiers: {
  layout:     { source: 'meta', default: 'stacked' },        // enumerable → BEM class
  difficulty: { source: 'meta', default: 'medium' },          // enumerable → BEM class
  prepTime:   { source: 'meta', noBemClass: true },           // free-form → no BEM class
  servings:   { source: 'meta', noBemClass: true },           // numeric → no BEM class
  ratio:      { source: 'meta', default: '1 1', noBemClass: true }, // layout param → no BEM class
}
```

### Known Violations

| Rune | Modifier | Reason |
|------|----------|--------|
| Character | `aliases`, `tags` | Free-form comma-separated strings |
| Realm | `scale`, `tags`, `parent` | Free-form strings |
| Faction | `factionType`, `tags` | Free-form strings |
| Lore | `tags` | Free-form string |
| Plot | `tags` | Free-form string |
| Beat | `id`, `track`, `follows` | Identifiers / free-form |

Note: Playlist config already follows this standard correctly — `type` and `layout` produce BEM classes (enumerable), while `ratio`, `valign`, `gap`, `collapse` use `noBemClass: true`.

---

## Standard 2 — Preamble Groups with Content

For runes that represent page sections (extending `PageSection` or using eyebrow/headline/blurb), the preamble (header elements) should be **nested inside the content wrapper**, not emitted as a sibling at the article level.

### Rule

- Wrap eyebrow, headline, and blurb in a `<header>` with `data-name="preamble"`.
- Place that header inside the content `<div>`, before the body content.
- Meta badges and media are siblings of content at the article level.

### Rationale

- Split layouts need preamble to flow with body content in the same grid column.
- Semantic grouping is correct — the heading introduces the content that follows it.
- CSS can still target `.rf-{block}__preamble` independently via BEM element selectors.
- Cover/overlay layouts work via `display: contents` on the content wrapper — no DOM restructuring needed.

### Reference Structure

```html
<article class="rf-recipe">
  <div class="rf-recipe__meta">...</div>           <!-- chrome -->
  <div class="rf-recipe__media">...</div>           <!-- media -->
  <div class="rf-recipe__content">                  <!-- content wrapper -->
    <header class="rf-recipe__preamble">            <!-- preamble inside content -->
      <p class="rf-recipe__eyebrow">...</p>
      <h2 class="rf-recipe__headline">...</h2>
      <p class="rf-recipe__blurb">...</p>
    </header>
    <ul class="rf-recipe__ingredients">...</ul>     <!-- body -->
    <ol class="rf-recipe__steps">...</ol>
  </div>
</article>
```

### Known Violations

| Rune | Issue |
|------|-------|
| Playlist | Builds a custom `<div data-name="header">` with imperative `data-name` assignment on the title, bypassing the `pageSectionProperties` + `<header>` preamble pattern. Description paragraphs are not wrapped as a blurb. Config lacks `preamble` section — has `sections: { header: 'header', title: 'title', media: 'media' }` instead of the recipe pattern `{ meta: 'header', preamble: 'preamble', headline: 'title', blurb: 'description', media: 'media' }`. |

---

## Standard 3 — Config Must Match Schema Capabilities

If the schema transform emits a structural element (e.g. a scene image, a media zone), the engine config must declare the corresponding `sections`, `mediaSlots`, and `autoLabel` entries so the identity transform annotates it correctly.

### Rule

- Every named `ref` in `createComponentRenderable` should have a corresponding `autoLabel` or `sections` entry in the config.
- Every media container should have a `mediaSlots` entry (e.g. `{ scene: 'cover' }`) so the engine adds `data-media` and `data-section="media"`.

### Known Violations

| Rune | Issue |
|------|-------|
| Faction | Schema extracts a scene image and emits a `scene` ref, but config lacks `mediaSlots: { scene: 'cover' }` and `sections` entry for `scene: 'media'` |
| Playlist | Schema emits `artistMeta`, `hasPlayerMeta`, and an `id` meta tag, but config declares no corresponding modifiers — the identity transform won't produce `data-artist`, `data-player`, or `data-id` attributes on the root element. A theme cannot target `[data-player="true"]` to adjust layout when the player is present. |

---

## Standard 3a — Media Zones Must Unwrap Paragraph-Wrapped Images

When Markdoc transforms a Markdown image (`![alt](src)`), it produces `<p><img .../></p>` — the image is inline content inside a paragraph node. Media zones must unwrap this to emit a bare `<img>` inside the media container, not a `<p>` containing an `<img>`.

### Rule

- Media zone transforms must extract the `<img>` tag from its `<p>` wrapper before placing it in the media container.
- The resulting HTML should be `<div data-name="media"><img .../></div>`, not `<div data-name="media"><p><img .../></p></div>`.
- Use `RenderableNodeCursor`'s `.tag('img')` traversal (which digs into children) rather than passing the raw `Markdoc.transform()` output directly into the media wrapper.

### Rationale

- A paragraph wrapping an image is semantically wrong — an image is not a paragraph.
- It forces CSS to work around the extra element (`.rf-recipe__media img` instead of `.rf-recipe__media > img`), breaking direct child selectors that themes might use.
- The shared `[data-media="cover"]` dimension styles target `img` directly and expect it as a direct child or near-direct descendant.
- The storytelling runes (`realm.ts`, `faction.ts`) already unwrap this manually with a 15-line paragraph-digging loop. `pageSectionProperties` in `common.ts` also handles it correctly via `cursor.tag('img').limit(1)`.

### Reference

Correct approach (using `RenderableNodeCursor`):

```ts
// Extract bare <img> from media zone — unwraps Markdoc's <p><img/></p>
const mediaImg = mediaCursor.tag('img').limit(1);
const mediaDiv = mediaImg.count() > 0 ? mediaImg.wrap('div') : undefined;
```

Incorrect (current recipe approach — passes paragraph through):

```ts
// Media zone rendered as-is — <p><img/></p> survives into output
const side = new RenderableNodeCursor(
  Markdoc.transform(mediaAstNodes, config) as RenderableTreeNode[],
);
const mediaDiv = side.wrap('div');
```

### Known Violations

| Rune | Issue |
|------|-------|
| Recipe | Media zone passes `Markdoc.transform()` output directly into wrapper — `<p><img/></p>` survives |
| Playlist | Same pattern — media zone content not unwrapped |

Note: Realm and Faction already unwrap correctly, but with duplicated inline code (see Standard 4).

---

## Standard 4 — Avoid Duplicated Transform Logic

When multiple runes in the same package share structural patterns (scene image extraction, layout meta tag emission, content building), extract shared logic into package-level helpers rather than copy-pasting.

### Rule

- Identify repeated patterns across rune transforms within a package.
- Extract into named helpers (e.g. `extractMediaImage()`, `buildLayoutMetas()`).
- Each rune's transform should read as a composition of helpers plus rune-specific logic.
- Cross-package patterns (like paragraph-unwrapping for media zones) should be provided as shared utilities in `@refrakt-md/runes` alongside existing helpers like `pageSectionProperties` and `RenderableNodeCursor`.

### Known Violations

| Package | Issue |
|---------|-------|
| storytelling | `realm.ts` and `faction.ts` share ~90% identical code: scene image extraction (paragraph → img dig), description rendering, layout meta tag creation, content building, and `createComponentRenderable` structure |
| cross-package | The paragraph → img unwrap pattern appears in `realm.ts`, `faction.ts` (inline, 15 lines each) and is *missing* from `recipe.ts` and `playlist.ts`. Should be a single shared utility. |

---

## Standard 5 — Minimize Transform Code Paths

A rune's `transform()` function should produce a single `createComponentRenderable` call with conditional properties/refs, rather than duplicating the entire call across branches.

### Rule

- Use conditional spreading (`...(condition ? { key: value } : {})`) to vary properties and refs.
- One `createComponentRenderable` call per transform function.

### Known Violations

| Rune | Issue |
|------|-------|
| Character | Two full `createComponentRenderable` calls in `hasSections` / else branches, differing only in one property and one ref |

---

## Standard 6 — Layout Meta Tag Emission Should Be Shared

Runes that extend `SplitLayoutModel` all emit the same boilerplate for layout meta tags (layout, ratio, valign, gap, collapse) with identical conditional logic. This pattern should be extracted rather than repeated.

### Rule

- Layout meta tag creation (the `layout !== 'stacked'` guards, gap/collapse conditionals) should be a shared utility, not copy-pasted per rune.
- The utility should accept the attrs object and return the set of meta tags and their property map entries.

### Known Violations

| Package | Runes |
|---------|-------|
| storytelling | `realm.ts`, `faction.ts` — identical layout meta block |
| media | `playlist.ts` — same pattern, independently written |
| learning | `recipe.ts` — same pattern (reference implementation, but should also use the shared utility once extracted) |

---

## Standard 7 — Shared Split Layout CSS via Structural Selectors

Runes that follow the standard 3-section structure (meta header, content wrapper, media zone) should not duplicate split layout grid placement CSS. The shared `split.css` layer should handle this using attribute selectors, so per-rune CSS files contain only domain-specific body content styling.

### Rule

- The shared `split.css` (`packages/lumina/styles/layouts/split.css`) should define explicit grid column/row placement for the standard 3-section pattern using `[data-section]` and `[data-name]` attribute selectors.
- Per-rune CSS files must not redefine grid-template-columns, grid-column, grid-row, or mobile collapse rules for split/split-reverse layouts when the standard structure applies.
- Per-rune CSS files should contain only domain-specific body content styling (e.g. ingredient lists, track lists, step counters).
- Shared media container patterns (border-radius, overflow, img sizing, split box-shadow) should also move to the dimension layer.
- Mobile collapse must support two distinct modes depending on the rune category (see below).

### Rationale

Recipe and playlist both define ~60 lines of near-identical split layout CSS with the only difference being the BEM prefix (`.rf-recipe__` vs `.rf-playlist__`). Every future rune with split layout + media will copy them again. Since the identity transform already emits `data-section="header"`, `data-name="content"`, and `data-section="media"` on the standard structural elements, the grid placement can be expressed once with attribute selectors:

```css
/* 3-section split: header + content in primary column, media spans rows */
[data-layout="split"] > [data-section="header"]  { grid-column: 1; grid-row: 1; }
[data-layout="split"] > [data-name="content"]    { grid-column: 1; grid-row: 2; }
[data-layout="split"] > [data-section="media"]   { grid-column: 2; grid-row: 1 / 3; }

[data-layout="split-reverse"] > [data-section="header"]  { grid-column: 2; grid-row: 1; }
[data-layout="split-reverse"] > [data-name="content"]    { grid-column: 2; grid-row: 2; }
[data-layout="split-reverse"] > [data-section="media"]   { grid-column: 1; grid-row: 1 / 3; }
```

This works for any rune that follows the standard structure — no BEM prefix needed.

### Two-Mode Mobile Collapse

When a split layout collapses to a single column on mobile, the media zone's position relative to the preamble differs by rune category. The shared layer must handle both modes.

#### Content-first media (content runes)

Content runes like **recipe**, **playlist**, **realm**, and **faction** typically have a cover image or scene photo in their media zone. On mobile, this image should appear **above** the preamble as a full-bleed card header — it sets the visual context for the content below. Recipe achieves this today with `order: -1` on the media zone plus negative-margin full-bleed treatment.

Mobile source order: **media → meta → preamble → body**

#### Preamble-first media (marketing runes)

Marketing runes like **hero**, **feature**, and **step** typically have a code block, product screenshot, or interactive demo in their media zone. On mobile, the **preamble (headline + CTA) must lead** — it's the hook that draws the reader in. The media supports the preamble and should appear after it, following the natural DOM order. These runes already delegate to `split.css` today, which resets to DOM order on collapse via `order: unset`.

Mobile source order: **meta → preamble → body → media**

#### Implementation approach

The shared `split.css` should support both modes via a data attribute on the root element (e.g. `data-media-position="top"` for content-first, with preamble-first as the default). This keeps the behavior declarative and avoids per-rune CSS for collapse ordering:

```css
/* Default collapse: DOM order (preamble first, media after) */
@media (max-width: 640px) {
  [data-layout^="split"][data-collapse] {
    grid-template-columns: 1fr;
  }
  [data-layout^="split"][data-collapse] > * {
    grid-column: auto;
    grid-row: auto;
    order: unset;
  }
}

/* Content-first: hoist media above preamble on collapse */
@media (max-width: 640px) {
  [data-layout^="split"][data-collapse][data-media-position="top"] > [data-section="media"] {
    order: -1;
  }
}
```

The `data-media-position` attribute would be emitted by the engine config as a modifier (or directly by the schema transform as a meta tag). Content runes opt in with `data-media-position="top"`; marketing runes omit it or use the default. The full-bleed card header treatment (negative margins, border-radius reset) also belongs in the shared layer, gated on `[data-media-position="top"]`.

#### Classification

| Mode | Runes | Rationale |
|------|-------|-----------|
| **Preamble-first** (default) | Hero, Feature, Step | Headline/CTA is the hook; media (code blocks, product shots) supports it |
| **Content-first** (`data-media-position="top"`) | Recipe, Playlist, Realm, Faction | Cover image sets visual context; content follows below |

Future runes choose the appropriate mode based on what their media zone typically contains. Most content/editorial runes will want content-first; most marketing/landing-page runes will want preamble-first.

### Prerequisite

Standard 2 (preamble inside content) must be applied first. If a rune emits its header/title as a direct child of the article instead of inside the content wrapper, it produces 4 direct children instead of 3, breaking the grid placement. Once all runes follow the standard structure, the CSS converges naturally.

### Patterns to Migrate to Shared Layer

| Pattern | Current location | Target |
|---------|-----------------|--------|
| Split grid explicit column/row placement | `recipe.css:128–156`, `playlist.css:141–167` | `split.css` |
| Mobile collapse (reset grid-column/row) | `recipe.css:172–182`, `playlist.css:169–183` | `split.css` |
| Content-first media hoist (`order: -1`) | `recipe.css:186–189` | `split.css` (gated on `[data-media-position="top"]`) |
| Full-bleed card header (negative margin bleed) | `recipe.css:190–199` | `split.css` (gated on `[data-media-position="top"]`) |
| Split media box-shadow | `recipe.css:158–161`, `playlist.css:186–189` | `split.css` or `media.css` |
| Media zone container (border-radius, overflow, img block sizing) | `recipe.css:104–113`, `playlist.css:119–130` | `media.css` |

### What Stays Per-Rune

Per-rune CSS files retain only domain-specific styling that no other rune shares:

- **Recipe**: ingredient list (surfaced `ul` with disc markers), step counters (`counter-reset: recipe-step`), tip blockquotes
- **Playlist**: track list layout (flex rows with name/artist/duration), player area, narrow-screen column hiding
- **Realm/Faction**: section-specific typography or decorative elements
- **Hero/Feature/Step**: marketing-specific decorative treatments (gradient overlays, accent borders, etc.)

### Known Violations

| Rune | Duplicated lines | Pattern |
|------|-----------------|---------|
| Recipe | ~60 lines | Split grid placement, mobile collapse, content-first media hoist, full-bleed header, media container, box-shadow |
| Playlist | ~55 lines | Split grid placement, mobile collapse, media container, box-shadow (missing content-first hoist — should have it) |
| Realm, Faction | (to audit) | Likely same if they gain CSS |

---

## Scope of Changes

This spec covers runes in the following packages:

- `@refrakt-md/learning` (recipe, howto) — recipe is the reference implementation
- `@refrakt-md/storytelling` (character, realm, faction, lore, plot, beat, bond, storyboard)
- `@refrakt-md/media` (playlist, track, audio)

Other community packages should be audited against these standards separately.

### Applicability by Rune Tier

Not all standards apply equally to all runes. Runes fall into three structural tiers based on their output complexity:

#### Tier 1 — Full 3-section split layout (meta + content + media)

These runes extend `SplitLayoutModel`, have `mediaSlots`, and support split/split-reverse layouts. All seven standards apply. Standard 7 (shared split CSS) specifically targets this tier.

| Rune | Package | Follows recipe pattern? | Issues |
|------|---------|------------------------|--------|
| **Recipe** | learning | **Reference implementation** | — |
| **Hero** | core | Yes | — |
| **Feature** | core | Yes | — |
| **Step** | core | Yes | — |
| **Playlist** | media | No | Custom header (Std 2), missing modifiers (Std 3), duplicated CSS (Std 7) |
| **Realm** | storytelling | No | Non-standard sections (Std 2), duplicated transform (Std 4), duplicated CSS (Std 7) |
| **Faction** | storytelling | No | Missing mediaSlots (Std 3), duplicated transform (Std 4), duplicated CSS (Std 7) |

Hero, Feature, and Step in core already follow the standard. **Three runes need alignment: Playlist, Realm, and Faction.**

#### Tier 2 — Header + content wrapper, no media zone

These runes have the meta/preamble/content structure but no split layout or media zone. Standards 1–5 apply (BEM hygiene, preamble grouping, config alignment, shared helpers, single code path). Standards 6–7 do not apply since these runes don't use `SplitLayoutModel`.

| Rune | Package | Notes |
|------|---------|-------|
| **HowTo** | learning | Structurally similar to recipe minus media/split |
| **Blog** | core | Page section with preamble + body |
| **Character** | storytelling | Has portrait `mediaSlots` but no split layout; could graduate to Tier 1 |
| **Lore** | storytelling | Simple header + body |
| **Event** | places | Details header + content wrapper |
| **Api** | docs | Header + body wrapper |
| **Symbol** | docs | Header + preamble + body |
| **Organization** | business | Preamble + body sections |

Character is the most notable candidate for promotion to Tier 1 — it already has a portrait media slot. Adding `SplitLayoutModel` would let authors place the portrait beside the character bio in a split layout.

#### Tier 3 — Sections only, no content wrapper

These runes use `sections` for identity transform annotation but have simpler structures that don't need content wrappers or split layouts. Standard 1 (BEM hygiene) applies universally. Other standards apply only where relevant.

| Rune | Package |
|------|---------|
| Accordion, CallToAction, Pricing, Steps, Testimonial, Comparison | core |
| Changelog | docs |
| Typography, Spacing, DesignContext, Mockup | design |
| Plot, Beat, Bond, Storyboard | storytelling |
| Cast, Timeline | business |
| Itinerary | places |
| Audio | media |

### Summary

| Standard | Tier 1 (7 runes) | Tier 2 (8 runes) | Tier 3 (~18 runes) |
|----------|:-:|:-:|:-:|
| 1 — BEM modifier hygiene | Yes | Yes | Yes |
| 2 — Preamble inside content | Yes | Yes | — |
| 3 — Config matches schema | Yes | Yes | Yes |
| 4 — No duplicated transforms | Yes | Yes | Yes |
| 5 — Single code path | Yes | Yes | Yes |
| 6 — Shared layout meta utility | Yes | — | — |
| 7 — Shared split layout CSS | Yes | — | — |
| 8 — Theme-level shared classes | Yes | Yes | Some (timeline-connector) |

---

## Standard 8 — Theme-Level Shared Classes for Structural Grouping

When multiple runes share nearly identical CSS (same structural pattern, same layout, same styling), themes should be able to emit a shared class on those runes — reducing CSS duplication without coupling unrelated rune packages at the config level.

### Rule

- The `RuneConfig` interface should support an optional `sharedClasses?: string[]` field.
- The identity transform engine should prefix each entry with the theme prefix (e.g. `['entity-card']` → `.rf-entity-card`) and add them to the root element's class list.
- **Shared classes must be set by the theme layer** (via `mergeThemeConfig` overrides), not by rune package configs. Different themes may want to group runes differently — a storytelling-focused theme might share styles between realm/faction/character, while a minimal theme might not share at all.
- Shared class CSS files should live alongside the theme's per-rune CSS (e.g. `packages/lumina/styles/shared/entity-card.css`), not in the rune packages themselves.

### Rationale

Realm and faction currently have ~150 lines of near-identical CSS, differing only in the BEM prefix (`.rf-realm` vs `.rf-faction`). This duplication is a maintenance burden — every change must be made twice. CSS has no native mixin or `@extend` mechanism, and adding a preprocessor is an architectural decision beyond the scope of this spec.

The key insight is that **which runes share styles is a theme decision, not a rune decision**. A rune package defines structure (BEM block, sections, modifiers). A theme decides visual treatment. Two runes might look identical in Lumina but completely different in another theme. Therefore the grouping mechanism belongs in the theme layer.

### Engine Change

Minimal — two lines in `transformRune()`:

```ts
// After building the BEM class string
const sharedParts = (config.sharedClasses ?? []).map(c => `${prefix}-${c}`);
const bemClass = [block, ...sharedParts, ...modifierClasses, existingClass].filter(Boolean).join(' ');
```

### Theme Usage

Lumina would add shared class overrides via `mergeThemeConfig`:

```ts
export const luminaConfig = mergeThemeConfig(baseConfig, {
  runes: {
    Realm:   { sharedClasses: ['entity-card'] },
    Faction: { sharedClasses: ['entity-card'] },
  },
  // ...existing tints, icons
});
```

Then write shared CSS:

```css
/* packages/lumina/styles/shared/entity-card.css */
.rf-entity-card { /* ~150 lines of shared layout, typography, section styling */ }
.rf-entity-card__name { ... }
.rf-entity-card__scene { ... }
```

Per-rune CSS retains only truly unique overrides:

```css
/* realm.css — only realm-specific rules */
.rf-realm__lore-section { border-left: 2px solid var(--rf-color-accent); }

/* faction.css — only faction-specific rules */
.rf-faction__influence { font-variant-numeric: tabular-nums; }
```

### Interaction with Existing Config

- `sharedClasses` is additive — it does not replace the rune's own BEM block class.
- The shared class participates in `applyBemClasses` for element-level BEM (e.g. `.rf-entity-card__scene`) only if the shared class file defines those selectors. The engine emits the shared class on the root element only.
- CSS coverage tests should recognize shared classes as valid selectors for any rune that declares them.
- Contracts should include shared classes in the rune's class list.

### Candidates for Shared Classes in Lumina

| Shared Class | Runes | Shared Lines | Pattern |
|-------------|-------|-------------|---------|
| `entity-card` | Realm, Faction (potentially Character) | ~150 lines | Name header + badge, content sections, scene media zone, split/split-reverse layout with media spanning rows, mobile content-first collapse |
| `instructional-content` | Recipe, HowTo | ~35–40 lines | Surfaced list zone (background + border + disc markers + primary-colored `::marker`), step counters with circular number badges (`counter-reset`, flex row, centered circle), tip blockquotes (left border + surface background + radius) |
| `track-list-item` | Playlist, Track | ~40–50 lines | Flex-row layout with counter prefix (fixed-width, right-aligned), track name (flex: 1, ellipsis overflow), artist metadata (muted color, dot separator via `::before`), duration (tabular-nums, right-aligned, margin-left auto), hover states |
| `marketing-header` | Hero, CTA, Feature, Steps, Pricing, Bento | ~25 lines ×6 | Preamble container (flex column, gap), eyebrow (small caps, letter-spacing, primary color), eyebrow pill-badge variant (`:has(a)` — inline-block, border, radius-full, hover transition), headline, description |
| `timeline-connector` | Timeline, Itinerary, Plot (beats) | ~15–20 lines | Left border connector line (`border-left: 2px solid`), circular dot pseudo-element (`::before` — absolute positioned, primary background, bg-colored border, box-shadow ring), last-item border removal, left padding for content |

#### Notes on each candidate

**`entity-card`** — Realm and Faction CSS files are 95% identical (~157 lines each), differing only in BEM prefix. This is the clearest win. Character could join this group if it gains split layout support (it already has a portrait media slot).

**`instructional-content`** — Recipe and HowTo share the same "materials list + numbered steps + tips" visual pattern. The only differences are the counter name (`recipe-step` vs `howto-step`) and recipe's media zone (which is handled by split.css per Standard 7). Extracting the shared pattern would reduce each file's domain-specific CSS to just a few lines.

**`track-list-item`** — Playlist renders tracks as `<li>` inside `.rf-playlist__tracks`; Track renders each as a standalone `.rf-track` element. Despite different containers, the per-row styling (counter, name, artist, duration, meta dots) is identical. The shared class would target the row internals.

**`marketing-header`** — Six marketing runes duplicate the same eyebrow + preamble pattern with minor variations (eyebrow font-size ranges from 0.8rem to 0.875rem, preamble margin-bottom from 1.5rem to 2rem). A shared class could cover the common base with per-rune overrides for the size differences, or the sizes could be normalized. The pill-badge `:has(a)` variant (~10 lines) is identical across all six.

**`timeline-connector`** — Timeline and Itinerary share identical vertical-timeline dot + line CSS. Itinerary adds activity-type color variants (transport, food, sightseeing, etc.) and compact/horizontal layout options that stay per-rune. Plot beats use a similar but not identical pattern (status-colored dots). The shared class would cover the base connector; per-rune CSS handles color variants and layout modes.

---

## Non-Goals

- Changing the identity transform engine itself — these standards work within the existing engine.
- Mandating specific semantic HTML tags — runes choose `<article>`, `<section>`, `<div>` etc. based on their domain semantics.
- Prescribing visual design — themes decide appearance; this spec governs structure only.

{% /spec %}
