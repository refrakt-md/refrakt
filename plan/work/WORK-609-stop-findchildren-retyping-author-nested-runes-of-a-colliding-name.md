{% work id="WORK-609" status="done" priority="high" complexity="moderate" source="SPEC-146" milestone="v0.39.0" tags="runes,schema,seo,correctness" pr="refrakt-md/refrakt#661" %}

# Stop `findChildren` retyping author-nested runes of a colliding name

{% ref "SPEC-146" /%} Problem 1, the present-tense half. `findChildren`
(`packages/runes/src/lib/schema-table.ts`) matches a schema `children` key against
`data-rune` as well as `data-name` / `data-field`, descends the whole subtree and
applies every match. So `playlist`'s `children: { track }` retypes an author's own
`{% track %}` nested in an unrelated container as one of the playlist's tracks, and
because the child row is applied with the author's node as root, the row's own
`properties` resolve inside it. The SPEC records the result in the **JSON-LD graph**,
not only in RDFa: an unrelated recording published as a track.

The colliding rows are a closed set: `playlist`'s `musicRow`/`spokenRow` and
`breadcrumb`'s `breadcrumb-item` carry their own `properties` and reach the graph;
`recipe`/`howto` (`step`), `pricing` (`tier`), `timeline` and `accordion` carry
`text`/`generated` only and mis-stamp RDFa.

## Approach

Introduce the ownership marker of SPEC-146 D1/D2: whatever places a node on a
rune's behalf stamps `data-owner="<rune>"`. `findChildren` keeps crossing
boundaries (that is its job) but rejects a match that is owner-marked for another
rune, or unmarked where the row's rune places its children itself. The marker is
pipeline bookkeeping and is stripped before render (D4). Confirm first that nothing
in the editor reads it; SPEC-145 D11 says editability follows `location.file`.

Write the probes **before** the fix, so the tests demonstrate the defect and then
its removal.

This item introduces the marker; {% ref "WORK-610" /%} is the other resolver's use
of it.

## Acceptance Criteria

- [x] A probe reproducing Problem 1 exists as a test before the fix, asserting the wrong `typeof` / `property` on an author-nested rune of a colliding name
- [x] The JSON-LD path is a regression test, not an open question: a playlist with an author-nested `{% track %}` publishes exactly one track, asserted on the graph rather than on the markup
- [x] `breadcrumb`'s `breadcrumb-item` row is covered by the same assertion shape
- [x] `findChildren` rejects a match marked for another rune, and still matches a rune's own content-model children
- [x] `howto`/`step`, `recipe`/`step`, `pricing`/`tier` and `playlist`/`track` each keep resolving their own children, asserted per rune
- [x] The baseline diff from this fix is reviewed and explained in the resolution rather than regenerated silently (SPEC-146 D3) — including any movement in the `jsonLd` harvest, not only `rendered`
- [x] The marker is absent from rendered output (D4), and nothing in the editor or engine reads it
- [x] `refrakt contracts --check` reports no drift on either contract copy
- [x] The schema-table authoring documentation states that a `children` key naming a rune matches only that rune's own children, so the collision cannot be reintroduced by a new row

## References

- {% ref "SPEC-146" /%} — Problem 1, D1–D4
- {% ref "SPEC-130" /%} — the schema table, its applier and the record-defects-too baseline
- {% ref "ADR-008" /%} — the flat per-rune namespace

## Resolution

Completed: 2026-10-07

Branch: `claude/post-v0.38-roadmap-jb7pie`

### What was done
- `packages/runes/src/lib/schema-table.ts`: `findChildren` now crosses another rune's boundary only in foreign mode, where just nodes marked `data-owner="<this rune>"` count; a matched child is a boundary too. New `isMine`, `OWNER_ATTR` (`data-owner`) and `releaseOwnedNodes`.
- `packages/runes/src/lib/index.ts`: the schema wrapper calls `releaseOwnedNodes` after the table is applied, for every rune, table or not (D4).
- `contracts/seo-baseline/fixtures/`: three edge-case fixtures — `playlist.foreign-track`, `recipe.foreign-steps`, `pricing.foreign-tier` — recorded pre-fix in their own commit (`83e86f6`) so the fix commit's baseline diff is the evidence.
- Tests: 9 in `packages/runes/test/schema-table.test.ts` (6 fail against the pre-fix resolver); per-rune tests in the media, learning and marketing `seo.test.ts` files.
- `site/content/extend/plugin-authoring/authoring.md`: section on how a `children` key matches.
- Changeset: `@refrakt-md/runes` patch.

### Baseline diff, reviewed (D3)
Exactly the three new fixtures move; the other 48 are byte-identical.
- `playlist.foreign-track`: before, the `{% track %}` in the `{% hint %}` was the album's third `track` (`name: "Echoes"`). After, the album lists its two own tracks and Echoes is a separate top-level `MusicRecording`.
- `recipe.foreign-steps`: before, `recipeInstructions` held four `HowToStep`s, two of them from the author's `{% steps %}` in a tip. After, the recipe's own two. The `rendered` harvest drops the two stray `HowToStep` annotations the same way.
- `pricing.foreign-tier`: before, Enterprise was nested as an `offers` of the Pro offer. After, the product offers Pro alone and Enterprise is a separate top-level `Offer`.
Structure contracts: no drift on either copy.

### Notes
- Corrects SPEC-146's measurement: recipe and pricing reach the JSON-LD graph, not only RDFa. `howto` is unreachable because its transform discards nested runes before the table runs; the howto test pins its own steps only.
- The cross-plugin recipe case (`{% steps %}` is a marketing rune) is covered by the baseline fixture rather than a learning test, which cannot load marketing.
- Nothing sets `data-owner` yet; `findAllByName`'s use of it is WORK-610.
- `releaseOwnedNodes` walks each rune's subtree once; no measurable cost in the full suite.

{% /work %}
