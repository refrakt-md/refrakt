{% spec id="SPEC-054" status="accepted" tags="nav, layout, theme, runes, mega-menu" source="SPEC-046" %}

# Nav mega variant

Extend the `nav` rune with a `layout="mega"` value for richly-presented header dropdowns — multi-column groups, per-item descriptions, featured hero entries, a footer band for secondary links (changelog, release notes), and inline status badges. Reuses the existing `auto=true` frontmatter enrichment machinery from the cards layout and the top-level item band from the vertical layout.

## Problem

[SPEC-046](/plan/specs/SPEC-046) shipped `layout="menubar"` for header navigation: top-level items render flat, `## groups` become simple dropdowns containing a flat link list. That covers compact product navs (Refrakt's own site, small SaaS sites) but leaves the richer pattern unaddressed.

**Sites with broader product surface need more dropdown structure.** Linear, Vercel, Stripe, and Notion all use mega-style header dropdowns: each top-level item opens a wide panel with multiple columns, each item shows a short description, one or two entries get featured treatment with larger type or imagery, and a secondary band at the bottom holds "what's new" / changelog / release links. A flat link list inside a dropdown doesn't scale — once a group has more than ~6 items or items need context, the menubar layout becomes hard to scan.

**Authors currently hand-roll this with raw markdown and per-site CSS.** No structure, no theme reuse, breaks the "one primitive, contextual rendering" principle. SPEC-046 explicitly listed mega-menus, per-item icons/badges, and embedded media as out of scope; this spec picks that thread up.

**Item descriptions are useful beyond mega.** Once descriptions are resolved from frontmatter (or supplied inline), the cards layout already uses them, and the columns layout (footer) could benefit too. The resolution path should be a shared cross-layout enrichment, not a mega-only concern.

**Status badges are a recurring nav need.** "New", "Beta", "Soon" pills on individual items show up in every mega-menu pattern online. Currently no primitive exists; authors would inline raw HTML.

-----

## Design Principles

**Mega is `menubar` with enrichment, not a different content model.** Same `## group` / list-item content shape SPEC-046 established. The only structural addition is what an *item* can contain: an optional description paragraph and an optional badge marker. Everything else (columns via `---`, footer band via trailing items, featured via blockquote) is the engine reinterpreting existing markdown primitives in the nav context.

**Descriptions resolve uniformly across layouts.** The resolution rule — explicit paragraph wins, frontmatter `description` falls back, nothing otherwise — applies to `mega`, `cards`, and `columns`. Themes decide whether to *render* the description (mega and cards: yes by default; columns: opt-in).

**Markdown-native column breaks.** A horizontal rule (`---`) inside a group splits its items into visual columns. No `columns="N"` attribute, no per-item annotations — the author's source already encodes the break visually. CSS clamps the maximum column count for layout sanity.

**Footer band mirrors top-level band.** SPEC-046 ships the convention that items *before* the first `##` render in a `data-name="top-level"` container. Items *after* the last group render in a symmetric `data-name="footer"` container, styled by the theme as the secondary band. Same content shape, same machinery.

**Badges are a new general-purpose inline rune.** `{% badge %}` belongs in a place broader than nav — it'll be reused in pricing tables, changelog entries, doc sidebars marking new APIs, etc. Define it as a core inline rune now, use it in nav.

**Featured items piggyback on blockquote.** A blockquote at the top of a group is structurally distinct in markdown and visually distinct in most themes already. Reinterpret it inside `{% nav %}` as the featured/hero card for that group. No new syntax.

-----

## Authoring Surface

### Mega header dropdown — fully auto

Most ergonomic case. Top-level items are flat dropdown triggers; their `## group` content opens as a wide panel.

```markdoc
{% nav layout="mega" auto=true %}
- product
- resources

## Product
- plan
- build
- insights

---

- security
- integrations

## Resources
- docs
- guides
- community

---

- [Changelog](/changelog)
- [What's new](/whats-new)
{% /nav %}
```

Behaviour:
- `product` and `resources` become the menubar triggers (top-level band, unchanged from SPEC-046).
- Each `## group` becomes the panel content for the trigger of the same name (matched by slug).
- Each item shows icon + title + description pulled from the linked page's frontmatter via the existing `auto=true` registry enrichment (already implemented for cards).
- `---` inside a group splits items into two CSS columns.
- Items after the last group (the two trailing `[Changelog]` / `[What's new]` links) render in the footer band at the bottom of the panel.

Open question: with multiple top-level triggers, which group attaches to which trigger? Two options covered in Open Questions below.

### Mega header dropdown — manual descriptions and featured item

When auto frontmatter is wrong (menu copy differs from page summary) or items don't correspond to pages.

```markdoc
{% nav layout="mega" %}
- product

## Product

> [Refrakt for teams](/teams)
> The collaborative authoring environment for documentation at scale.

- [Plan](/plan)

  Track work, specs, and decisions alongside your docs.

- [Build](/build)

  Author content in plain markdown with rich rune semantics.

- [Insights](/insights)

  Understand how readers move through your site.

---

- [Security](/security) {% badge type="new" /%}

  SOC 2 Type II, SSO, and audit logs.

- [Integrations](/integrations)

  Connect to GitHub, Linear, and 30+ tools.
{% /nav %}
```

Patterns:
- **Blockquote at top of group** = featured hero. The first paragraph is the link (using markdown link inside the blockquote), the second is the description.
- **Paragraph after each list item** = manual description override (takes precedence over any frontmatter fallback).
- **`{% badge type="new" %}`** inline = status pill. Other values: `beta`, `soon`, `deprecated`, plus theme-defined.
- `---` splits the group into two visual columns.

### Mixed — auto with selective overrides

The realistic everyday case: most items come from frontmatter, a couple need bespoke copy.

```markdoc
{% nav layout="mega" auto=true %}
- product

## Product
- plan
- build
- insights {% badge type="beta" /%}

- [Enterprise](/enterprise)

  Custom pricing, dedicated support, on-prem deployment.

---

- security
- integrations
- changelog
{% /nav %}
```

Resolution rules:

| Item shape                                            | Title source              | Description source                  |
|-------------------------------------------------------|---------------------------|-------------------------------------|
| Plain slug (`plan`)                                   | Frontmatter `title`       | Frontmatter `description`           |
| Explicit link, no paragraph (`[Enterprise](/x)`)      | Link text                 | Frontmatter `description` (if page) |
| Explicit link with paragraph                          | Link text                 | The paragraph                       |
| Slug with paragraph                                   | Frontmatter `title`       | The paragraph (overrides frontmatter) |
| Any item, badge appended (`item {% badge %}`)         | (unchanged)               | (unchanged) — badge attaches to title |

### Eyebrow labels via group-level paragraph

A paragraph immediately under a group heading becomes the group's eyebrow / short description, rendered above the columns of items.

```markdoc
{% nav layout="mega" auto=true %}
- product

## Product
For teams shipping documentation

- plan
- build
- insights

---

- security
- integrations
{% /nav %}
```

Reuses the same "first paragraph under a heading" convention markdown already affords.

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
      // adds 'mega' as a value alongside vertical | menubar | columns | cards
    },
    // ...existing
  },
}
```

Produces additional selectors:

- `.rf-nav--mega` (layout modifier) + `data-layout="mega"`
- `.rf-nav__top-level` (existing, reused for menubar triggers)
- `.rf-nav__footer` (new, mirror of top-level — items after the last group)
- `.rf-nav-group__eyebrow` (new, paragraph immediately under group heading)
- `.rf-nav-group__columns` (new container introduced when `---` is present in the group)
- `.rf-nav-group__column` (new, one per `---`-delimited segment)
- `.rf-nav-item__description` (new, paragraph child or resolved frontmatter)
- `.rf-nav-group__featured` (new, blockquote-as-hero treatment) + `data-featured="true"` on the item

`NavItem` postTransform extends to:
1. Detect a paragraph sibling immediately following the item in the source list; consume it and attach as `description` property.
2. Detect `{% badge %}` runes inside the item's link text; consume them and attach as `badge` property (meta tag).
3. When `auto=true` and the item resolves to a registry page, attach `icon` + `description` from frontmatter as fallback properties (already implemented for cards; reuse).

`NavGroup` postTransform extends to:
1. Detect a paragraph immediately after the heading; consume it and attach as `eyebrow` property.
2. Detect a leading blockquote; consume it and attach as `featured` property with link + description split.
3. Split the items array at each `---` sentinel into a `columns` property (array of arrays).

Trailing items (after the last `##` group) collect into a new `footerItems` property on the `Nav` block, rendered into a `data-name="footer"` container by `structure`.

-----

## Badge rune (new)

Defined in `packages/runes/src/tags/badge.ts`. Inline rune.

```markdoc
{% badge type="new" /%}
{% badge type="beta" /%}
{% badge type="soon" /%}
{% badge type="deprecated" /%}
{% badge type="custom" label="Free" /%}
```

Identity transform output:

```html
<span class="rf-badge rf-badge--new" data-type="new">New</span>
```

Default labels per type are theme-resolvable via CSS pseudo-content or via the rune's `label` attribute. Sits inline anywhere markdown allows inline content — nav items, table cells, headings, prose.

Belongs in core, not the nav schema, because the use cases extend beyond nav (changelog entries marking added APIs, pricing rows marking popular tiers, doc sidebars marking unstable features).

-----

## Description Resolution

Implemented in the existing `auto=true` postProcess hook (`packages/runes/src/pipeline.ts` or wherever the cards-layout enrichment lives — extend, don't duplicate). Resolution rules at postProcess time:

1. If the item has an inline description child (paragraph following the link in the source list), use it. Stop.
2. If the item resolves to a registry page and that page's frontmatter has `description`, use it. Stop.
3. Otherwise, no description. Item renders title-only.

`icon` follows the same shape: inline `{% icon %}` rune in the link text overrides frontmatter `icon`, which overrides nothing.

The cards layout already implements step 2 for the title and description. This spec generalises: the same resolution applies whenever `auto=true` is set, regardless of layout. Mega, cards, and columns all benefit. Vertical and menubar render descriptions only if a theme opts in via CSS (the data is present on the DOM either way).

-----

## Mobile Strategy

Out of scope for the rune itself; theme + behaviors concern. The contract the rune offers themes:

- `.rf-nav--mega` plus `data-layout="mega"` on the nav.
- All structural slots above (`__top-level`, `__footer`, `__columns`, `__column`, `__eyebrow`, `__featured`, `__description`) are present in the DOM whether mobile or desktop.
- Lumina ships a reference mobile collapse: at narrow viewports, mega behaves like a vertical accordion — each top-level trigger toggles its panel open, columns stack, footer band stays at the bottom of each panel.

The existing `nav-menubar` behaviour (SPEC-046) extends to handle mega trigger open/close; no new behaviour module needed beyond a CSS-only column → stack reflow.

-----

## Acceptance Criteria

- [ ] `nav` rune `layout` attribute accepts `mega` in addition to existing values
- [ ] Identity transform emits `.rf-nav--mega` modifier and `data-layout="mega"`
- [ ] Trailing items (after the last `## group`) render in a `data-name="footer"` container with class `.rf-nav__footer`
- [ ] `---` (hr) inside a group's item list splits items into `.rf-nav-group__column` segments inside a `.rf-nav-group__columns` container
- [ ] A paragraph immediately following a list item in the source becomes that item's `.rf-nav-item__description`
- [ ] A paragraph immediately following a group heading becomes that group's `.rf-nav-group__eyebrow`
- [ ] A blockquote at the top of a group becomes the group's `.rf-nav-group__featured` entry with `data-featured="true"` on the resulting item
- [ ] When `auto=true`, items without an explicit description inherit `description` from the linked page's frontmatter (extends existing cards-layout enrichment)
- [ ] When `auto=true`, items without an explicit icon inherit `icon` from the linked page's frontmatter (reuses cards-layout enrichment)
- [ ] New `{% badge %}` core inline rune accepts `type` (`new` | `beta` | `soon` | `deprecated` | `custom`) and optional `label`; emits `.rf-badge .rf-badge--{type}` with `data-type` attribute
- [ ] A `{% badge %}` inside a nav item link is recognised by the engine and attached as a `badge` property on the item (rendered adjacent to the title)
- [ ] Existing `menubar`, `vertical`, `columns`, `cards` layouts render identically to today — no behaviour change for callers not on the `mega` layout
- [ ] Description resolution rule applies uniformly to any `auto=true` nav regardless of layout (data attached; theme decides rendering)
- [ ] Lumina ships CSS for `.rf-nav--mega` including: column grid (clamped to max 3 cols), eyebrow typography, featured item treatment, footer band, mobile stacked fallback
- [ ] Lumina ships CSS for `.rf-badge` covering all built-in types
- [ ] `@refrakt-md/behaviors` `nav-menubar` behaviour handles mega trigger open/close (extends existing behaviour; no new module)
- [ ] `npx refrakt inspect nav --layout=mega` shows expected HTML output with all new slots populated for a representative input
- [ ] `npx refrakt inspect badge --type=new` shows expected HTML output
- [ ] CSS coverage tests updated for `.rf-nav--mega`, `.rf-nav__footer`, `.rf-nav-group__*`, `.rf-nav-item__description`, and `.rf-badge--*` selectors
- [ ] Authoring docs (`site/content/docs/authoring/`) updated with a Mega menu authoring guide covering all four sketch patterns above
- [ ] Rune reference page for `nav` updated with `layout="mega"` section
- [ ] New rune reference page for `badge`
- [ ] At least one site page demonstrates the mega layout (likely `site/content/_layout.md` header region, behind a feature flag or as the new default once docs are ready)

-----

## Out of Scope

- **Embedded media in mega panels** (images, video thumbnails as featured entries). Achievable later by allowing arbitrary block content inside the featured slot, but the blockquote-as-link convention covered here is the v1.
- **Nested groups** (mega panels with sub-groups inside a column). Single-level groups with column breaks cover the realistic patterns; deeper nesting is YAGNI.
- **Aggregated/auto-populated footer band** (e.g. last 3 changelog entries). The footer band is hand-authored items in v1. A future enhancement could let `{% nav-recent collection="changelog" limit="3" %}` populate it, but that's a separate primitive.
- **Per-trigger panel routing logic.** This spec assumes each `## group` matches a top-level trigger by slug (see Open Questions). More flexible routing (explicit `for="trigger-slug"` attribute on groups) is deferred.
- **A `colophon` rune for copyright / social rows.** Already deferred from SPEC-046; remains deferred.
- **Replacing the marketing plugin's `bento` or `feature` runes.** Different use cases — mega is for navigation; bento/feature are for landing-page content.
- **Animating panel transitions.** CSS-only fade or theme-defined; no schema involvement.

-----

## Open Questions

**How do multiple top-level triggers map to multiple `## groups`?** Three plausible models:

1. **Slug match** (proposed): trigger `- product` matches `## Product` by case-insensitive slug. Tersest, but coupling.
2. **Positional**: first trigger → first group, second → second. Brittle if the author rearranges.
3. **Explicit**: `## Product {% for="product" %}` or similar attribute. Most flexible, most verbose.

Recommend (1) for v1 with (3) as an escape hatch if collisions appear.

**Should single-trigger mega be allowed?** The simplest case is one trigger + one group + one big panel. Either it's allowed (no routing problem) or every mega requires multiple triggers (forced structure). Recommend allowing single-trigger — useful for "Solutions" megas with one trigger and rich content.

**Are descriptions a property or a child?** Modeled above as a property attached during postProcess (meta tag → property). Alternative: keep the description paragraph as a child of `nav-item`, let the engine wrap it with a class. Property is cleaner for the auto-enrichment path; child is closer to source. Lean property.

**Badge label source.** Three options for `{% badge type="new" %}`:
1. Theme CSS pseudo-content (`::before { content: "New" }`) — themeable, but accessibility-hostile (screen readers may not see it).
2. Engine-injected text node based on a `defaultLabels` map in the badge config — accessible, but the map lives in code.
3. Required `label` attribute always — explicit, but verbose for the common case.

Recommend (2) with `label` as override. The map ships with English defaults; themes/locales can override the map.

**Description paragraph delimiter.** Markdown parsers vary on whether a paragraph under a list item belongs to the item (indented continuation) or breaks out. Need to confirm Markdoc's behaviour and possibly require a specific indent. Worth a spike before committing.

**Featured item — blockquote vs first list item with a modifier.** Blockquote is structurally distinct but has other markdown uses (callouts). Alternative: first list item with an explicit `{% featured %}` marker. Blockquote feels more natural inside nav context; revisit if collisions appear in real authoring.

**Should `mega` imply `auto=true`?** Nearly every realistic mega menu uses page-resolved descriptions. Defaulting `auto=true` when `layout="mega"` reduces ceremony but adds magic. Recommend leaving them independent — explicit is better.

{% /spec %}
