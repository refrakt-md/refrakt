{% spec id="SPEC-054" status="accepted" tags="nav, layout, theme, runes, menubar, columns, strip" source="SPEC-046" %}

# Nav: richer dropdowns and column flow

Evolve the existing `nav` layouts so authors can compose Linear- / Vercel- / Stripe-style header dropdowns out of the primitives they already know. Three coordinated changes: (1) `layout="menubar"` accepts arbitrary block content inside `## groups` — including nested navs, paragraphs, blockquotes, and images — with a position-based slot rule (first content block = intro, last = footer); (2) `layout="columns"` gains a `---`-between-sections column-break rule and a headingless mode, so it can serve both as a footer-columns nav and as the inner content of a menubar panel; (3) a new `layout="strip"` for compact secondary link rows, useful both standalone (persistent sub-nav) and nested inside a panel footer slot. Plus a new core `{% badge %}` inline rune and a generalisation of `auto=true` description/icon enrichment to every layout.

## Problem

[SPEC-046](/plan/specs/SPEC-046) shipped `layout="menubar"` for header navigation: `## groups` become simple flat-list dropdowns. That covers compact product navs (Refrakt's own site, small SaaS sites) but breaks down once sites grow.

**Sites with broader product surface need rich dropdown content.** Linear, Vercel, Stripe, and Notion all use header dropdowns that contain multiple columns of links, per-item descriptions, featured hero cards, and footer link rows specific to each panel. A flat list of items in a `## group` doesn't scale — once a group has more than ~6 items or items need context, the panel becomes hard to scan.

**Authors currently hand-roll this with raw markdown and per-site CSS.** No structure, no theme reuse, breaks refrakt's "primitives composable in context" principle. SPEC-046 listed mega-menus, per-item icons/badges, and embedded media as out of scope; this spec picks that thread up — but rather than introducing a separate `layout="mega"`, we let menubar evolve to accept the richer content already expressible with existing primitives.

**Item descriptions are useful beyond mega.** Once descriptions are resolved from frontmatter (or supplied inline), the cards layout already uses them, and the columns layout could benefit too. The resolution path should be a shared cross-layout enrichment, not a per-layout concern.

**Footer columns need a way to stack multiple sections in one column.** Real-world footer designs frequently group several `## Section` blocks vertically within a single visual column (Product / Resources / Community in column 1; Status / Legal in column 2; etc.). The current `columns` layout — one `##` per column — can't express this.

**Status badges are a recurring nav need.** "New", "Beta", "Popular" pills on individual items show up in every mega-menu pattern online. Currently no primitive exists; authors would inline raw HTML.

**Compact secondary nav rows are a recurring pattern too.** Vercel, Stripe docs, GitHub repo pages all have a persistent horizontal strip of links below the menubar. This is structurally the same as a flat menubar but visually smaller / muted. Worth promoting to a first-class layout.

-----

## Design Principles

**Composition over invention.** Rather than introducing a `layout="mega"` that bundles multi-column content + intro/footer slots into one new layout, we extend the existing primitives. A "mega menu" becomes `menubar` with a nested `columns` nav (and optional intro/footer content) — the author composes the pattern from primitives they already know. The same composition gives Linear-style flat-panel megas, Vercel-style structured megas, and everything in between.

**Position-based slot rule for menubar group content.** Inside a `## group` in a menubar nav, the children are interpreted by position: the first non-list content block becomes the **intro** slot (`.rf-nav-group__intro`), the last non-list content block becomes the **footer** slot (`.rf-nav-group__footer`), everything else (flat lists, nested navs) renders between them as the panel's main body. The theme styles intro / footer slots; a blockquote in the intro just gets styled as a featured hero by CSS, an image gets sized to fit, a nested strip nav becomes a compact link row.

**`---` is always a column boundary, scoped to the layout.** In `columns`, `---` between `##` sections splits the section flow into columns (one column can contain several stacked sections). In a headingless `columns` nav, `---` between flat items splits them into columns. Same rule, layout-appropriate scope.

**Mobile collapse emerges from nav structure, not configuration.** A menubar that contains flat lists collapses to a Linear-style flat mobile list. A menubar that contains nested `columns collapsible=true` with sub-headings collapses to a Vercel-style structured-accordion mobile pattern. The author chooses the mobile pattern by choosing how to structure the panel — no `mobileCollapse` attribute needed.

**Descriptions resolve uniformly across layouts.** Explicit paragraph wins, frontmatter `description` falls back, nothing otherwise. Applies to `menubar` items, `columns` items, `strip` items, and `cards` items. Themes decide whether to *render* the description (menubar panels and cards: yes; strip: no by default; vertical: opt-in).

**Badges are a general-purpose inline rune.** `{% badge %}` belongs in core. Uses the existing metadata-system dimensions ({% ref "SPEC-024" /%}) for visual variants — `sentiment`, `rank`, `type` — so themes already style every combination via the universal metadata CSS.

**`layout="strip"` is a first-class sibling.** Compact horizontal row of items, no groups. Useful in two contexts: (a) standalone as a persistent secondary nav below the menubar (Vercel / Stripe docs pattern); (b) nested inside a menubar panel's footer slot for per-panel secondary links (Linear pattern). Same primitive in both contexts; the parent context decides positioning and spacing.

-----

## Authoring Surface

### Today's simple menubar — unchanged

A flat dropdown with a list of items per group. This continues to work exactly as in SPEC-046.

```markdoc
{% nav layout="menubar" %}
- [Docs](/docs/getting-started)
- [Blog](/blog)

## Product
- pricing
- features

## Resources
- about
- changelog
{% /nav %}
```

### Richer panel content: nested navs, intro slot, footer slot

A menubar group can now contain *anything* — paragraphs, blockquotes, nested navs, images. The first non-list content block becomes the panel's intro; the last becomes the footer; everything between renders as the panel's main body.

```markdoc
{% nav layout="menubar" auto=true %}
- [GitHub](https://github.com/refrakt-md/refrakt)

## Docs

> [Refrakt for teams](/teams)
> The collaborative authoring environment for documentation at scale.

{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)
- [Authoring](/docs/authoring/authoring-overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)
{% /nav %}

[See all changes →](/releases)

## Resources
For teams shipping documentation

{% nav layout="columns" %}
- [Rune catalog](/runes/rune-catalog)
- [Plugin authoring](/docs/plugins/authoring)

---

- [Marketing](/runes/marketing) {% badge sentiment="positive" %}Popular{% /badge %}
- [Storytelling](/runes/storytelling)
{% /nav %}

{% nav layout="strip" %}
- [Browse all](/runes/rune-catalog)
- [Authoring guide](/docs/plugins/authoring)
{% /nav %}

## Themes

{% nav layout="columns" %}
- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)
- [Tideline](/themes/tideline)
{% /nav %}

![Themes preview](/themes/preview.png)

Built-in dark mode, accessibility-tested, designed for documentation.
{% /nav %}
```

Per-panel breakdown:

| Panel  | Intro slot               | Body (between)                | Footer slot              |
|--------|--------------------------|-------------------------------|--------------------------|
| Docs   | Blockquote (featured hero) | 2-column nested nav         | Paragraph with "See all" link |
| Resources | Paragraph (eyebrow)    | 2-column nested nav (with a badge) | Nested `layout="strip"` |
| Themes | (none)                   | 1-column nested nav           | Image + paragraph        |

The theme styles each slot: a blockquote in the intro automatically gets featured-hero treatment via CSS; a nested strip nav in the footer gets compact-row treatment; an image gets sized to fit. The engine emits the same `.rf-nav-group__intro` / `.rf-nav-group__footer` containers; the theme decides what to do based on the content inside.

### Per-item descriptions and badges

Inside any nav layout, an item can carry a description (paragraph after the item) and inline badges (`{% badge %}` runes in or after the link text). Resolution: explicit paragraph beats frontmatter; frontmatter `description` is the fallback.

```markdoc
{% nav layout="menubar" %}

## Product

{% nav layout="columns" %}
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
{% /nav %}
```

### `layout="columns"` — new column-break rule and headingless mode

The columns layout grows two structural rules:

**Multi-section columns** — between `##` sections, `---` opens a new column. Each column contains one or more stacked sections.

```markdoc
{# Footer region — three columns, each with two sections #}
{% nav layout="columns" %}

## Product
- features
- pricing

## Resources
- docs
- blog

---

## Community
- forums
- discord

## Status
- status-page

---

## Legal
- privacy
- terms

## Compliance
- gdpr
{% /nav %}
```

**Headingless columns** — when a columns nav has no `##` sections at all, `---` between flat items splits the items into columns. This is the form used inside a menubar panel.

```markdoc
{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

---

- [Themes](/docs/themes/overview)
- [Adapters](/docs/adapters/adapters-overview)
{% /nav %}
```

Backwards compatible: footer columns with no `---` still gets one column per `##` section (today's behaviour). The `---` is opt-in.

### `layout="strip"` — compact secondary nav

Flat row of items, no groups, no panels, no top-level container. Useful standalone (below a menubar) or nested inside a panel footer slot.

```markdoc
{# Standalone — below the menubar #}
{% nav layout="strip" %}
- [Changelog](/releases)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [Status](https://status.refrakt.md)
{% /nav %}
```

The strip layout rejects `##` headings (warns if present) — it's flat by design. Items support standard slug resolution, active state, frontmatter enrichment, and badges.

### Mobile collapse — Linear vs Vercel patterns from structure

The same authoring patterns produce different mobile collapse behaviour, picked by the author when they structure the nav.

**Linear-style** — flat, headingless columns nav inside the panel. On mobile, the menubar opens to a flat scroll of grouped items.

```markdoc
{% nav layout="menubar" %}
## Docs
{% nav layout="columns" %}
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)
{% /nav %}
{% /nav %}
```

**Vercel-style** — columns nav with `##` sub-sections and `collapsible=true`. On mobile, each sub-section becomes an accordion that expands / collapses.

```markdoc
{% nav layout="menubar" %}
## Docs
{% nav layout="columns" collapsible=true %}
## Documentation
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)

## Reference
- [API](/docs/api)
- [CLI](/docs/cli/cli-overview)
{% /nav %}
{% /nav %}
```

Both patterns work without any layout-level `mobileCollapse` attribute — the structure dictates the behaviour. Lumina ships reference CSS that does the right thing for each.

### Resolution rules (any layout, `auto=true`)

| Item shape                                            | Title source              | Description source                  |
|-------------------------------------------------------|---------------------------|-------------------------------------|
| Plain slug (`plan`)                                   | Frontmatter `title`       | Frontmatter `description`           |
| Explicit link, no paragraph (`[Plan](/plan)`)         | Link text                 | Frontmatter `description` (if page) |
| Explicit link with paragraph                          | Link text                 | The paragraph                       |
| Slug with paragraph                                   | Frontmatter `title`       | The paragraph (overrides frontmatter) |
| Any item, badge appended (`item {% badge %}…{% /badge %}`) | (unchanged)         | (unchanged) — badge attaches to title |

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
      // adds 'strip' as a value alongside vertical | menubar | columns | cards
    },
    // ...existing
  },
}
```

(Note: `mega` is **not** added as a layout value — the menubar layout absorbs that responsibility.)

Produces additional selectors:

- `.rf-nav--strip` (layout modifier) + `data-layout="strip"`
- `.rf-nav-group__intro` (first content block inside a menubar `## group`)
- `.rf-nav-group__footer` (last content block inside a menubar `## group`)
- `.rf-nav-group__column` (one per column in a columns layout)
- `.rf-nav-item__description` (paragraph child or resolved frontmatter on any nav item)

**Menubar group content detection** (in `packages/runes/src/tags/nav.ts`):

For each `## group` inside a menubar nav, walk children in source order:

1. Collect children into a flat sequence.
2. Identify content blocks (anything other than `<ul>` / `<ol>`): paragraphs, blockquotes, images, nested `{% nav %}` runes, nested arbitrary block runes.
3. First content block → `intro` property on the group (renders into `data-name="intro"`).
4. Last content block → `footer` property on the group (renders into `data-name="footer"`).
5. Lists and any middle content blocks render in source order as the panel's main body.

A group with no content blocks (just a flat list, today's pattern) emits no intro / footer slots — clean simple panel.

A group with a single content block and no lists places that block in the intro slot.

**Columns layout column-break detection** (in `packages/runes/src/tags/nav.ts`):

1. Walk children at the top level (the group / list flow).
2. Split at each `<hr>` (`---`) into segments.
3. Each segment becomes one column (`.rf-nav-group__column`).
4. Within a column, children render in source order — typically a stack of `## sections`, but a headingless nav has just a flat list.

If a columns nav has no `<hr>`s and no `##` sections, all items render in a single column (degenerate but valid). If it has `##` sections but no `<hr>`s, each `##` becomes its own column (today's footer behaviour).

**Strip layout** (in `packages/runes/src/tags/nav.ts`):

A trivial branch in the nav transform. Skips `buildGroups` entirely. If the source contains any `##` heading, `ctx.warn` and degrade gracefully (treat headings as plain text). Produces a flat `<ul>` of items, no top-level container, no groups.

**`NavItem` postTransform extends to:**

1. Detect a paragraph sibling immediately following the item; consume it and attach as `description` property.
2. Detect `{% badge %}` runes inside the item's link text or trailing position; consume them and attach as `badge` property.
3. When `auto=true` and the item resolves to a registry page, attach `icon` + `description` from frontmatter as fallback properties (extends the existing cards-layout enrichment).

-----

## Badge rune (new)

Defined in `packages/runes/src/tags/badge.ts`. Inline rune. Belongs in core, not the nav schema — use cases extend well beyond nav (commerce: "Popular" / "Sale" / "Pro only"; content: "Featured" / "Sponsored" / "Members only"; status: "Active" / "Archived"; identity: "Verified" / "Staff"; recency: "Updated"; difficulty: "Beginner" / "Advanced"; arbitrary categorical tagging).

The badge label is **children content**, not an attribute — free-form text, naturally localised, no hard-coded English in core. Visual variant comes from the universal metadata dimensions defined by {% ref "SPEC-024" /%} and {% ref "SPEC-025" /%} (`data-meta-sentiment`, `data-meta-rank`, `data-meta-type`), which means themes already style every sentiment/rank combination via the rules in `packages/lumina/styles/dimensions/metadata.css`.

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

-----

## Description Resolution

Implemented in the existing `auto=true` postProcess hook (`packages/runes/src/config.ts`, where `resolveCardsNavs` lives). Resolution rules at postProcess time:

1. If the item has an inline description child (paragraph following the link in the source list), use it. Stop.
2. If the item resolves to a registry page and that page's frontmatter has `description`, use it. Stop.
3. Otherwise, no description. Item renders title-only.

`icon` follows the same shape: inline `{% icon %}` rune in the link text overrides frontmatter `icon`, which overrides nothing.

The cards layout already implements step 2 for title + description. This spec generalises: the same resolution applies whenever `auto=true` is set, regardless of layout. Menubar, columns, strip, cards, vertical — all benefit. Themes decide whether to *render* the description (the data is present on the DOM either way).

-----

## Mobile Strategy

The mobile collapse pattern emerges from how the author structured the nav — no per-layout `mobileCollapse` attribute, no theme configuration.

**Menubar (below breakpoint)**:

- Hamburger button toggles the whole nav drawer open
- Top-level items render as flat links at the top of the drawer
- Each `## group` becomes a tappable accordion section in the drawer
- Tap a heading → that section's panel content stacks vertically inside the drawer:
  - Intro slot (if any) renders at the top
  - Nested navs render with their own layout's mobile behaviour
  - Footer slot (if any) renders at the bottom

**Nested `columns` inside an open menubar panel**:

- Headingless mode (Linear-style): items stack into a single column inside the panel
- Headed mode without `collapsible`: each `##` section renders stacked, each with its heading visible above its items
- Headed mode with `collapsible=true` (Vercel-style): each `##` section becomes an accordion toggle inside the open menubar panel

**`columns` standalone** (footer use): columns stack vertically below the breakpoint. Within a column, sections render in source order.

**`strip` standalone**: wraps onto multiple lines or scrolls horizontally on narrow viewports — theme choice.

**Auto-open the current section**: when the menubar drawer opens on mobile, automatically expand the accordion section whose nav items resolve to URLs that match (or are prefixes of) the current page. Mirrors the existing `collapsible` vertical-layout behaviour. Same for nested `collapsible` columns navs.

The existing `nav-menubar` behaviour module (SPEC-046) handles the menubar drawer + accordion toggles. The existing `nav-collapsible` pattern handles the nested collapsible toggles. No new behaviour modules.

-----

## Acceptance Criteria

- [ ] `nav` rune `layout` attribute accepts `strip` as a new value alongside existing values (`vertical`, `menubar`, `columns`, `cards`); **no `mega` value is added** — menubar absorbs that responsibility
- [ ] Identity transform emits `.rf-nav--strip` modifier class and `data-layout="strip"`
- [ ] Menubar `## groups` accept arbitrary block content: lists, paragraphs, blockquotes, images, nested `{% nav %}` runes. No content type is rejected at the schema level
- [ ] Menubar group content detection: the first non-list content block in a `## group` renders into `data-name="intro"` (class `.rf-nav-group__intro`)
- [ ] Menubar group content detection: the last non-list content block in a `## group` renders into `data-name="footer"` (class `.rf-nav-group__footer`)
- [ ] Menubar group content detection: lists and any middle content blocks render in source order as the panel's main body (no slot wrapping)
- [ ] A menubar group with only a flat list (today's pattern) emits no intro / footer slots — output is byte-identical to current behaviour
- [ ] A menubar group with a single non-list block and no lists places that block in the intro slot
- [ ] `columns` layout: between `##` sections at the nav's top level, `<hr>` opens a new `.rf-nav-group__column` container — columns stack one or more `##` sections each
- [ ] `columns` layout (headingless mode): when the nav has no `##` sections, `<hr>` between flat items splits items into columns
- [ ] `columns` layout (backwards compat): a nav with `##` sections and no `<hr>`s renders one column per section (today's footer behaviour, unchanged)
- [ ] `strip` layout: renders a flat row of items with no top-level container, no groups, no panel structure
- [ ] `strip` layout: rejects `##` headings via `ctx.warn` and degrades gracefully (heading treated as plain text)
- [ ] `strip` layout: supports standard nav features (slug resolution, active state, frontmatter enrichment, inline badges)
- [ ] A paragraph immediately following a list item in source becomes that item's `.rf-nav-item__description` (works in any layout)
- [ ] When `auto=true`, items without an explicit description inherit one from frontmatter (extends existing cards-layout enrichment to all layouts via {% ref "WORK-235" /%})
- [ ] When `auto=true`, items without an explicit icon inherit one from frontmatter (extends cards-layout enrichment)
- [ ] New `{% badge %}` core inline rune takes its label as children content and accepts attributes `sentiment` (`positive` | `negative` | `caution` | `neutral`, default `neutral`), `rank` (`primary` | `secondary`, optional), and `type` (`status` | `category` | `quantity` | `temporal` | `tag` | `id`, default `tag`) — all three mirroring the metadata-system dimensions from {% ref "SPEC-024" /%}
- [ ] Badge identity transform emits `<span class="rf-badge" data-meta-sentiment="…" data-meta-rank="…" data-meta-type="…">…</span>` — no per-variant BEM modifiers; visual styling inherits from the existing universal metadata CSS
- [ ] A `{% badge %}` inside or after a nav item's link text is recognised by the engine and attached as a `badge` property on the item (rendered adjacent to the title)
- [ ] Existing layouts (`vertical`, `cards`) continue to render identically — no behavior change for callers not on the new menubar / columns / strip semantics
- [ ] Existing menubar navs without rich panel content (just `## group` + flat list) render identically to today
- [ ] Existing columns navs without `<hr>`s render identically to today
- [ ] Lumina ships CSS for menubar's rich panel content: panel auto-sizes to fit content; intro slot styling (blockquote child → featured hero treatment, paragraph child → eyebrow); footer slot styling (border-top divider, compact); mobile drawer + accordion behaviour
- [ ] Lumina ships CSS for `.rf-nav--columns` updated to support multi-section columns (the new column-flow rule) plus the headingless mode for use inside menubar panels
- [ ] Lumina ships CSS for `.rf-nav--strip` (compact horizontal row, smaller text, muted base styling, mobile-friendly wrap)
- [ ] `.rf-nav-item__description` styled (smaller text, muted colour, line-height tightened)
- [ ] Mobile collapse: menubar drawer opens via hamburger; each `## group` becomes an accordion section; nested `columns collapsible=true` produces Vercel-style sub-section accordion behaviour; nested headingless `columns` produces Linear-style flat scroll
- [ ] Auto-open mobile section: when the mobile drawer opens, the `## group` containing nav items that resolve to or prefix the current page URL auto-expands; mirrors the existing `collapsible` vertical-layout behaviour
- [ ] `@refrakt-md/behaviors` `nav-menubar` module handles the menubar drawer + accordion toggles — no new behaviour module; existing module extended to recognise the richer panel structure
- [ ] CSS coverage tests updated for all new selectors: `.rf-nav--strip`, `.rf-nav-group__intro`, `.rf-nav-group__column`, `.rf-nav-group__footer`, `.rf-nav-item__description`, `.rf-badge`
- [ ] `npx refrakt inspect nav --layout=menubar` shows expected HTML output with intro / footer slots populated for a representative input
- [ ] `npx refrakt inspect nav --layout=columns` shows expected HTML output for both multi-section columns and headingless modes
- [ ] `npx refrakt inspect nav --layout=strip` shows expected HTML output
- [ ] `npx refrakt inspect badge` shows expected HTML output for various sentiment / rank / type combinations
- [ ] Authoring docs (`site/content/docs/authoring/`) updated with a "Rich menubar panels and column flow" guide covering composition patterns, slot rule, the new columns layout semantics, the strip layout, and the Linear / Vercel mobile patterns
- [ ] `nav` rune reference page updated with the new menubar capabilities and `layout="strip"` section
- [ ] New rune reference page for `badge`
- [ ] At least one site nav demonstrates the composition pattern (likely `site/content/_layout.md` header region with `menubar` + nested `columns` + a sibling `strip` below)

-----

## Out of Scope

- **`layout="mega"` as a separate value** — explicitly *not* introduced. The menubar layout absorbs the responsibility via the position-based slot rule and arbitrary panel content. If a future use case proves the composition model insufficient (e.g. a panel needs styling that can't be derived from its content), revisit.
- **Embedded media beyond plain `![image]` and nested runes** — video, animated demos, embedded iframes. Plain Markdown images work in slots (covered above); richer media deferred.
- **Nested `##` groups inside a `##` group** (i.e. sub-sub-sections in a single panel). One level of nesting (group → nested nav with its own sections) is enough for realistic patterns. Deeper nesting is YAGNI.
- **Aggregated/auto-populated panel slots** (e.g. last 3 changelog entries auto-pulled into a panel footer). Slot content is hand-authored in v1; a future `{% nav-recent %}` primitive could populate it.
- **A separate `colophon` rune for copyright / social rows.** Already deferred from SPEC-046; remains deferred.
- **Replacing the marketing plugin's `bento` or `feature` runes.** Different use cases — these primitives are for landing-page content, not navigation.
- **Animating panel transitions.** CSS-only fade or theme-defined; no schema involvement.
- **Strip layout with groups.** `layout="strip"` is flat by design and warns on `##` headings. Grouped strip-like content should use `layout="columns"` or `layout="vertical"`.
- **Per-trigger panel routing logic.** Headings *are* the panel triggers in menubar — no separate routing declaration needed.

-----

## Open Questions

**Are descriptions a property or a child?** Modeled above as a property attached during postProcess. Alternative: keep the description paragraph as a child of `nav-item`, let the engine wrap it with a class. Property is cleaner for the auto-enrichment path; child is closer to source. Lean property.

**Description paragraph delimiter.** Markdown parsers vary on whether a paragraph under a list item belongs to the item (indented continuation) or breaks out. Need to confirm Markdoc's behaviour and possibly require a specific indent. Worth a spike before committing.

**Should `menubar` panel content auto-size CSS or use a fixed wider treatment when rich content is present?** Two reasonable approaches: (a) use `width: max-content` / container queries to auto-size based on content (cleanest); (b) detect the presence of certain content types (nested nav, blockquote in intro) and apply a `data-panel-shape="wide"` attribute the theme can target. Lean (a) — let CSS handle it without engine awareness.

**Strict scoping for `---`?** Should menubar warn if `---` appears between `##` groups at the top level (ambiguous in menubar context)? Should columns warn if `---` appears inside a section's children rather than between sections? Strict warnings prevent confusing source files. Lean yes — warn on out-of-scope `---` usage with a clear suggestion.

**`columns` layout: when both `##` sections AND headingless items appear in the same nav, what's the behaviour?** Probably treat the first form encountered as the mode for the whole nav and warn on any inconsistency. Worth nailing down with a real authoring example.

{% /spec %}
