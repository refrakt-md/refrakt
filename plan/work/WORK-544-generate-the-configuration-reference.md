{% work id="WORK-544" status="ready" priority="high" complexity="moderate" source="SPEC-126" milestone="v0.33.0" tags="config,schema,docs,tooling" %}

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
- [ ] The script emits a byte-stable JSON artifact (deterministic key ordering)
- [ ] `$ref` properties take their type and description from the target definition
- [ ] `required` is folded into per-row flags; `oneOf` collapses to a readable type
- [ ] An npm script runs it, beside the existing `runes:*` scripts
- [ ] A colocated test unit-tests the flattening, checks the committed artifact is fresh, and asserts every property has a group and every group is used
- [ ] The stale-artifact failure message names the command to run
- [ ] `docs/configuration/reference.md` renders the artifact per group, in the declared group order
- [ ] The five theme-defaultable fields are marked with the precedence stated, and a test ties that set to `ThemeManifest`
- [ ] The published schema gains no non-standard keywords

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

{% /work %}
