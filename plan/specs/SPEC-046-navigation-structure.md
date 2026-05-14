{% spec id="SPEC-046" status="draft" tags="nav, layout, theme, runes" %}

# Navigation structure

Extend the `nav` rune so a single content model expresses sidebar, header, footer, and section-landing navigation — with collapsible groups in the sidebar, dropdown menus in the header, column grids in the footer, and card grids on landing pages. One authoring vocabulary, four contextual renderings.

## Problem

Refrakt has a sidebar `nav` rune today (`packages/runes/src/tags/nav.ts`) that interprets `## Heading` as a group and list items as links. The model is exactly what header dropdowns and footer link columns also need — but the current rune is hard-wired to vertical sidebar layout, and the header/footer regions have no structured nav at all.

**Header is unstructured plain markdown.** `site/content/_layout.md` puts a flat row of `[Docs] [Runes] [Blog]` links in the `header` region. There's no way to group "Product → Pricing, Features" or "Resources → About, Blog" into desktop dropdowns / mobile accordions, and no way for themes to style header navigation consistently because there's no BEM block to hang CSS off.

**Sidebar groups have no collapse affordance.** Long sidebars (the runes catalog, the docs index) render every group fully expanded. Authors can't say "collapse everything except the section the reader is in" without writing a custom Svelte component.

**No footer navigation primitive.** The `footer` region exists but has no rune designed for it. Sites that want a multi-column "Product / Resources / Legal / Social" footer either inline plain markdown (no structure, no theming) or build a one-off component.

**Section landing pages have no card grid.** When a section index wants to show its child pages as cards with title and summary instead of a bare link list, there's no rune for it. `{% nav auto %}` gives a flat link list; the only card-shaped primitives (`bento`, `feature`) live in the marketing plugin and don't read from the registry. Authors fall back to writing card markup by hand on every section landing page.

**Four separate runes would fragment the model.** Inventing `menubar`, `nav`, `footer-cols`, and `card-grid` runes would mean four schemas, four Markdoc grammars, four CSS surfaces — for content that's structurally identical (named groups containing links).

-----

## Design Principles

**One primitive, contextual rendering.** Sidebar, header menubar, footer columns, and section-landing cards are the same content shape: groups of links with an optional top-level row. The `nav` rune already models this. Add a `layout` attribute (`vertical | menubar | columns | cards`) that selects the presentation; keep the content model identical across all four. This matches refrakt's "same primitive, different meaning by context" philosophy — a heading inside `{% nav %}` is already a group title, not a heading, regardless of where the nav lives.

**Theme owns presentation, not authoring.** Authors don't write "open by default" markers, dropdown CSS, or breakpoint logic. They write structure. The theme decides that on desktop, `menubar` groups are dropdowns and on mobile they're accordion sections — that's a CSS / behaviors concern, not a content concern.

**Smart defaults over explicit state.** For collapsible sidebars, the question "which group is open?" almost always has the answer "the one containing the current page." Make that automatic. Authors only opt in to `collapsible`; URL-aware expansion is handled at postProcess time.

**Avoid per-heading syntax for UI state.** Reject prefix conventions like `## + Heading` / `## - Heading`. They bleed presentation into source, break if the markdown ever renders elsewhere, and answer a question (which one starts open) that has a better automatic answer.

-----

## Authoring Surface

A single `layout` attribute selects rendering. All three values accept the same content shape.

```markdoc
{% nav %}                    # default: vertical sidebar
{% nav collapsible %}        # vertical, groups collapse, current section auto-opens
{% nav layout="menubar" %}   # horizontal bar; groups → desktop dropdowns / mobile accordion
{% nav layout="columns" %}   # column grid; groups → column titles (footer pattern)
{% nav layout="cards" %}     # card grid; items enriched with title / description / icon from frontmatter
```

### Header (menubar)

```markdoc
{% region name="header" %}
[![](/mark.svg)](/)

{% nav layout="menubar" %}
- [Docs](/docs)
- [Blog](/blog)

## Product
- pricing
- features

## Resources
- about
- changelog
{% /nav %}
{% /region %}
```

Top-level items (before the first `##`) render flat in the menubar. Each `##` becomes a dropdown trigger; its list items are the dropdown contents. On mobile the entire menubar collapses behind a hamburger and groups become accordion sections.

### Sidebar (collapsible)

```markdoc
{% nav collapsible %}
## Getting Started
- intro
- install

## Authoring
- pages
- runes
- layouts
{% /nav %}
```

Default behavior: the group containing the current URL is expanded; all others are collapsed. For the rare "expand more than one by default" case, the rune accepts `defaultOpen="Getting Started, Authoring"`.

### Footer (columns)

```markdoc
{% region name="footer" %}
{% nav layout="columns" %}
## Product
- pricing
- features

## Resources
- about
- blog
- changelog

## Legal
- [Privacy](/privacy)
- [Terms](/terms)
{% /nav %}
{% /region %}
```

Groups render as columns on desktop, stacked sections on mobile. The "small print" row (copyright, social) is a separate concern — plain markdown beneath the nav, or a future `colophon` rune. Out of scope here.

### Section landing (cards)

```markdoc
{% nav layout="cards" %}
- getting-started
- runes
- layouts
- theming
{% /nav %}
```

Or grouped:

```markdoc
{% nav layout="cards" %}
## Core concepts
- pages
- runes
- layouts

## Advanced
- plugins
- theming
{% /nav %}
```

Each item renders as a card. The current `nav` slug-resolution path already maps slugs to page titles via the registry — the cards layout extends this to also pull `description` and `icon` from each linked page's frontmatter. Group headings become section titles above each card grid. Explicit links (`[Label](/url)`) still work but only get a title and link — no enrichment, since there's no page to read frontmatter from.

The frontmatter shape this depends on:

- `title: string` — already in the `Frontmatter` interface (`packages/content/src/frontmatter.ts`).
- `description: string` — already in the interface; used today for SEO. The cards layout reuses it as the card body.
- `icon: string` — **not currently defined**. This spec adds an optional `icon?: string` field to the `Frontmatter` interface, holding an icon name resolvable by the existing `{% icon %}` rune (e.g. `icon: rocket`). Pages without `icon` render iconless cards.

`image` is already in the interface but is left out of the default card on purpose — image-heavy cards are a richer visual that themes can opt into via an additional registry lookup. Keeps the default contract minimal.

For "list every child of this section" without naming each one, combine with auto mode: `{% nav layout="cards" auto %}`.

-----

## Engine Config Changes

Additions to the `Nav` entry in `packages/runes/src/config.ts`:

```ts
Nav: {
  block: 'rf-nav',
  tag: 'nav',
  modifiers: {
    layout: { source: 'attr', default: 'vertical' },  // vertical | menubar | columns | cards
    collapsible: { source: 'attr', default: 'false' },
    ordered: { source: 'attr', default: 'false' },    // existing
  },
  // ...existing structure
}
```

Produces:
- `.rf-nav` (block)
- `.rf-nav--menubar`, `.rf-nav--columns`, `.rf-nav--cards`, `.rf-nav--vertical` (layout modifier)
- `.rf-nav--collapsible` (collapsible modifier; vertical only)
- `data-layout="menubar|columns|cards|vertical"` for variant CSS selectors

`NavGroup` config stays unchanged — same `rf-nav-group` block, same `title` + `items` — but the theme styles `.rf-nav--menubar .rf-nav-group` very differently from `.rf-nav--columns .rf-nav-group`.

-----

## Auto-Open for Collapsible Sidebars

Implemented as a postProcess sentinel resolved during Phase 4 (`runPipeline()` in `packages/content/src/pipeline.ts`):

1. At schema time, `nav` with `collapsible` emits each `NavGroup` with `data-collapsed="auto"` and a list of contained slugs / URLs as a property.
2. The core `postProcess()` hook receives the current page URL, finds the group whose items match it, and rewrites that group's `data-collapsed` to `"false"`. All other auto groups become `"true"`.
3. If `defaultOpen` is set on the nav, listed group titles also get `"false"`.

The behaviors package (`@refrakt-md/behaviors`) handles runtime toggling — click a group header, flip `data-collapsed`, theme CSS does the rest via `[data-collapsed="true"]` selectors. No JS state, no framework coupling.

-----

## Mobile Strategy

Out of scope for the rune itself — this is a theme / behaviors concern. The contract the rune offers themes:

- `menubar` layout sets `data-layout="menubar"` on the nav; theme writes a media query that switches to a hamburger pattern below a breakpoint, reusing the existing collapsible logic for group expansion.
- `columns` layout: theme stacks columns vertically below the breakpoint. No JS needed.
- `vertical collapsible`: same on desktop and mobile; the collapsible mechanism doesn't care about viewport.

Lumina ships reference styles for all three; downstream themes can override.

-----

## Acceptance Criteria

- [ ] `nav` rune accepts a `layout` attribute with values `vertical` (default), `menubar`, `columns`, `cards`
- [ ] `nav` rune accepts a `collapsible` boolean attribute (only meaningful for `vertical`)
- [ ] `nav` rune accepts a `defaultOpen` attribute (comma-separated group titles) overriding auto-open
- [ ] Identity transform emits `.rf-nav--{layout}` and `.rf-nav--collapsible` modifiers and `data-layout` attribute
- [ ] `NavGroup` emits `data-collapsed="auto|true|false"` when the parent nav is collapsible
- [ ] Core `postProcess` hook resolves `data-collapsed="auto"` based on current page URL — the group containing the current page becomes `"false"`, others become `"true"`
- [ ] Top-level items (before first `##`) continue to render in the existing `data-name="top-level"` container in all four layouts
- [ ] `Frontmatter` interface in `packages/content/src/frontmatter.ts` extended with optional `icon?: string` field
- [ ] Cards layout enriches each `NavItem` with `title`, `description`, and `icon` properties resolved from the linked page's frontmatter via the entity registry during postProcess
- [ ] Cards layout falls back gracefully when an item points at an external URL or a page missing `description` / `icon` — title-only card with link, no broken layout
- [ ] `nav layout="cards" auto` lists the current page's children (existing `auto` mechanism, now combined with the cards layout)
- [ ] Lumina ships CSS for all four layouts plus mobile breakpoints (menubar → hamburger, columns → stacked, cards → single column)
- [ ] `@refrakt-md/behaviors` ships a `nav-collapsible` behavior that toggles `data-collapsed` on group header click
- [ ] `@refrakt-md/behaviors` ships a `nav-menubar` behavior for desktop dropdown open/close and mobile hamburger toggle
- [ ] `site/content/_layout.md` updated to use `{% nav layout="menubar" %}` in `header` region and `{% nav layout="columns" %}` in `footer` region
- [ ] At least one section landing page in `site/content/` updated to demonstrate `{% nav layout="cards" %}`
- [ ] Existing sidebar nav (`{% nav %}` with no `layout`) renders identically to today — no behavior change for callers that don't opt in
- [ ] `npx refrakt inspect nav --layout=menubar` (and `columns`, `vertical`, `cards`) shows expected HTML output
- [ ] CSS coverage tests updated for the new selectors
- [ ] Authoring docs (`site/content/docs/authoring/`) updated with header / footer / collapsible / cards examples

-----

## Out of Scope

- A dedicated `colophon` rune for footer copyright / social rows — can be added later or kept as plain markdown.
- Nav grouping for content other than links (e.g. icon-only menubars, mega-menus with embedded media). Achievable later by allowing arbitrary children inside `NavGroup`, but not part of this spec.
- Per-group icons / badges in the menubar. Plain markdown inside list items already supports `{% icon name="..." /%}` if needed; no extra schema work.
- Multi-level sidebar nesting beyond what nested `<ul>` already supports.

-----

## Open Questions

**Should `layout` be a modifier or a structural switch?** Modeled as a modifier above (consistent with rune conventions, easy CSS targeting). Alternative: route `nav` through three internal templates in the engine. The modifier approach is simpler and keeps the schema unchanged — recommend sticking with it unless concrete styling needs force a structural split.

**Where does the current URL come from for auto-open?** The cross-page pipeline already has per-page context in `postProcess`. Confirm that the page URL is available on the `TransformedPage` passed to plugin hooks. If not, this spec needs to widen the hook signature first.

**Mobile hamburger placement.** Themes may want the hamburger button to live outside the nav (e.g. top-right of the page header). Should the rune emit the trigger button itself, or leave it to the layout? Lean toward "rune emits the trigger inside `data-name='trigger'`" so theme CSS can position it absolutely — cheaper than a separate `nav-toggle` rune.

**Naming: `layout` vs `variant` vs `as`.** `layout` collides slightly with the layout-cascade concept; `variant` is generic; `as` is short but cryptic. Bias toward `layout` since "layout of the nav" is precise, and the existing `layout` cascade lives in a different scope (regions / pages, not rune attributes).

**Cards: minimal vs rich default.** Defaulting to `title` + `description` + `icon`. The first two already exist on the `Frontmatter` interface; this spec adds `icon`. The interface also has `image` (used elsewhere for hero / OG images) which could power a richer card — but image-heavy cards have layout consequences (aspect ratio, lazy loading, breakpoint behaviour) that go well beyond a navigation primitive. Recommend keeping `image` out of the default card and letting themes opt in via additional registry lookups if they want it.

**Should `icon` accept anything beyond a name?** Refrakt's `{% icon %}` rune accepts a `name` plus optional `set` / `size`. Frontmatter is a simpler authoring surface — `icon: rocket` is what an author wants to write. If a page needs more control, it can override the card via custom frontmatter the theme reads. Recommend keeping `icon: string` as a name only.

**Cards vs `bento` / `feature`.** Both marketing-plugin runes render card-shaped output but require hand-authored content. The cards layout's value is registry enrichment — pull data from the pages themselves. Different use cases; no need to unify.

{% /spec %}
