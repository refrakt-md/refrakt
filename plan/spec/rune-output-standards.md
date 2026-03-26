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

### Prerequisite

Standard 2 (preamble inside content) must be applied first. If a rune emits its header/title as a direct child of the article instead of inside the content wrapper, it produces 4 direct children instead of 3, breaking the grid placement. Once all runes follow the standard structure, the CSS converges naturally.

### Patterns to Migrate to Shared Layer

| Pattern | Current location | Target |
|---------|-----------------|--------|
| Split grid explicit column/row placement | `recipe.css:128–156`, `playlist.css:141–167` | `split.css` |
| Mobile collapse (reset grid-column/row) | `recipe.css:172–182`, `playlist.css:169–183` | `split.css` |
| Split media box-shadow | `recipe.css:158–161`, `playlist.css:186–189` | `split.css` or `media.css` |
| Media zone container (border-radius, overflow, img block sizing) | `recipe.css:104–113`, `playlist.css:119–130` | `media.css` |
| Mobile full-bleed card header (negative margin bleed) | `recipe.css:184–199` | `split.css` |

### What Stays Per-Rune

Per-rune CSS files retain only domain-specific styling that no other rune shares:

- **Recipe**: ingredient list (surfaced `ul` with disc markers), step counters (`counter-reset: recipe-step`), tip blockquotes
- **Playlist**: track list layout (flex rows with name/artist/duration), player area, narrow-screen column hiding
- **Realm/Faction**: section-specific typography or decorative elements

### Known Violations

| Rune | Duplicated lines | Pattern |
|------|-----------------|---------|
| Recipe | ~60 lines | Split grid placement, mobile collapse, media container, box-shadow |
| Playlist | ~55 lines | Same patterns, different BEM prefix |
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

---

## Non-Goals

- Changing the identity transform engine itself — these standards work within the existing engine.
- Mandating specific semantic HTML tags — runes choose `<article>`, `<section>`, `<div>` etc. based on their domain semantics.
- Prescribing visual design — themes decide appearance; this spec governs structure only.

{% /spec %}
