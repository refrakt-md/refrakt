{% spec id="SPEC-126" status="draft" tags="docs, config, schema, tooling, dx" %}

# Generate the configuration and frontmatter references from their schemas

`docs/configuration/*` and the frontmatter table in `docs/content.md` are
hand-written reference tables. They are the two places in the docs that claim to
enumerate a complete set of fields, and both had drifted — WORK-539 found eight
discrepancies in the config schema alone, five of them fields that existed in
the code and appeared in no reference at all.

This spec makes those two references **generated artifacts** with a drift test,
and leaves the surrounding pages as hand-written narrative. The dividing line is
the point: *prose is written, exhaustiveness is generated, and the two are
linked rather than interleaved.*

## Problem

A reference table is a copy of something the code already knows. Every copy
drifts, and the drift is silent — nothing fails, a reader just never learns the
field exists.

The concrete evidence, all found by hand during a single audit:

- **`entityRoutes`, `locale`, `strings`, `xrefs`, `fileRoots`** — real config
  fields, absent from the configuration docs entirely. Each was documented only
  inside a developer-facing page (`extend/i18n/*`, `plugin-authoring/pipeline`,
  `rune-authoring/partials`), so a reader in the configuration section could not
  discover them at any depth of reading.
- **`RouteRule.entity` and `sandbox.dir`** — present in the types, absent from
  the JSON Schema, and rejected by it: `additionalProperties: false` made the
  correct spelling an editor error.
- **A top-level `tints`** the schema advertised after the field had been dropped
  from `RefraktConfig` — autocomplete for a value that is silently ignored.
- **`docs/configuration/schema.md` asserted its own completeness** ("every
  site-scoped field") while five were missing.
- **`docs/content.md`'s frontmatter table lists ten fields.** The `Frontmatter`
  interface declares fourteen; `icon`, `tint`, `tint-mode`, and `tint-lock` are
  undocumented. Worse, `type`, `id`, `created`, and `modified` are read by
  `page-entities.ts` and `timestamps.ts` through the interface's
  `[key: string]: unknown` index signature — so they are undeclared *and*
  undocumented. `type` is the field that drives the entire entity registry:
  it is what makes `/runes/rune-catalog` work, and an author cannot learn it
  exists from the page that claims to list frontmatter fields.

WORK-539 fixed the instances and added a schema drift test. It did not fix the
cause: the docs are still a third hand-maintained copy, guarded by nothing.

## The source of truth is not where its name says

Everything above rests on `RefraktConfig` and `SiteConfig` being the thing the
schema and the docs are derived from. They live in
`packages/types/src/theme.ts`, which is not about themes.

The file was created by commit `c3fe915` (v0.25.0), which split a single
`@refrakt-md/types` module into fifteen files in one pass. Two tells that the
placement was mechanical rather than considered: `index.ts` re-exports the whole
batch under one `// Theme system types` comment — which is how `RefraktConfig`
came to be labelled a theme type — and the same commit created
`packages/types/src/types.ts` as a zero-line file, still empty and still
unreferenced today.

The file holds two unrelated concerns:

| Project / site configuration | Theme system |
|---|---|
| `RefraktConfig`, `SiteConfig`, `PlanConfig`, `XrefPattern`, `EntityRoute`, `RouteRule` | `SiteThemeConfig`, `ThemeManifest`, `LayoutDefinition`, `ComponentDefinition`, `getThemePackage` |

The only bridge is one field, `SiteConfig.theme: string | SiteThemeConfig`.
Everything got filed under the referenced type rather than the referencing one.

This matters here because this spec's whole claim is *"the docs are generated
from the schema, and the schema is drift-tested against the types."* A reader
following that chain lands in a file whose name says it is about something else.

### A second declaration of the same fields

While checking the above: `ThemeManifest` **also** declares `siteName`,
`baseUrl`, `defaultImage`, `logo`, and `routeRules` — the same five fields as
`SiteConfig`. The precedence is real but is written down in exactly one place, a
scaffold template:

```ts
// packages/create-refrakt/template-html/build.ts:115
routeRules: site.routeRules ?? manifest.routeRules ?? [],
```

Site config wins; the theme manifest is the fallback. A generated reference
derived from `refrakt.config.schema.json` alone would describe
`SiteConfig.baseUrl` and say nothing about a theme being able to supply it —
accurate and still misleading. The reference has to say which wins.

## What the repo already does

Four generation patterns exist here, and their inconsistency is itself the
finding:

| Mechanism | Output | Drift caught by |
|---|---|---|
| `rune-catalog.md` | `{% collection %}` over `type: rune` pages | Nothing needed — it *is* the data |
| `refrakt reference dump` | `AGENTS.md` | `--check` flag |
| `refrakt contracts` | `contracts/structures.json` | `--check` flag |
| `config-schema.test.ts` | (assertion only) | `npm test` |

**Neither `--check` flag runs in CI.** `.github/workflows/release.yml` runs
`npm run build` and `npm test`, and nothing else. So the two mechanisms that
have a drift mode are the two whose drift nobody would notice, while the guard
that actually runs is the one added most recently as a test.

That settles the enforcement question below: a drift guard belongs in `npm test`,
not behind a CLI flag that no automation invokes.

## Proposal

### Give the config types an honestly-named home

Split `packages/types/src/theme.ts` into `config.ts` (the six configuration
types) and `theme.ts` (the five theme-system ones), delete the dead
`types.ts`, and replace the single `// Theme system types` block in `index.ts`
with two groups that say what they are.

This is a type-only move with no runtime change, and it is cheap: **nothing
outside `@refrakt-md/types` deep-imports `theme.ts`.** Every consumer goes
through the package index, so the re-exports keep them working untouched. The
only in-repo references to the path are `config-schema.test.ts` (which reads the
source to extract interface members) and some `codegroup` test fixtures.

Do this **first**, before the generator. The generator's whole value is that a
reader can follow the chain from a rendered table back to the declaration; that
chain should not pass through a misnamed file.

### Generated reference pages

Add a generator that renders a Markdoc reference page from a JSON Schema, and
commit its output into the content tree:

- `site/content/docs/configuration/reference.md` — every top-level and
  site-scoped field, from `refrakt.config.schema.json`.
- `site/content/docs/authoring/frontmatter.md` — every frontmatter field.

Both carry the `<!-- Generated by … — do not edit by hand. -->` banner
`renderReferenceMarkdown` already establishes.

### A frontmatter schema

Frontmatter has no machine-readable description today, only a TypeScript
interface with an index signature that hides four load-bearing fields. Add
`packages/content/frontmatter.schema.json`, published alongside the other two
(SPEC/BUG-004 gave us the versioned routes for free), and make `Frontmatter`
derive its documented members from it.

This is worth doing for its own sake, independent of the docs: it gives editors
inline validation and autocomplete for frontmatter in `.md` files, which nothing
provides today. Generating the reference from it is the second benefit, not the
first.

The index signature stays — arbitrary custom fields are a feature, and runes and
pipeline hooks read them. The schema describes the fields refrakt itself
consumes; it does not close the set.

### Where prose goes

The existing configuration pages stop trying to be exhaustive and become what
they are already better at: `overview` explains the shapes and when you need a
config file; `sites` explains single vs multi-site; `search`, `plan`,
`entity-routes`, and `i18n` are task guides. Each links into the generated
reference for the full field list rather than restating a subset of it.

`docs/content.md` keeps the narrative on routing and the layout cascade, and
links to the generated frontmatter reference instead of carrying a table.

## Design decisions

**D1 — Generate committed files, not a build-time rune.** A
`{% config-reference %}` rune reading the schema at build time would never be
stale, but it would be a rune with exactly one consumer, contradicting the
project's own "runes almost always belong in a plugin" rule, and its output
would be invisible in review. Committed Markdoc is greppable, diffs
meaningfully when a field changes, and is indexed by Pagefind. It matches
`AGENTS.md` and `contracts/structures.json`.

**D2 — Generate from JSON Schema, not from the TypeScript interfaces.** Both are
viable now that `config-schema.test.ts` ties them together. The schema wins
because it is the artifact designed to carry this: `description`, `enum`,
`default`, `deprecated`, and required-ness are all first-class in it, and it is
already published for editors. Generating from TS would mean re-deriving all of
that from JSDoc.

The consequence is that schema `description` fields become user-facing prose and
should be written as such. Several read like implementation notes today.

**D3 — The drift guard is a test, not a CLI flag.** Per the table above, `--check`
flags in this repo do not run. The generator gets a `--check` mode for local use
and a vitest test that regenerates in memory and compares against the committed
file, so `npm test` fails on a stale reference. This is the same shape as
`config-schema.test.ts`, which is the only drift guard here with a track record.

**D4 — Render with tables, not `{% symbol %}`.** `symbol` is built for code
constructs — functions, classes, enums — and a config field list is a different
shape. Plain tables grouped by schema definition, with `{% deflist %}` for
nested objects, keep the generator simple and the output diff-readable. Revisit
if the reference outgrows it.

**D5 — Mark theme-defaultable fields in the reference, don't hide the overlap.**
The five fields a `ThemeManifest` can also supply need to say so, or the
reference is accurate and misleading at once. Cheapest honest option: a column
or marker on those rows plus one sentence stating the precedence
(`site` wins, theme is the fallback). Deriving the set automatically would mean
teaching the generator about a second schema that does not exist yet, so start
with a hand-maintained list in the generator — five entries — and let
`config-schema.test.ts` assert it still matches `ThemeManifest`'s properties, so
the marker cannot silently go stale either.

**D6 — The generated reference replaces the per-topic field tables; it does not
supplement them.** Two copies of a field list is the thing this spec exists to
remove, and "supplement" is just that with extra steps.

The real objection to replacing was never the tables, it was losing the
*curation*: `sites.md` groups fields into Core / SEO and branding / Content
rendering / Localization, which is genuinely useful and would be destroyed by a
generator emitting 22 fields in schema order. So don't destroy it — see D7.

Concretely, `sites.md` loses its `## SiteConfig fields` section (~115 of its 240
lines) and keeps Single-site, Multi-site, CLI `--site`, and Path resolution —
which is what the page is actually about. `overview.md` loses its "Top-level
sections" table too, and the temptation to keep that one as orientation should
be resisted: five stable-looking rows is exactly the table that was missing
`xrefs` and `fileRoots` until WORK-539.

Worked examples stay and are not duplication. `sites.md`'s multi-site JSON block
sets `baseUrl` per site — that is a field *in use*, not a field list.

**D7 — The grouping is data, carried in the schema.** Add `x-group` to each
property and an ordered `x-groups` array at the schema root. The generator emits
one section per group, in that order; the drift test requires every property to
declare a group and every group to appear in `x-groups`, so a new field cannot
land ungrouped.

```jsonc
{
  "x-groups": ["Core", "Content rendering", "SEO and branding", "Localization", "Legacy"],
  "definitions": {
    "SiteConfig": {
      "properties": {
        "baseUrl": {
          "type": "string",
          "description": "Public base URL of the site. Used for canonical links, `og:url`, and `og:image.`",
          "x-group": "SEO and branding",
          "x-theme-default": true
        }
      }
    }
  }
}
```

Verified: ajv compiles and validates identically with these present (`strict:
false` is already how `config-schema.test.ts` configures it), and unknown
keywords are ignored by JSON Schema consumers by definition, so editors are
unaffected.

**For a `$ref` property, the description comes from the target definition.**
That matters more than it sounds: `HighlightConfig.description` already carries
the whole "use `theme.presets` instead" paragraph — the most editorial content
in the current table, already in the schema. The same rule covers `sandbox`,
`runes`, and `theme` without relocating any prose.

The cost is that `x-group`, `x-groups`, and `x-theme-default` are documentation
concerns living in an artifact editors download. The alternative — a grouping
map beside the generator, with the same drift test — works equally well and
keeps the published schema clean. `x-group` wins on one practical point: adding
a config field stays **single-touch** (property, description, group, one place),
where a separate map is a second list to remember, which is the failure mode
this spec exists to remove.

## Considered and deferred: embedding the source directly

The obvious cheaper idea is to skip generation and have the docs reference the
declarations directly — `{% snippet %}` to embed `SiteConfig`, or
`{% file-ref preview="drawer" %}` to hoist it into a side panel. Recorded here
because it will come up again.

**As a replacement for generation, it does not work.** `snippet` and `file-ref`
both address content by **line range only** — there is no symbol or marker
extraction. `SiteConfig` begins at line 74 today; add a field to `EntityRoute`
above it and every range shifts, and the failure is *silent and wrong* rather
than broken: the page renders `PlanConfig`'s body under a `SiteConfig` heading,
looking entirely authoritative. That is worse than the drift being fixed here,
which at least fails loudly in a test. (`codegroup`'s per-fence `source=` is not
a candidate at all — it only derives the tab label; the fence body stays
hand-written.)

It is also the wrong artifact for the reader. `refrakt.config.json` is edited by
people who never open the TypeScript; handing them `?:` syntax and
cross-package type references because it is technically the truth is the same
mistake WORK-540 corrected on the pipeline page.

**As an addition it is genuinely good, and is deferred rather than rejected.**
`file-ref preview="drawer"` on each generated definition heading would let a
reader verify the table against the declaration without leaving the page —
provenance for the "this is generated" claim, using machinery that already
exists and is already configured (`repoUrl` is set on the main site). Left out
of this spec to keep the first pass small; revisit once the generator is
proven.

If `snippet` is ever pointed at `theme.ts` anyway, pair it with a test asserting
the slice still starts with the expected `export interface` line. That converts
silent-wrong into loud-fail, which is the minimum bar for a line-addressed
reference.

## Acceptance Criteria

- [ ] The configuration types live in a file named for configuration, the dead `types.ts` is gone, and `index.ts` groups them as configuration rather than theme types
- [ ] A generator renders a Markdoc reference page from a JSON Schema, including nested definitions, enums, defaults, required-ness, and deprecation
- [ ] The reference marks the five fields a theme manifest can also supply, and states which wins
- [ ] A test asserts that marked set still matches `ThemeManifest`, so it cannot go stale
- [ ] `docs/configuration/reference.md` is generated and covers every top-level and site-scoped field
- [ ] `packages/content/frontmatter.schema.json` exists and describes every frontmatter field refrakt consumes, including `type`, `id`, `created`, and `modified`
- [ ] `Frontmatter` no longer hides consumed fields behind the index signature
- [ ] `docs/authoring/frontmatter.md` is generated from that schema
- [ ] A test regenerates both pages in memory and fails if the committed copies are stale
- [ ] The frontmatter schema is served at the versioned and unversioned URLs, like the other two
- [ ] The hand-written configuration pages link to the reference instead of restating field lists — `sites.md` loses `## SiteConfig fields`, `overview.md` loses its top-level table, worked examples stay
- [ ] Every property declares an `x-group` that appears in the root `x-groups`, enforced by the drift test
- [ ] The generated reference renders grouped sections in `x-groups` order, and resolves `$ref` property descriptions from the target definition
- [ ] Generated pages carry the do-not-edit banner and are byte-stable across runs

## Approach

Land it in four parts, each independently shippable:

0. **Split `theme.ts`.** Type-only, no runtime change, no external consumers to
   update. Small enough to review in one sitting and worth doing on its own
   merits even if the rest slips.
1. **The generator plus the config reference.** Reuses an existing, published
   schema, so it proves the mechanism without introducing a new source of truth.
2. **The frontmatter schema.** Standalone value (editor validation for
   frontmatter), and it forces the four undeclared fields into the open.
3. **The frontmatter reference, and trimming the prose pages.** Cheap once the
   first two are in.

**The generator is the small half of part 1.** Rendering a schema as tables is
perhaps 150 lines. The bulk of the work is that only 10 of 22 `SiteConfig`
fields carry a `description` today — `contentDir`, `overrides`, `routeRules`,
`icons`, `tints`, `baseUrl`, `siteName`, `defaultImage`, `logo`, and all three
`RunesConfig` fields have none. `sites.md` has good prose for every one of them,
so part 1 is largely *relocating prose from the docs into the schema*. Budget it
that way.

That relocation pays twice: those descriptions are what editors show on hover,
so a user hovering `baseUrl` in VS Code currently gets nothing. Filling them
fixes the reference and the editor experience in the same edit.

Byte-stability matters more than it looks: a generator whose output reorders
between runs makes the drift test fail spuriously and trains people to
regenerate without reading the diff. Sort deterministically and pin the property
order to the schema's own.

## Open questions

- **Should the CLI reference (`docs/cli/reference.md`) follow?** Same problem,
  same shape, larger surface. Out of scope here; worth a follow-up once the
  mechanism is proven.
- **Do the existing `--check` flags get wired into CI as part of this?** They
  guard real artifacts and currently guard nothing. Adjacent, not required.

## References

- WORK-539 — closed the schema drift and added `config-schema.test.ts`
- WORK-540 — moved the author-facing pages, creating the `/docs/authoring` home this reference joins
- BUG-004 — the versioned schema routes a frontmatter schema would reuse
- WORK-458 — `theme-tokens.schema.json`, the precedent for a hand-maintained schema with a drift-guard test

{% /spec %}
