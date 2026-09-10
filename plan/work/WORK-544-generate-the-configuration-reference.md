{% work id="WORK-544" status="done" priority="high" complexity="moderate" source="SPEC-126" milestone="v0.33.0" tags="config,schema,docs,tooling" %}

# Generate the configuration reference

A repo script flattens `refrakt.config.schema.json` into a committed JSON
artifact; a docs page renders it with `{% data %}`. The configuration pages stop
carrying hand-written field tables.

```
scripts/generate-config-reference.mjs
  read      packages/transform/refrakt.config.schema.json
  flatten   resolve $ref, fold the sibling `required` array, collapse `oneOf`,
            carry `deprecated` / `default` / `enum`
  group     apply the local grouping map
  write     site/content/_data/config-fields.json     ← committed, diffable
```

## Acceptance Criteria
- [x] The script emits a byte-stable JSON artifact (deterministic key ordering)
- [x] `$ref` properties take their type and description from the target definition
- [x] `required` is folded into per-row flags; `oneOf` collapses to a readable type
- [x] An npm script runs it, beside the existing `runes:*` scripts
- [x] A colocated test unit-tests the flattening, checks the committed artifact is fresh, and asserts every property has a group and every group is used
- [x] The stale-artifact failure message names the command to run
- [x] `docs/configuration/reference.md` renders the artifact per group, in the declared group order
- [x] The five theme-defaultable fields are marked with the precedence stated, and a test ties that set to `ThemeManifest`
- [x] The published schema gains no non-standard keywords

## Approach

**The script emits data, not prose.** No Markdoc renderer, no do-not-edit
banner, no byte-stability concern about generated wording — only stable key
ordering. The artifact under review in a pull request is the field data, which
is the part that can be wrong.

**The grouping map lives beside the script**, not in the published schema.
Private tooling, private configuration; the schema stays standard-only. Costs a
second edit when adding a field, which the third test makes unforgettable.

**Follow `scripts/check-rune-docs.mjs`** for the guard — unit tests of the pure
logic plus a live check against the real repo. That is the only drift-guard
shape in this repo with a track record; the two `--check` flags do not run in
CI, and `npm test` does.

**Do not auto-regenerate.** A `pretest` hook or a build step that rewrites the
file silently puts generated output into commits nobody looked at. Fail loudly
and make a human run one command.

Determinism is a correctness requirement, not a nicety: the freshness test is an
equality comparison, so unstable ordering makes it flap, and a flaky guard gets
disabled.

## Blocked by

- {% ref "WORK-543" /%} — the page needs the `data` body to render rows
- {% ref "WORK-542" /%} — a reference generated from description-less fields is a table of blanks

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`scripts/generate-config-reference.mjs`** — flattens the schema into
`site/content/_data/config-fields.json`: `$ref` resolved to its target's type
and description, `required` folded into per-row flags, `oneOf` collapsed to a
readable union, `default` / `deprecated` / theme-defaultable carried through.
The grouping map lives beside the script, so the published schema gains no
non-standard keywords.

**`scripts/generate-config-reference.test.mjs`** — 16 tests in the
`check-rune-docs.mjs` shape: unit tests over the flattening, then live checks
(every field grouped, no stale group entry, every group used, no field without
a description, deterministic render, artifact fresh).

**`site/content/docs/configuration/reference.md`** — renders the artifact per
group. 22 fields, each with its own anchor.

**`packages/transform/refrakt.config.schema.json`** — descriptions added to the
`SiteConfig`, `RouteRule` and `RunesConfig` definitions, so `$ref` properties
inherit prose rather than an empty string.

**`packages/runes/src/data-pipeline.ts`** — booleans bind as booleans in a
per-row body.

### Notes

- The group guard paid for itself on first run: four fields I had grouped from
  memory (`collection`, `fileRoots`, `xrefs`, `plan`) are top-level, not
  `SiteConfig` fields, and it named all four.
- The `ThemeManifest` test found that `target` is declared on both sides, not
  just the five fields SPEC-126 named. It is deprecated and documentation-only
  on both (ADR-024), so there is no precedence to state; the test compares live
  fields and records why.
- **Three things went wrong that only a real build would show**, which is why
  this was verified against `site/build` rather than tests alone:
  1. `where="group:Content and theme"` matched nothing — the shared field-match
     grammar splits clauses on whitespace, so groups needed slugs.
  2. Every heading rendered `id="rowname"`. The cause was my page, not the
     code: `` ### `{% $row.name %}` `` puts the variable inside inline code,
     where Markdoc does not interpolate. Now documented on `/runes/data` as an
     authoring trap, since nothing warns.
  3. `{% if $row.required %}` rendered for every row — a JSON `false` became
     the truthy string `"false"`.
- Full suite 4291 passing; link check clean; the built page has 22 unique field
  anchors and exactly two required markers.

{% /work %}
