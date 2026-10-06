{% work id="WORK-610" status="ready" priority="medium" complexity="simple" source="SPEC-146" milestone="v0.39.0" tags="runes,schema,seo,composition" %}

# Let `findAllByName` resolve owner-marked nodes across a rune boundary

{% ref "SPEC-146" /%} Problem 2. `findAllByName` stops dead at any nested
`data-rune`, which is right for every rune today and wrong the moment content is
placed inside a primitive on another rune's behalf ({% ref "SPEC-145" /%}). Only
**node-sourced** values are affected: `properties` from a node, `text`, and the node
half of `entities`. Attribute-sourced values resolve through the field bag and are
untouched by nesting.

## Approach

Replace the hard stop with SPEC-146's *foreign mode*: past another rune's boundary
keep descending, but admit only nodes carrying `data-owner` equal to the resolving
rune. The marker comes from {% ref "WORK-609" /%}.

This change is meant to be **inert**: no rune places content across a boundary yet,
so the foreign branch finds nothing and output must not move (D5). The baseline
check is the proof.

## Acceptance Criteria

- [ ] `findAllByName` crosses a nested-rune boundary in foreign mode, admitting only nodes marked for the resolving rune
- [ ] The node-sourced scope of Problem 2 is asserted by a test pair: one table over a composed and a declared tree, where the attribute-sourced property resolves in both and the node-sourced one resolves only after the fix
- [ ] A composed entity whose schema values are all attributes publishes correctly *before* this change, asserted so the narrower scope cannot be lost
- [ ] Multiplicity is preserved: a node-sourced property carrying a set (`recipe`'s `ingredient` shape, {% ref "SPEC-154" /%}) resolves every member across the boundary
- [ ] The `character` / `character-section` name collision the guard was added for remains suppressed, asserted by a test naming that history
- [ ] `npm run seo:baseline:check` shows zero diff attributable to this change
- [ ] `refrakt contracts --check` reports no drift on either contract copy

## Blocked by

- {% ref "WORK-609" /%}

## References

- {% ref "SPEC-146" /%} — Problem 2, the mechanism, D5
- {% ref "SPEC-145" /%} — the consumer this unblocks

{% /work %}
