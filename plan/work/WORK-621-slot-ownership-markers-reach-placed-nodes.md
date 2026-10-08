{% work id="WORK-621" status="ready" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="runes,schema,composition,seo" %}

# `data-owner` and `data-slot` survive a primitive's transform

{% ref "SPEC-145" /%} D10a, landed ahead of composition so it can be proved inert.

Markdoc keeps only the attributes a node's schema declares. A marker set on a node
before a primitive transforms it is therefore dropped, unless every node and tag schema
declares it. Declare `data-owner` and `data-slot` **once, at config assembly**, on every
node and tag schema, never per rune. Teach the schema-table resolvers
(`packages/runes/src/lib/schema-table.ts`) to admit a node past a boundary by
`data-owner` plus `data-slot`. A primitive's own `data-name` on the same node is left
alone.

In the output, `releaseOwnedNodes` strips `data-owner` and keeps `data-slot` (D10a
step 4, D10c).

Nothing sets either attribute yet, so the gate is that nothing moves. The survival
test runs the markers through every rune in D12's placement set. That set is
"no peer schema, no `requiresParent`". Any rune that drops either attribute is a
finding, named by the test.

## Acceptance Criteria

- [ ] `data-owner` and `data-slot` are declared once at config assembly on every node and tag schema, not per rune, and a placed node keeps both through the primitive's transform (D10a)
- [ ] The resolvers admit a node past a boundary by `data-owner` plus `data-slot`, and a primitive's own `data-name` on the same node is left untouched (D10a)
- [ ] A survival test runs a marked node through every rune in D12's placement set and fails naming any rune that drops either attribute (D10a)
- [ ] `releaseOwnedNodes` strips `data-owner` and leaves `data-slot` in the rendered output
- [ ] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy — nothing sets the markers yet

{% /work %}
