{% spec id="SPEC-054" status="accepted" tags="nav, layout, theme, runes, mega-menu" source="SPEC-046" %}

# Nav mega variant

Extend the `nav` rune with a `layout="mega"` value for richly-presented header dropdowns — multi-column groups, per-item descriptions, optional intro slot (featured hero / eyebrow), optional per-panel footer slot (changelog link / image / nested strip nav), and inline status badges. Also adds a `layout="strip"` value for compact secondary navigation rows (useful as a standalone primitive and as the natural occupant of a mega panel's footer slot). Reuses the existing `auto=true` frontmatter enrichment machinery from the cards layout.

## Problem

[SPEC-046](/plan/specs/SPEC-046) shipped `layout="menubar"` for header navigation: top-level items render flat, `## groups` become simple dropdowns containing a flat link list. That covers compact product navs (Refrakt's own site, small SaaS sites) but leaves the richer pattern unaddressed.

**Sites with broader product surface need more dropdown structure.** Linear, Vercel, Stripe, and Notion all use mega-style header dropdowns: each top-level item opens a wide panel with multiple columns, each item shows a short description, one or two entries get featured treatment with larger type or imagery, and a per-panel footer slot holds "what's new" / changelog / release links specific to that panel. A flat link list inside a dropdown doesn't scale — once a group has more than ~6 items or items need context, the menubar layout becomes hard to scan.

**Authors currently hand-roll this with raw markdown and per-site CSS.** No structure, no theme reuse, breaks the "one primitive, contextual rendering" principle. SPEC-046 explicitly listed mega-menus, per-item icons/badges, and embedded media as out of scope; this spec picks that thread up.

**Item descriptions are useful beyond mega.** Once descriptions are resolved from frontmatter (or supplied inline), the cards layout already uses them, and the columns layout (footer) could benefit too. The resolution path should be a shared cross-layout enrichment, not a mega-only concern.

**Status badges are a recurring nav need.** Status pills on individual items show up in every mega-menu pattern online. Currently no primitive exists; authors would inline raw HTML.

**Compact secondary nav rows are a recurring pattern too.** Vercel, Stripe docs, GitHub repo pages all have a persistent horizontal strip of links below the menubar. This is structurally the same as a flat menubar nav but visually smaller / secondary. Worth promoting to a first-class layout.

-----

## Design Principles

**Mega is `menubar` with richer panel content, not a different content model.** Same `## group` / list-item content shape SPEC-046 established. Top-level items (before the first `##`) still render as flat menubar links. Each `##` heading becomes a panel trigger automatically — heading text *is* the trigger label. No separate trigger declaration, no slug-matching routing.

**Per-panel slots are position-based, not type-based.** Within each `## group`, the content is split by `---` (hr) into segments. A segment containing only a list is a **column**. A segment containing anything else (paragraph, blockquote, image, nested rune) is a **content slot** whose role is determined by position: first content segment becomes the **intro**, last content segment becomes the **footer**. The theme styles intro / column / footer independently — a blockquote in the intro just gets styled as a featured hero by CSS, no special detection needed.

**Descriptions resolve uniformly across layouts.** The resolution rule — explicit paragraph wins, frontmatter `description` falls back, nothing otherwise — applies to `mega`, `cards`, and `columns`. Themes decide whether to *render* the description (mega and cards: yes by default; columns: opt-in).

**Markdown-native column breaks.** A horizontal rule (`---`) inside a group splits content into segments. The classification (column vs content) follows from what's *in* the segment, not from a separate attribute. CSS clamps the maximum column count for layout sanity.

**Badges are a new general-purpose inline rune.** `{% badge %}` belongs in a place broader than nav — it'll be reused in pricing tables, changelog entries, doc sidebars marking unstable APIs, etc. Defined as a core inline rune using the existing metadata-system dimensions ({% ref "SPEC-024" /%}).

**`layout="strip"` is a first-class sibling layout.** Useful in two distinct places: (a) standalone, as a persistent secondary nav below the menubar (Vercel / Stripe docs pattern); (b) nested inside a mega panel's footer slot for per-panel secondary links. Same primitive in both contexts; the parent context decides positioning.

-----

## Authoring Surface

### Mega header dropdown — fully auto

Most ergonomic case. Headings become panel triggers automatically; item descriptions / icons resolve from each linked page's frontmatter.

```markdoc
{% nav layout="mega" auto=true %}
- [GitHub](https://github.com/refrakt-md/refrakt)
- [Discord](https://discord.gg/refrakt)

## Docs

- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)
- [Authoring](/docs/authoring/authoring-overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)

## Runes

- [Rune catalog](/runes/rune-catalog)
- [Plugin authoring](/docs/plugins/authoring)

---

- [Marketing](/runes/marketing)
- [Storytelling](/runes/storytelling)
{% /nav %}
```

Behaviour:
- Top-level items (`GitHub`, `Discord`) render as flat menubar links — no panel, no dropdown. Same as today's `menubar` layout.
- Each `## group` (`Docs`, `Runes`) becomes a panel trigger. Trigger text = heading text.
- Each panel's items are split into columns by `---`.
- Each item shows title + description (frontmatter `description`) + icon (frontmatter `icon`).

### Per-panel intro and footer slots

Position-based: a `---`-separated segment that contains anything other than a list is a **content slot**.

```markdoc
{% nav layout="mega" auto=true %}

## Docs

> [Refrakt for teams](/teams)
> The collaborative authoring environment for documentation at scale.

- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)

---

[See all changes →](/releases)

## Runes
For teams shipping documentation

- [Rune catalog](/runes/rune-catalog)
- [Plugin authoring](/docs/plugins/authoring)

---

- [Marketing](/runes/marketing)
- [Storytelling](/runes/storytelling)

---

{% nav layout="strip" %}
- [Browse all](/runes/rune-catalog)
- [Authoring guide](/docs/plugins/authoring)
{% /nav %}

## Themes

- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)
- [Tideline](/themes/tideline)

---

![Themes preview](/themes/preview.png)

Built-in dark mode, accessibility-tested, designed for documentation.
{% /nav %}
```

Per-panel breakdown:

| Panel  | Intro slot                | Columns                   | Footer slot                  |
|--------|---------------------------|---------------------------|------------------------------|
| Docs   | Blockquote (featured hero) | 2 columns of items        | Paragraph with "See all" link |
| Runes  | Paragraph (eyebrow)        | 2 columns with badges     | Nested `{% nav layout="strip" %}` |
| Themes | (none)                     | 1 column of items         | Image + paragraph             |

The theme styles the intro/footer slots — a blockquote in the intro automatically gets featured-hero treatment via CSS; a nested strip nav in the footer gets compact-row treatment; an image gets sized to fit.

### Per-item descriptions and badges

When `auto=true` isn't enough (item copy differs from frontmatter, or items don't correspond to pages), descriptions can be authored inline as paragraphs and badges added via `{% badge %}`.

```markdoc
{% nav layout="mega" %}

## Product

- [Plan](/plan)

  Track work, specs, and decisions alongside your docs.

- [Build](/build)

  Author content in plain markdown with rich rune semantics.

- [Insights](/insights) {% badge sentiment="caution" %}Beta{% /badge %}

  Understand how readers move through your site.

---

- [Security](/security) {% badge sentiment="positive" %}New{% /badge %}

  SOC 2 Type II, SSO, and audit logs.

- [Integrations](/integrations)

  Connect to GitHub, Linear, and 30+ tools.
{% /nav %}
```

Patterns:
- **Paragraph after a list item** = manual description override (takes precedence over any frontmatter fallback).
- **`{% badge sentiment="…" %}…{% /badge %}`** inline = status pill, styled via the metadata system ({% ref "SPEC-024" /%}).

### Resolution rules

| Item shape                                            | Title source              | Description source                  |
|-------------------------------------------------------|---------------------------|-------------------------------------|
| Plain slug (`plan`)                                   | Frontmatter `title`       | Frontmatter `description`           |
| Explicit link, no paragraph (`[Plan](/plan)`)         | Link text                 | Frontmatter `description` (if page) |
| Explicit link with paragraph                          | Link text                 | The paragraph                       |
| Slug with paragraph                                   | Frontmatter `title`       | The paragraph (overrides frontmatter) |
| Any item, badge appended (`item {% badge %}…{% /badge %}`) | (unchanged)         | (unchanged) — badge attaches to title |

### `layout="strip"` — compact secondary nav

A flat row of compact links — no groups, no panels, no top-level items. Useful as a persistent secondary nav below the menubar, or nested inside a mega panel's footer slot.

```markdoc
{# Standalone — below the menubar #}
{% nav layout="strip" %}
- [Changelog](/releases)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [What's new](/blog)
- [Status](https://status.refrakt.md)
{% /nav %}
```

The strip layout rejects `## groups` (warns if present) — it's flat by design. Behaviour is otherwise the standard nav (slug resolution, active state, frontmatter enrichment).

-----

## Engine Config Changes

Extension to the `Nav` entry in `packages/runes/src/config.ts`:

```ts
Nav: {
  // ...existing
  modifiers: {
    layout: {
      source: 'attr',
      default: 'vertical',
      // adds 'mega' and 'strip' as values alongside vertical | menubar | columns | cards
    },
    // ...existing
  },
}
```

Produces additional selectors:

- `.rf-nav--mega` (layout modifier) + `data-layout="mega"`
- `.rf-nav--strip` (layout modifier) + `data-layout="strip"`
- `.rf-nav-group__intro` (new, first content segment in a group)
- `.rf-nav-group__columns` (new container introduced when at least one column exists)
- `.rf-nav-group__column` (new, one per column-classified segment)
- `.rf-nav-group__footer` (new, last content segment in a group)
- `.rf-nav-item__description` (new, paragraph child or resolved frontmatter)

Per-group structure detection (during `headingsToList` / `buildGroups` in `packages/runes/src/tags/nav.ts`):

1. Within each `## group`'s content, split children at each `<hr>` into segments.
2. Classify each segment:
   - Contains only `<ul>` / `<ol>` (with whitespace) → **column**
   - Anything else (paragraph, blockquote, image, nested tag, etc.) → **content**
3. The first content segment (if any) → `data-name="intro"` slot.
4. The last content segment (if any) → `data-name="footer"` slot.
5. All other segments (columns plus any middle content segments) render in source order under `data-name="columns"`.

A panel with only column segments renders without intro / footer slots (clean simple panel). A panel with a single content segment and no columns → that segment becomes the intro (it appears at the top of an empty panel).

`NavItem` postTransform extends to:
1. Detect a paragraph sibling immediately following the item in the source list; consume it and attach as `description` property.
2. Detect `{% badge %}` runes inside the item's link text or trailing position; consume them and attach as `badge` property (meta tag).
3. When `auto=true` and the item resolves to a registry page, attach `icon` + `description` from frontmatter as fallback properties (already implemented for cards; reuse).

-----

## Badge rune (new)

Defined in `packages/runes/src/tags/badge.ts`. Inline rune. Belongs in core, not the nav schema — use cases extend well beyond nav (commerce: "Popular" / "Sale" / "Pro only"; content: "Featured" / "Sponsored" / "Members only"; status: "Active" / "Archived"; identity: "Verified" / "Staff"; recency: "Updated"; difficulty: "Beginner" / "Advanced"; arbitrary categorical tagging).

The badge label is **children content**, not an attribute — free-form text, naturally localised, no hard-coded English in core. Visual variant comes from the universal metadata dimensions defined by {% ref "SPEC-024" /%} and {% ref "SPEC-025" /%} (`data-meta-sentiment`, `data-meta-rank`, `data-meta-type`), which means themes already style every sentiment/rank combination via the rules in `packages/lumina/styles/dimensions/metadata.css` — the badge rune gets cross-theme coverage for free.

### Authoring surface

```markdoc
{% badge %}Frontend{% /badge %}
{% badge sentiment="positive" %}New{% /badge %}
{% badge sentiment="caution" %}Beta{% /badge %}
{% badge sentiment="negative" %}Deprecated{% /badge %}
{% badge sentiment="positive" rank="primary" %}Popular{% /badge %}
{% badge type="status" sentiment="positive" %}Active{% /badge %}
```

### Attributes

| Attribute    | Values                                                              | Default | Maps to                  |
|--------------|---------------------------------------------------------------------|---------|--------------------------|
| `sentiment`  | `positive` \| `negative` \| `caution` \| `neutral`                  | `neutral` | `data-meta-sentiment`  |
| `rank`       | `primary` \| `secondary`                                            | (none)  | `data-meta-rank`         |
| `type`       | `status` \| `category` \| `quantity` \| `temporal` \| `tag` \| `id` | `tag`   | `data-meta-type`         |

(All three attribute value sets match the existing metadata-system dimensions exactly — no new enums introduced.)

### Identity transform output

```html
<span class="rf-badge" data-meta-sentiment="positive" data-meta-rank="primary" data-meta-type="tag">Popular</span>
```

The base `.rf-badge` provides the pill shape (inline-flex, small padding, rounded full, small font). All colour / weight / emphasis comes from the existing universal metadata CSS rules — no per-variant BEM classes are emitted.

### Migration of the "dev lifecycle" cases

The previously-proposed `type="new" | "beta" | "soon" | "deprecated"` values become docs recipes rather than built-in types:

```markdoc
New feature:        {% badge sentiment="positive" %}New{% /badge %}
Pre-release:        {% badge sentiment="caution" %}Beta{% /badge %}
Coming soon:        {% badge sentiment="neutral" %}Soon{% /badge %}
Deprecated API:     {% badge sentiment="negative" %}Deprecated{% /badge %}
```

Authors pick the sentiment that matches their intent; the label text is up to them (and naturally localised).

-----

## Description Resolution

Implemented in the existing `auto=true` postProcess hook (`packages/runes/src/config.ts`, where `resolveCardsNavs` lives). Resolution rules at postProcess time:

1. If the item has an inline description child (paragraph following the link in the source list), use it. Stop.
2. If the item resolves to a registry page and that page's frontmatter has `description`, use it. Stop.
3. Otherwise, no description. Item renders title-only.

`icon` follows the same shape: inline `{% icon %}` rune in the link text overrides frontmatter `icon`, which overrides nothing.

The cards layout already implements step 2 for the title and description. This spec generalises: the same resolution applies whenever `auto=true` is set, regardless of layout. Mega, cards, and columns all benefit. Vertical and menubar render descriptions only if a theme opts in via CSS (the data is present on the DOM either way).

-----

## Mobile Strategy

Out of scope for the rune itself; theme + behaviors concern. The contract the rune offers themes:

- `.rf-nav--mega` plus `data-layout="mega"` on the nav.
- All structural slots above (`__top-level`, `__intro`, `__columns`, `__column`, `__footer`, `__description`) are present in the DOM whether mobile or desktop.
- Lumina ships a reference mobile collapse: at narrow viewports, mega behaves like a vertical accordion — each top-level trigger toggles its panel open, columns stack to a single column, intro and footer slots stay in their relative positions.

The existing `nav-menubar` behaviour (SPEC-046) extends to handle mega trigger open/close; no new behaviour module needed beyond a CSS-only column → stack reflow.

-----

## Acceptance Criteria

- [ ] `nav` rune `layout` attribute accepts `mega` and `strip` in addition to existing values (`vertical`, `menubar`, `columns`, `cards`)
- [ ] Identity transform emits `.rf-nav--mega` / `.rf-nav--strip` modifier classes and corresponding `data-layout` values
- [ ] Mega layout: top-level items (before the first `##`) render as flat menubar links in the existing `data-name="top-level"` container — same as SPEC-046's menubar
- [ ] Mega layout: each `## group`'s heading becomes a panel trigger automatically; trigger text is the heading text (no slug-matching routing)
- [ ] Within a `## group`, `---`-separated segments are classified: segments containing only a list become **columns**; segments containing anything else become **content slots**
- [ ] First content segment in a group renders into `data-name="intro"` (`.rf-nav-group__intro`)
- [ ] Last content segment in a group renders into `data-name="footer"` (`.rf-nav-group__footer`)
- [ ] All column segments render in source order inside `data-name="columns"` (`.rf-nav-group__columns`), each in its own `.rf-nav-group__column`
- [ ] A group with only column segments emits no intro / footer slots — clean simple panel
- [ ] A group with a single content segment and no columns places that segment in the intro slot
- [ ] A paragraph immediately following a list item in the source becomes that item's `.rf-nav-item__description`
- [ ] When `auto=true`, items without an explicit description inherit `description` from the linked page's frontmatter (extends existing cards-layout enrichment)
- [ ] When `auto=true`, items without an explicit icon inherit `icon` from the linked page's frontmatter (reuses cards-layout enrichment)
- [ ] New `{% badge %}` core inline rune takes its label as children content and accepts attributes `sentiment` (`positive` | `negative` | `caution` | `neutral`, default `neutral`), `rank` (`primary` | `secondary`, optional), and `type` (`status` | `category` | `quantity` | `temporal` | `tag` | `id`, default `tag`) — all three mirroring the metadata-system dimensions from {% ref "SPEC-024" /%}
- [ ] Badge identity transform emits `<span class="rf-badge" data-meta-sentiment="…" data-meta-rank="…" data-meta-type="…">…</span>` — no per-variant BEM modifiers; visual styling inherits from the existing universal metadata CSS
- [ ] A `{% badge %}` inside a nav item link is recognised by the engine and attached as a `badge` property on the item (rendered adjacent to the title)
- [ ] `layout="strip"` renders as a flat row of items; rejects `## groups` (warns if present); supports the standard nav features (slug resolution, active state, frontmatter enrichment)
- [ ] Existing `menubar`, `vertical`, `columns`, `cards` layouts render identically to today — no behaviour change for callers not on the `mega` / `strip` layouts
- [ ] Description resolution rule applies uniformly to any `auto=true` nav regardless of layout (data attached; theme decides rendering)
- [ ] Lumina ships CSS for `.rf-nav--mega` including: column grid (clamped to max 3 cols), intro slot styling (blockquote → featured hero, paragraph → eyebrow), footer slot styling, mobile stacked fallback
- [ ] Lumina ships CSS for `.rf-nav--strip` (compact horizontal row, smaller text, muted base styling)
- [ ] Lumina ships CSS for `.rf-badge` covering all sentiment / rank combinations (inherits from existing metadata-system rules)
- [ ] `@refrakt-md/behaviors` `nav-menubar` behaviour handles mega trigger open/close (extends existing behaviour; no new module)
- [ ] `npx refrakt inspect nav --layout=mega` shows expected HTML output with all new slots populated for a representative input
- [ ] `npx refrakt inspect nav --layout=strip` shows expected HTML output
- [ ] `npx refrakt inspect badge` shows expected HTML output for various sentiment / rank / type combinations
- [ ] CSS coverage tests updated for `.rf-nav--mega`, `.rf-nav--strip`, `.rf-nav-group__intro`, `.rf-nav-group__columns`, `.rf-nav-group__column`, `.rf-nav-group__footer`, `.rf-nav-item__description`, and `.rf-badge`
- [ ] Authoring docs (`site/content/docs/authoring/`) updated with a Mega menu authoring guide covering the position-based slot rule, all sketch patterns, and the strip layout
- [ ] Rune reference page for `nav` updated with `layout="mega"` and `layout="strip"` sections
- [ ] New rune reference page for `badge`
- [ ] At least one site page demonstrates the mega layout (likely `site/content/_layout.md` header region)

-----

## Out of Scope

- **Embedded media in mega panels beyond `![image]`**. Plain Markdown images work in intro / footer slots (covered above). Video, animated demos, embedded iframes, etc. — deferred until a real use case appears.
- **Nested groups** (mega panels with sub-groups inside a column). Single-level groups with column splits cover the realistic patterns; deeper nesting is YAGNI.
- **Aggregated/auto-populated panel footers** (e.g. last 3 changelog entries auto-pulled into a panel's footer slot). Footer content is hand-authored in v1. A future `{% nav-recent collection="…" %}` primitive could populate it.
- **A separate `colophon` rune for copyright / social rows.** Already deferred from SPEC-046; remains deferred.
- **Replacing the marketing plugin's `bento` or `feature` runes.** Different use cases — mega is for navigation; bento/feature are for landing-page content.
- **Animating panel transitions.** CSS-only fade or theme-defined; no schema involvement.
- **Strip layout with groups**. `layout="strip"` is flat by design — if you need grouped strip content, use `layout="columns"` (footer columns) or a vertical nav. Strip rejects (warns on) `## groups`.

-----

## Open Questions

**Are descriptions a property or a child?** Modeled above as a property attached during postProcess (meta tag → property). Alternative: keep the description paragraph as a child of `nav-item`, let the engine wrap it with a class. Property is cleaner for the auto-enrichment path; child is closer to source. Lean property.

**Description paragraph delimiter.** Markdown parsers vary on whether a paragraph under a list item belongs to the item (indented continuation) or breaks out. Need to confirm Markdoc's behaviour and possibly require a specific indent. Worth a spike before committing.

**Middle content segments**. The position-based rule classifies first content segment as intro and last as footer. What about middle content segments (a group with intro + column + paragraph + column + footer)? Recommend: render them in source order as part of the columns container — they're unusual but not errors, and the theme can style "non-column children of `__columns`" however it wants. Worth a real authoring example before locking in.

**Should `mega` imply `auto=true`?** Nearly every realistic mega menu uses page-resolved descriptions. Defaulting `auto=true` when `layout="mega"` reduces ceremony but adds magic. Recommend leaving them independent — explicit is better.

**Should `strip` items default to a smaller font / muted treatment, or rely entirely on `.rf-nav--strip` CSS?** Recommend rely on CSS — keeps the data layer identical to other layouts.

{% /spec %}
