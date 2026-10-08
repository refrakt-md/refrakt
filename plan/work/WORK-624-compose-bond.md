{% work id="WORK-624" status="ready" priority="high" complexity="moderate" source="SPEC-145,SPEC-147" milestone="v0.40.0" tags="composition,storytelling,registry" %}

# Slice 1 — `bond` as a composed rune

The first composed rune: {% ref "SPEC-145" /%}'s small worked example, the ~17-line
definition that replaces `plugins/storytelling/src/tags/bond.ts`. The slice uses:

- attributes only, plus a single greedy `body` slot;
- Markdoc's `{% if %}` for the arrow;
- `registers.edge` for the cross-page graph;
- no `schema` row.

It ships **beside** the plugin, not in place of it ({% ref "SPEC-147" /%} D1). The
storytelling plugin, its `bond` and its tests stay unchanged. The composed definition lives
with its own fixtures and is exercised through a fixture plugin. It is not swapped into the
shipping `@refrakt-md/storytelling`.

The comparison against the plugin's `bond` is the deliverable, more than the definition.
The registry snapshot from {% ref "WORK-612" /%} is the reference for the edge. The
rendered tree is compared too, and every difference is written down.

## Blocked by

- {% ref "WORK-622" /%}
- {% ref "WORK-623" /%}

## Acceptance Criteria

- [ ] `bond` is defined as a composed rune, with the definition stored as a `.md` file in the format SPEC-145's worked example shows, and fixtures of its own
- [ ] The composed `bond` registers the same edge as the plugin's — same `from`, `to` and `kind` — asserted against the storytelling registry snapshot
- [ ] The composed `bond`'s rendered tree is compared with the plugin's and every difference is recorded in the item's resolution, each with its reason (SPEC-147 D2)
- [ ] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

{% /work %}
