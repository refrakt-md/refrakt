{% spec id="SPEC-126" status="draft" tags="docs, config, schema, tooling, dx" %}

# Generate the configuration and frontmatter references from their schemas

`docs/configuration/*` and the frontmatter table in `docs/content.md` are
hand-written reference tables. They are the two places in the docs that claim to
enumerate a complete set of fields, and both had drifted — WORK-539 found eight
discrepancies in the config schema alone, five of them fields that existed in
the code and appeared in no reference at all.

This spec turns the *facts* behind those references into a generated,
version-controlled artifact, and leaves the surrounding pages as hand-written
narrative. The dividing line is the point: *prose is written, exhaustiveness is
generated, and the two are linked rather than interleaved.*

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

Six generation mechanisms exist here, and their inconsistency is itself the
finding:

| Mechanism | Output | Drift caught by |
|---|---|---|
| `rune-catalog.md` | `{% collection %}` over `type: rune` pages | Nothing needed — it *is* the data |
| `refrakt reference dump` | `AGENTS.md` | `--check` flag |
| `refrakt contracts` | `contracts/structures.json` | `--check` flag |
| `config-schema.test.ts` | (assertion only) | `npm test` |
| `scripts/generate-changelog.mjs` | `CHANGELOG.md` | Nothing — regenerated inside `version-packages` |
| `scripts/check-rune-docs.mjs` | (assertion only) | `npm test`, via a colocated live-parity test |

**Neither `--check` flag runs in CI.** `.github/workflows/release.yml` runs
`npm run build` and `npm test`, and nothing else. So the two mechanisms with a
drift mode are the two whose drift nobody would notice, while the guards that
actually run are tests.

The last row is the model this spec follows. `check-rune-docs` solves the same
problem class — "frontmatter-driven catalogues drift from code" — as a **repo
script with a colocated test**, not a product command.

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

### A script that emits data, and a page that renders it

```
scripts/generate-config-reference.mjs
  read      packages/transform/refrakt.config.schema.json
  flatten   resolve $ref, fold the sibling `required` array, collapse `oneOf`,
            carry `deprecated` / `default` / `enum`
  group     apply the local grouping map
  write     site/content/_data/config-fields.json     ← committed, diffable
```

The page renders that JSON with `{% data %}` plus a per-row body
({% ref "SPEC-127" /%}), one invocation per group.

So the script produces **data, not prose**. There is no Markdoc renderer, no
do-not-edit banner, and no byte-stability concern about generated wording — only
stable JSON key ordering. The artifact under review in a pull request is the
field data, which is the part that can be wrong; the table markup is not
something a reviewer needs to read.

### A frontmatter schema

Frontmatter has no machine-readable description today, only a TypeScript
interface with an index signature that hides four load-bearing fields. Add
`packages/content/frontmatter.schema.json`, published alongside the other two
(BUG-004 gave us the versioned routes for free), and make `Frontmatter` derive
its documented members from it.

This is worth doing for its own sake, independent of the docs: it gives editors
inline validation and autocomplete for frontmatter in `.md` files, which nothing
provides today. Feeding the reference is the second benefit, not the first.

The index signature stays — arbitrary custom fields are a feature, and runes and
pipeline hooks read them. The schema describes the fields refrakt itself
consumes; it does not close the set.

### Where prose goes

The existing configuration pages stop trying to be exhaustive and become what
they are already better at: `overview` explains the shapes and when you need a
config file; `sites` explains single vs multi-site; `search`, `plan`,
`entity-routes`, and `i18n` are task guides. Each links into the reference for
the full field list rather than restating a subset of it.

`docs/content.md` keeps the narrative on routing and the layout cascade, and
links to the frontmatter reference instead of carrying a table.

## Design decisions

**D1 — A repo script, not a CLI command.** An earlier draft proposed
`refrakt reference config`, then tried to justify it by generalising to
`refrakt reference schema <path>`. That generalisation was false: a JSON Schema
renderer that depends on grouping metadata *we invented* is not generic, it only
sounds generic. Shipping it as a product command would mean supporting an API,
versioning it, documenting it, and implicitly promoting a private convention as
a standard — for a tool whose only real consumer is this repo.

`scripts/generate-changelog.mjs` and `scripts/check-rune-docs.mjs` are the
established shape for exactly this, and the latter solves the same problem
class. Wire it as an npm script beside them.

**D2 — Generate from JSON Schema, not from the TypeScript interfaces.** Both are
viable now that `config-schema.test.ts` ties them together. The schema wins
because it is the artifact designed to carry this: `description`, `enum`,
`default`, `deprecated`, and required-ness are all first-class in it, and it is
already published for editors. Generating from TS would mean re-deriving all of
that from JSDoc.

The consequence is that schema `description` fields become user-facing prose and
should be written as such. Several read like implementation notes today.

**D3 — The guard is a colocated test that checks the committed artifact.** Per
the table above, `--check` flags in this repo do not run; tests do. Follow
`check-rune-docs.test.mjs`, which pairs unit tests of its pure logic with a
*live* check against the real repo. Three tests:

1. **Unit** — `$ref` resolution, `required` folding, `oneOf` collapsing, against
   fixtures.
2. **Live freshness** — regenerate from the real schema in memory and compare to
   the committed `config-fields.json`. Any difference fails.
3. **Keeps the grouping map honest** — every property has a group, every group in
   the map is used. Directly analogous to `check-rune-docs`'s `PAGELESS` test,
   which exists to stop a maintained exception list from rotting.

The failure message must name the command (`Run: npm run docs:config-reference`)
or people bisect their own diff to work out what happened. Determinism is
therefore a correctness requirement, not a nicety: the freshness test is an
equality comparison, so unstable key ordering makes it flap, and a flaky guard
gets disabled.

**Do not auto-regenerate.** A `pretest` hook or a `build` step that rewrites the
file silently means generated output lands in commits nobody looked at, which is
how a wrong description ships. Failing loudly and making a human run one command
keeps the diff in front of someone.

**D4 — The rendering lives in the page, not the generator.** `{% data %}` already
renders a `properties` map: `orient=index` handles the object-of-objects shape,
`columns` selects and renames, `where` filters. Verified against the real schema
— see below. With per-row templates ({% ref "SPEC-127" /%}) the page controls
presentation entirely, and the generator never grows a Markdoc renderer.

This is the one decision that trades something real: a reader browsing the
content tree sees a `{% data %}` invocation rather than the reference text. The
facts remain reviewable in the JSON; only the formatting is live.

**D5 — Mark theme-defaultable fields in the reference, don't hide the overlap.**
The five fields a `ThemeManifest` can also supply need to say so, or the
reference is accurate and misleading at once. The flattening step carries a
`themeDefault` flag on those rows, and the page renders a marker plus one
sentence stating the precedence (site wins, theme is the fallback). The set is a
hand-maintained list of five in the script; `config-schema.test.ts` asserts it
still matches `ThemeManifest`'s properties, so the marker cannot go stale
either.

**D6 — The reference replaces the per-topic field tables; it does not supplement
them.** Two copies of a field list is the thing this spec exists to remove, and
"supplement" is just that with extra steps.

The real objection to replacing was never the tables, it was losing the
*curation*: `sites.md` groups fields into Core / SEO and branding / Content
rendering / Localization, which is genuinely useful and would be destroyed by
emitting 22 fields in schema order. So don't destroy it — see D7.

Concretely, `sites.md` loses its `## SiteConfig fields` section (~115 of its 240
lines) and keeps Single-site, Multi-site, CLI `--site`, and Path resolution —
which is what the page is actually about. `overview.md` loses its "Top-level
sections" table too, and the temptation to keep that one as orientation should
be resisted: five stable-looking rows is exactly the table that was missing
`xrefs` and `fileRoots` until WORK-539.

Worked examples stay and are not duplication. `sites.md`'s multi-site JSON block
sets `baseUrl` per site — that is a field *in use*, not a field list.

**D7 — The grouping map lives beside the script, not in the published schema.**
An earlier draft put `x-group` / `x-groups` / `x-theme-default` on the schema
properties themselves, on the argument that adding a config field should be
single-touch. That argument was tied to D1's product command: if the reader were
a shipped tool, a published convention made sense.

With a private script, its configuration should be private too. The schema stays
**standard-only** — `description`, `deprecated`, `default`, `enum`, `required` —
and the grouping lives in the script:

```js
const GROUPS = [
  ['Core',              ['contentDir', 'theme', 'target']],
  ['Content rendering', ['plugins', 'routeRules', 'entityRoutes', 'search', …]],
  ['SEO and branding',  ['baseUrl', 'siteName', 'logo', 'defaultImage', …]],
  ['Localization',      ['locale', 'strings']],
];
```

The cost is two edits when adding a field instead of one. D3's third test makes
that unforgettable rather than merely conventional: no group, test fails, named
field.

**The `$ref` rule survives from the earlier draft and still matters.** For a
`$ref` property the description comes from the target definition —
`HighlightConfig.description` already carries the whole "use `theme.presets`
instead" paragraph, the most editorial content in the current table, already in
the schema. The same rule covers `sandbox`, `runes`, and `theme` without
relocating any prose.

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
`file-ref preview="drawer"` on each definition heading would let a reader verify
the table against the declaration without leaving the page — provenance for the
"this is generated" claim, using machinery that already exists and is already
configured (`repoUrl` is set on the main site). Left out to keep the first pass
small; revisit once the generator is proven.

If `snippet` is ever pointed at `theme.ts` anyway, pair it with a test asserting
the slice still starts with the expected `export interface` line. That converts
silent-wrong into loud-fail, which is the minimum bar for a line-addressed
reference.

### Why `{% data %}` renders but does not generate

`{% data %}` addresses by *structure*, not line number, so the objection above
does not apply — which is why D4 uses it for rendering. Tested against the real
schema, with no new code:

```markdoc
{% data src="packages/transform/refrakt.config.schema.json"
        root="definitions.SiteConfig.properties"
        orient="index" key-column="Field"
        columns="Field, type as Type, description as Description" /%}
```

renders all 22 `SiteConfig` fields, no warnings. `where` filters on schema
keywords too — `where="deprecated:true"` returned exactly `target`.

It stops at `$ref`:

```
["theme","","Active theme — accepts a package name string…"]
["highlight","",""]
["runes","",""]
```

`highlight` has no `type` or `description` of its own — both live on
`HighlightConfig`. Same for `runes`; `theme`'s type is a `oneOf`. Nor can `data`
reach the sibling `required` array.

**That is the split this spec takes.** The rendering is not the hard part; `data`
already does it. The hard part is decoding JSON Schema semantics, and a rune
that knew those things would no longer be a generic data rune. So the script
decodes and `data` renders — each doing the half it is suited to.

Per-row templates for `data` are specified separately in {% ref "SPEC-127" /%};
this spec depends on them for the body form.

## Acceptance Criteria

- [ ] The configuration types live in a file named for configuration, the dead `types.ts` is gone, and `index.ts` groups them as configuration rather than theme types
- [ ] `scripts/generate-config-reference.mjs` flattens the schema — resolving `$ref` to the target definition, folding `required`, collapsing `oneOf`, carrying `deprecated` / `default` / `enum` — and writes a committed JSON artifact
- [ ] The artifact is byte-stable across runs (deterministic key ordering)
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] A colocated test unit-tests the flattening, checks the committed artifact is fresh, and keeps the grouping map honest
- [ ] The stale-artifact failure message names the command to run
- [ ] The reference page renders the artifact with `{% data %}` per group, in the declared group order
- [ ] The five theme-defaultable fields are marked, with the precedence stated, and a test ties that set to `ThemeManifest`
- [ ] `packages/content/frontmatter.schema.json` exists and describes every frontmatter field refrakt consumes, including `type`, `id`, `created`, and `modified`
- [ ] `Frontmatter` no longer hides consumed fields behind the index signature
- [ ] The frontmatter schema is served at the versioned and unversioned URLs, like the other two
- [ ] The frontmatter reference is generated and rendered the same way
- [ ] The hand-written configuration pages link to the reference instead of restating field lists — `sites.md` loses `## SiteConfig fields`, `overview.md` loses its top-level table, worked examples stay
- [ ] The published schema gains no non-standard keywords

## Approach

Land it in four parts, each independently shippable:

0. **Split `theme.ts`.** Type-only, no runtime change, no external consumers to
   update. Small enough to review in one sitting and worth doing on its own
   merits even if the rest slips.
1. **The script plus the config reference.** Reuses an existing, published
   schema, so it proves the mechanism without introducing a new source of truth.
   Depends on {% ref "SPEC-127" /%} for the rendering half.
2. **The frontmatter schema.** Standalone value (editor validation for
   frontmatter), and it forces the four undeclared fields into the open.
3. **The frontmatter reference, and trimming the prose pages.** Cheap once the
   first two are in.

**The script is the small half of part 1.** Flattening a schema to JSON is
perhaps 80 lines. The bulk of the work is that only 10 of 22 `SiteConfig` fields
carry a `description` today — `contentDir`, `overrides`, `routeRules`, `icons`,
`tints`, `baseUrl`, `siteName`, `defaultImage`, `logo`, and all three
`RunesConfig` fields have none. `sites.md` has good prose for every one of them,
so part 1 is largely *relocating prose from the docs into the schema*. Budget it
that way.

That relocation pays twice: those descriptions are what editors show on hover,
so a user hovering `baseUrl` in VS Code currently gets nothing. Filling them
fixes the reference and the editor experience in the same edit.

## Open questions

- ~~**Should the CLI reference (`docs/cli/reference.md`) follow?**~~ **Answered:
  no** — see {% ref "SPEC-128" /%} D6. Not the same shape and not a larger
  surface: it is one 116-line page about the `refrakt reference` command, 18
  table rows. The blocker is that the CLI has no structured command surface to
  generate *from* — parsing and `--help` text are hand-written per command, so
  this would mean building a command registry first. Its own spec, sharing no
  machinery with either reference generator. The cheap guard, if drift is the
  worry, is asserting documented flags exist in the command's source.
- **Do the existing `--check` flags get wired into CI as part of this?** They
  guard real artifacts and currently guard nothing. Adjacent, not required.

## References

- {% ref "SPEC-127" /%} — per-row templates for `data`; part 1 depends on it
- WORK-539 — closed the schema drift and added `config-schema.test.ts`
- WORK-540 — moved the author-facing pages, creating the `/docs/authoring` home this reference joins
- BUG-004 — the versioned schema routes a frontmatter schema would reuse
- WORK-458 — `theme-tokens.schema.json`, the precedent for a hand-maintained schema with a drift-guard test
- `scripts/check-rune-docs.mjs` — the closest existing analogue: a docs-drift guardrail as a repo script with a colocated live-parity test

{% /spec %}
