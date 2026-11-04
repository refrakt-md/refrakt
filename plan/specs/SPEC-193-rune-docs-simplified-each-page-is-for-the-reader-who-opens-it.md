{% spec id="SPEC-193" status="accepted" tags="docs, runes, simplification, examples, themes, adapters" %}

# Rune docs, simplified: each page is for the reader who opens it

The documentation grows and rarely shrinks. Every feature added a section, every change a note
about what it used to do, and every review a paragraph for the next maintainer. The result is
pages written for several readers at once, and readable by none of them. A sweep of
`site/content/` (224 pages, about 142,000 words) found the same few causes on page after page.
This spec records what was found and decides how each page is cut back to the reader it is for.

## Why

**A rune page is for someone writing content.** It answers: what is this rune for, how do I write
it, what does it look like, what can I change? It is not where a theme author finds selectors or a
rune author learns how the pipeline resolves a sentinel. Those readers have their own handbooks
under `extend/`, and the generated tools (`refrakt inspect`, the structure contract) answer
structural questions exactly and without drifting.

**Hand-written detail drifts; generated detail does not.** A page's HTML dump, its attribute table
written by hand, its list of `data-*` attributes: each is a second copy of something the code or a
generator already states. The sweep found copies that are already wrong (`card.md` documents
`elevation` values that `surfaces.md` calls deprecated; `plan/work.md` and `plan/spec.md` end with
two orphaned rows of a deleted table).

**Readers cannot follow what the docs cite.** Plan IDs (`SPEC-070`, `WORK-304`), decision numbers
(`D5`) and release history ("before v0.39.0…") point at things a reader cannot open, or at a past
they never used.

## What the sweep found

Counts are approximate (grep plus reading). Page names are relative to `site/content/`.

### F1 — detail for theme and rune authors, on pages for content authors

About 40 rune pages and 15 docs pages.

- **Output contract / Output / Output structure:** HTML dumps, BEM classes, `data-*` attributes and
  custom properties on 15 rune pages: actions, aggregate, badge, bar, card, code, collection,
  deflist, expand, file-ref, link, progress, relationships, snippet, plan/plan-history.
- **CSS and engine internals in prose:**
  - `tint.md` "Token set" and "Identity transform output"; `bar.md` "## CSS"; `deflist.md`
    "Responsive layout".
  - `expand.md` "Resolution model" (a 7-step resolver walkthrough); `drawer.md` "Title-level
    auto-detection" and the flex details of "Always-visible footer".
  - `snippet.md` and `data.md` open with a hint that the rune "is an AST preprocessor"; snippet's
    line numbers are "pure CSS… `counter-reset`".
  - `marketing/bento.md` "Frame & elevation" ("the engine emits no `--bento-media-aspect`");
    `marketing/hero.md` "Animated background" (`devicePixelRatio`, `position: fixed; inset: 0`).
  - `plan/plan-history.md` "How it works" (git internals), "Visual language"; "produces a sentinel
    that the pipeline resolves" on plan-activity and decision-log; "Cross-page pipeline" on
    `plan/index.md` and `design/index.md`.
- **In user docs:** every adapter page's "Theme Integration" and `XTheme` interface;
  `authoring/nav-slug-resolution.md` "Active state contract" and "Theme reference";
  `authoring/frontmatter.md` and `configuration/reference.md` "Keeping this page honest";
  `configuration/schema.md` "Local-development reference"; the `__` prefix in `variables.md`.
- **Example content about the engine:** `feature.md` ("The identity transform adds BEM classes"),
  `plan/work.md` ("emits data-tint-dark"), `plan/spec.md`, `plan/milestone.md`.

### F2 — hand-written attribute tables beside the generated one

About 24 pages.

- "Layout attributes" on card, section, hero, feature, recipe, realm, faction, playlist; "Step
  layout attributes" on steps; "Cover attributes" on hero; "Common attributes" on bento.
- Child-rune tables: "Tier attributes" (pricing), "Release attributes" (changelog), "Member
  attributes" (cast), "Entry attributes" (timeline), "Day/Stop attributes" (itinerary).
- Attribute-by-attribute prose: collection, aggregate, relationships; `tint.md` "The tint axis on
  other runes"; `layout.md` "Region attributes" and "Layout attributes"; the sandbox data-binding
  table.
- **Missing the generated table:** `bar.md`, `deflist.md`; `link.md` has a hand-written one.
- **Broken:** `plan/work.md` and `plan/spec.md` end with two orphaned table rows.

### F3 — plan IDs and decision numbers

- **The generated attribute table** carries 724 references (SPEC-107, SPEC-105, SPEC-088,
  SPEC-087, SPEC-053…). They come from the universal-axis descriptions in `packages/transform`'s
  facet contracts, are copied into `_data/rune-attributes.json`, and render on about 45 rune pages.
- **Rune pages**, 11 in prose: "SPEC-062 / WORK-304." trailing snippet, diff and codegroup; "the
  SPEC-080 `bar` layout primitive"; xref (SPEC-078, SPEC-064); drawer; sandbox; expand's only live
  example is SPEC-066.
- **Theme pages:** all 9 preset pages ("exercises the SPEC-056 role splits", "Phase 1 of the
  SPEC-057 lineup").
- **User docs:** `configuration/i18n.md` ("The design (SPEC-035)", "Decision D5"),
  `cli/inspect.md`, `cli/reference.md`.
- **Extend:** 75 mentions on 19 pages; `config-api.md` 19, `dimensions.md` 12,
  `blocks-and-layout.md` 11 (its intro opens "SPEC-080 makes…").
- IDs used as *sample data* (an example work item's `id`) are fine, but should be consistent:
  `plan/work.md` uses `RF-142`, `plan/spec.md` `SPEC-9008`, `plan/plan-history.md` the real
  `WORK-024`.

### F4 — history and migration narration

About 26 pages.

- Rune pages: snippet's v0.39.0 `.rf-snippet` note; data's "Before v0.39.0…" and "used to
  resolve to an empty string"; showcase's SPEC-086 deprecation, stated twice; surfaces' old
  `elevation` scale; pullquote's deprecated `variant`; bg's deprecated `overlay`; hero's
  `refrakt migrate`; "today's behaviour", "not supported in v1".
- Docs: `configuration/overview.md` "Legacy flat shape"; `themes/tideline.md` and
  `neutral-default.md` v0.14.0 upgrade notes.
- Extend: `dimensions.md` "Legacy `StructureEntry` fields" ("Removed in v0.18.0 (WORK-313)");
  `config-api.md` "structure (legacy)" and "Since v0.31.0…"; `output-contract.md` "`property` —
  Deprecated, ignored".

### F5 — duplication

- **"Section header"** is one paragraph on 20 rune pages, with only the noun changed ("X supports
  an optional eyebrow, headline, and blurb above …"). Twelve copies read "above the section above
  entries".
- **Adapters:** the 6 adapter pages repeat installation, configuration, the theme interface, CSS
  injection, site token overrides, behavior init, "Differences from SvelteKit" and dependencies;
  about 2,400 lines (`astro.md` alone 591).
- **Theme presets:** "Opt in", "Live preview" (the same snippet), "Composing with tideline" and
  "Attribution" on 7–9 pages; `lumina.md` repeats the catalog's preset table and says Lumina has
  "two opt-in presets" where the catalog lists nine.
- **Configuration migration** in `overview.md`, `migration.md` and `plugins.md`. **Tint** in
  `docs/authoring/tint.md`, `runes/tint.md` and `extend/theme-authoring/tint-cascade.md`.
- **Docs repeating rune pages:** `docs/content.md` "Layout cascade" (layout),
  `docs/authoring/partials.md` "Partial or include?" (include),
  `docs/authoring/rich-menubar-panels.md` (nav).
- **Extend:** `metaFields` / `blocks` / `layout` / `variants` in `config-api.md`, `dimensions.md` and
  `blocks-and-layout.md`; "Dark mode" and "File organization" in `css.md` and `dimensions.md`.

### F6 — examples

- **Code fences where a preview belongs:** `design/preview.md` (the preview rune's own page) has
  none, all eight examples fenced; `bg.md` 11 fences, no preview; nav, grid, pagination,
  relationships, xref, drawer, map ("Height variants"). 15 rune pages have no preview at all.
- **Examples that bury their point:** mockup's 30–60 lines of inline CSS per example; sandbox's
  ~200-line three.js demo inline; backlog's 10 near-identical one-liners; character, realm and
  faction give each attribute variant its own preview.
- **Weak content:** Lorem ipsum (`textblock.md`), "This is a note with helpful information"
  (`hint.md`), snippet demos that slice unrelated files, example copy about the engine; storytelling
  mixes Tolkien with original characters; images from both picsum and assets.refrakt.md.

### F7 — orientation, structure and consistency

- **"Which one do I want?"** is answered only by include (a comparison table) and hero/cta (one
  line). Missing for xref / expand / file-ref / drawer; accordion / details / tabs / reveal; hint /
  sidenote / annotate; figure / showcase / mediatext; grid / gallery; playlist / track / audio;
  character / realm / faction; timeline / changelog / steps / plot; cast / organization.
- **The attribute table has no fixed place:** H2 on some pages, H3 on 58, H4 on child runes, often
  nested under the preceding example (hero's under "Start-aligned", cta's under "Section header");
  mid-page on 32 pages, last on 64.
- **Names differ:** "See also" (15 pages) vs "Related" (2) vs nothing; the first section is "Basic
  usage" on 55 pages and "GET endpoint", "With rating", "Heading-based" on others; `xref.md` never
  says `{% ref %}` is the same rune.
- **Not runes, among the runes:** `surfaces.md` (420 lines), `media-guests.md`, `image-schemes.md`,
  `motion.md` are concept guides; `plan/examples.md` is a fixture page; `plan/cli.md` documents a
  CLI and omits `plan migrate` and `validate --against`.
- **Misplaced sections:** form's "Smart type inference" after the attribute tables; accordion's
  "When the panels are not a FAQ" nested under "Section header"; bg jumps from `##` to `####`.
- **Docs navigation:** advanced topics mixed into Authoring (nav-slug-resolution,
  rich-menubar-panels, entities, entity-routes); `extend/distributing/*` in no nav;
  `docs/migration/v0.14.0.md` linked only from one release page; `extend/index.md` links
  `refrakt contracts` to `/docs/cli/inspect`; a themes nav group of one page.
- **Getting started is wrong:** it never says `npm run dev`; its "Installation" step
  (`npm install @refrakt-md/runes @refrakt-md/content @markdoc/markdoc`) contradicts the scaffold
  above it; it points to rune pages "in the sidebar" the docs sidebar does not have.
- **Terminology:** `npx create-refrakt` vs `npm create refrakt`; `--target sveltekit` vs
  `"target": "svelte"`; "Internationalisation" vs "Internationalization"; colour vs color.

### Pages that already work

- **Rune pages:** `include.md` (an early "when to use which" table; errors stated as what the
  author sees), `figure.md` (a short "What it accepts", one idea per preview), `pullquote.md`
  (task-named headings: "How loud it is", "Placement"), `progress.md`, `design/palette.md`,
  `design/swatch.md`, `marketing/testimonial.md`.
- **A device worth reusing:** `marketing/comparison.md`'s "Markdown reinterpretation" table.
- **Docs:** `cli/format.md`, `authoring/entities.md`, `configuration/entity-routes.md`, the
  `mcp/*` pages.

## Decisions

### D1 — a rune page has one shape

In this order, each section only when it has something to say:

1. **The intro** (generated: package, title, description, badges, Install and Source).
2. **One opening paragraph**, and a **"when to use this"** line where the rune has a neighbour a
   reader could mistake it for ("For a full-width opening band, use hero").
3. **"Basic usage"**: the smallest real example, as a preview.
4. **How Markdown is read**, where the rune reinterprets it: a short "Markdown reinterpretation"
   table, as comparison has.
5. **One section per task**, each named for what the reader wants to do ("Add a rating", "Put the
   media beside the text"), each with one preview.
6. **"Attributes"**, always `##`, always the generated table, always after the tasks. On a page
   with child runes the one include renders the family: the parent's table, then each child's
   under its own `###`, from the child→parent mapping the docs checker already keeps
   (`PAGELESS`). A page cannot forget a child, and every family page has the same shape.
7. **"See also"**, when there is something to link.

The template is written down in `extend/` (for whoever adds a rune) and checked where it can be:
`check-rune-docs` already guards the intro; it also guards the attribute heading's level and the
absence of a hand-written table beside the generated one.

### D2 — theme and implementation detail leaves the rune pages

- **Output contract, Output and Output structure** sections are removed. `refrakt inspect` and the
  structure contract state the same structure, generated. The three plan pages whose "Output
  structure" describes what the reader sees (backlog, decision-log, plan-activity) keep that prose
  as "What it shows", minus its theming detail.
- **CSS, custom properties, engine and pipeline internals** are removed, or moved to the
  theme- or rune-authoring handbook where they are worth keeping there.
- **The same in user docs:** adapter "Theme Integration" moves to `extend/`; maintainer sections
  ("Keeping this page honest", "Local-development reference") are removed.
- A rune page may still say *what* a theme can target in one line, when an author needs it ("style
  it through `[data-rune="hero"]`"); it does not list selectors.

### D3 — one attribute table, generated

Every hand-written attribute table, and attribute-by-attribute prose that restates the table, goes.
A section about an attribute explains the *task* and shows it; the table states the value set.
`bar` and `deflist` get the generated table; the orphaned rows on work and spec go.

### D4 — published docs cite nothing a reader cannot open

- **Plan IDs and decision numbers** are removed from `runes/`, `docs/` and `themes/`, at the source
  when the text is generated: the facet contract descriptions in `packages/transform` are rewritten,
  so the generated attribute table carries none.
- **Release history** goes: "before vX", "renamed", "deprecated in", migration steps. A migration
  belongs in its release note; a deprecated value is stated once, plainly, in the attribute's own
  description ("Deprecated: use `align`").
- **A guard** extends `rune-source-plan-ids.test.ts` to `site/content/runes/`, `docs/` and
  `themes/`, and to the generated `_data/*.json`. An ID given as sample data in an example is
  allowed.
- **`extend/` may cite, in one place.** Its readers can open a spec, and a handbook may name the
  decision behind a rule. A page cites plan entities only in a closing `Background:` line of
  links, as the release notes do (`Background: SPEC-080 · ADR-028`); an ID anywhere else on the
  page fails the guard. History narration goes, as elsewhere.

### D5 — examples are live, minimal and real

- **A preview, not a fence**, wherever the rune renders something. A fence stays only for what a
  preview cannot show (configuration, a CLI command, a file the author writes elsewhere).
- **One idea per preview.** Variants that differ in one attribute are one preview with a sentence,
  or a small table, not one preview each.
- **Real content:** no Lorem ipsum, no "This is a note", no copy about the engine. Each plugin uses
  one consistent cast of example content; images come from one source.
- **Bulky example code moves out of the page:** sandbox and mockup examples load their HTML, CSS
  and JS from files under `site/examples/` (`src=`), so the page shows the rune, not the payload.

### D6 — the "Section header" boilerplate is replaced

The 20 copies go. A rune that reads an eyebrow, headline and blurb says so in its "How Markdown is
read" table (D1.4), one row, linking to Page sections.

### D7 — concept guides and fixtures leave the rune catalogue

`surfaces`, `media-guests`, `image-schemes` and `motion` move to a new **Concepts** group in the
docs nav, with redirects. They are the vocabulary the runes share (`prominence`, `elevation`,
`media="cover"`), met on rune pages and looked up in one place. `authoring/page-sections` and
`authoring/tint` join them, which also shortens Authoring. `plan/examples.md` stops being a published page in the section (it can stay
as data the examples read). `plan/cli.md` moves to `docs/cli/` and gains the missing commands.

### D8 — the docs are restructured where they repeat

- **Getting started** is rewritten: scaffold, `cd`, `npm run dev`, edit `index.md`. Manual setup
  moves to its own page.
- **Adapters:** `adapters-overview.md` becomes the shared setup (tokens, behaviors, SEO,
  dependencies); each adapter page keeps install, configuration, a minimal setup and what differs.
- **Theme presets:** one short template (pitch, opt-in snippet, palette, preview, attribution);
  "Composing with tideline" once, in `lumina.md`; the catalog's intro rewritten for someone choosing
  a theme.
- **One home per topic**, the others linking to it: configuration migration (`migration.md`), tint
  (authoring / rune syntax / engine, each linking the others), `metaFields` and friends
  (`blocks-and-layout.md`).
- **Navigation:** an "Advanced" group in docs; theme tools under extend; `extend/distributing/*` in
  the nav or removed; the wrong `contracts` link fixed.
- **Terminology:** one scaffold command, one target name, one spelling (`color`,
  `Internationalization`).

### D9 — a rune's category is stated once, and the nav follows it

A rune's category is written in three places today: the rune nav in `site/content/runes/_layout.md`
(hand-ordered), the page's `category:` frontmatter (which the catalogue groups by), and the rune
definition's `category:` (`packages/runes/src/index.ts` and each plugin's `index.ts`, read by the
editor and tooling). They drift, and the nav is in no order.

- **The page frontmatter is the source.** A test fails when a rune definition's `category`
  differs from its page's.
- **The rune nav is grouped by that category and alphabetical within each group**, by title. A
  plugin's runes stay grouped by plugin, its overview page first, then its runes alphabetically.
- **A test holds the nav to it:** an item in the wrong group, out of order, or a rune page missing
  from the nav fails. `nav auto` lists a page's children but cannot group by a frontmatter field,
  so generating the nav is a follow-up (a `nav` that groups by a field), not part of this spec.

### D10 — the core runes are grouped by what the author is doing

Today's five core categories put card in Content and section in Layout, though card is a section
with a surface (and is becoming a composition over it); include under Code & Data, though it is
reuse; sandbox under Layout; bg and tint under Layout, though they set a background and a scheme;
reveal under Content, beside nothing like it; badge and progress apart, though both show one
value. The core runes regroup into ten:

| Category | Runes |
|---|---|
| Sections & blocks | section, card, mediatext, figure, hint, conversation, deflist, bar, actions, embed |
| Text & inline | link, icon, code, annotate, sidenote, pullquote, textblock |
| Values | badge, progress |
| Arrangement | grid, gallery, juxtapose, showcase, drawer |
| Disclosure | tabs, accordion, details, reveal |
| Backgrounds & color | bg, tint |
| Code | codegroup, compare, diff, snippet, sandbox, diagram |
| Data | data, datatable, chart, budget, form |
| Reuse & references | include, xref, expand, file-ref, collection, relationships, aggregate |
| Site | layout, nav, pagination, toc, breadcrumb, blog |

**Values is for the runes coming.** The specs converting runes to compositions add core
primitives, and the categories were checked against them so they do not regroup again:

- {% ref "SPEC-166" /%}'s value primitives, which read one value from text and emit one element,
  join **Values**: `amount` and `tally` ({% ref "SPEC-162" /%}), `date` (SPEC-166 D4), `color` and
  `font` ({% ref "SPEC-165" /%}). SPEC-166 already counts `badge` and `progress` among its members.
- `crosstab` ({% ref "SPEC-167" /%}) and the `ledger` composition (SPEC-162 D3) join **Data**,
  beside `datatable`, `chart` and `budget`.
- Plugin primitives (`price`, design's `sample`) stay under their plugin.

The nav's "Essentials" group keeps only the catalogue once the concept guides move (D7). **A spec
that adds a core rune names its category**: one of these, or a new one it argues for. A draft spec
adding a core rune states it before it is accepted.

## Not in scope

- **New content.** This spec removes, moves and rewrites; it adds only the "when to use this" lines
  and the "How Markdown is read" tables.
- **The generated intro and attribute partials** (SPEC-187, SPEC-128), apart from the facet
  descriptions they render.
- **Release notes and changesets**, which are history by design.
- **A structure drawer** in the rune intro (the generated contract in a drawer, beside Source): a
  possible follow-up once D2 has removed the hand-written dumps.

## Resolved questions

1. **Concept guides go to a new Concepts group** in the docs nav (D7), not into Authoring, which
   already mixes everyday and advanced topics, and not into the rune catalogue, where they read as
   runes without a tag.
2. **`extend/` cites only in a closing `Background:` line** (D4): one click from the reasoning,
   without IDs through the prose, and with no allowlist to maintain.
3. **The generated table renders a rune's family** (D1.6): the mapping exists, and the generator
   already uses it to decide which page a child's rows land on.

## Proposed work items

Sized to land independently, roughly in this order:

1. **Categories and nav** (D9, D10): the ten categories in page frontmatter and rune
   definitions, the rune nav regrouped and alphabetical, and the tests that hold both. First,
   because it moves every page in the nav.
2. **The rune page template** (D1): written down in `extend/`; the attribute partial renders a
   rune's family; one attribute include per page; `check-rune-docs` extended.
3. **Output and implementation sections** (D2) off the rune pages.
4. **Hand-written attribute tables** (D3), and the orphaned rows.
5. **Plan IDs and history** (D4): the facet descriptions in `packages/transform`, the published
   pages, the guard.
6. **"Section header" → "How Markdown is read"** (D6), with a "when to use this" line on each rune
   that has a neighbour (D1.2).
7. **Examples** (D5): fences to previews, variants folded, real content, sandbox and mockup payloads
   to `site/examples/`.
8. **Concept guides and fixtures** out of the catalogue (D7).
9. **Docs: getting started and adapters** (D8).
10. **Docs: theme presets, one home per topic, navigation, terminology** (D8).
11. **Page-by-page simplification** of the longest pages once the above have landed: sandbox,
    snippet, data, xref, expand, drawer, tint, card, bg, mockup, bento, hero, feature, plan-history,
    backlog.

## References

- {% ref "SPEC-187" /%}: the generated rune intro.
- {% ref "SPEC-128" /%}: the generated attribute tables.
- {% ref "SPEC-192" /%}: the subtraction pass for code, the counterpart of this one for docs.

{% /spec %}
