{% work id="WORK-609" status="ready" priority="high" complexity="moderate" source="SPEC-146" milestone="v0.39.0" tags="runes,schema,seo,correctness" %}

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

- [ ] A probe reproducing Problem 1 exists as a test before the fix, asserting the wrong `typeof` / `property` on an author-nested rune of a colliding name
- [ ] The JSON-LD path is a regression test, not an open question: a playlist with an author-nested `{% track %}` publishes exactly one track, asserted on the graph rather than on the markup
- [ ] `breadcrumb`'s `breadcrumb-item` row is covered by the same assertion shape
- [ ] `findChildren` rejects a match marked for another rune, and still matches a rune's own content-model children
- [ ] `howto`/`step`, `recipe`/`step`, `pricing`/`tier` and `playlist`/`track` each keep resolving their own children, asserted per rune
- [ ] The baseline diff from this fix is reviewed and explained in the resolution rather than regenerated silently (SPEC-146 D3) — including any movement in the `jsonLd` harvest, not only `rendered`
- [ ] The marker is absent from rendered output (D4), and nothing in the editor or engine reads it
- [ ] `refrakt contracts --check` reports no drift on either contract copy
- [ ] The schema-table authoring documentation states that a `children` key naming a rune matches only that rune's own children, so the collision cannot be reintroduced by a new row

## References

- {% ref "SPEC-146" /%} — Problem 1, D1–D4
- {% ref "SPEC-130" /%} — the schema table, its applier and the record-defects-too baseline
- {% ref "ADR-008" /%} — the flat per-rune namespace

{% /work %}
