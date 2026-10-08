{% work id="WORK-621" status="done" priority="high" complexity="moderate" source="SPEC-145" milestone="v0.40.0" tags="runes,schema,composition,seo" pr="refrakt-md/refrakt#680" %}

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

- [x] `data-owner` and `data-slot` are declared once at config assembly on every node and tag schema, not per rune, and a placed node keeps both through the primitive's transform (D10a)
- [x] The resolvers admit a node past a boundary by `data-owner` plus `data-slot`, and a primitive's own `data-name` on the same node is left untouched (D10a)
- [x] A survival test runs a marked node through every rune in D12's placement set and fails naming any rune that drops either attribute (D10a)
- [x] `releaseOwnedNodes` strips `data-owner` and leaves `data-slot` in the rendered output
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy — nothing sets the markers yet

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-slot-markers`
PR: refrakt-md/refrakt#680

### What was done
- `packages/runes/src/lib/slot-markers.ts` — `declareSlotMarkers` / `declareSlotMarkersOnNodes`: copy every tag/node schema (Markdoc's fallback nodes included) with `data-owner` and `data-slot` declared; memoised per map; shared exports never mutated.
- `packages/content/src/site.ts` — `assembleMarkdocSchemas()`: the one place core + plugin schemas are assembled, used by both the page transform config and the preprocess hooks' `embedConfig`.
- `packages/runes/src/lib/schema-side-table.ts` — `SchemaSideTable`, which resolves an assembled copy to its origin; the seven schema-keyed side tables (`schemaPreprocessors`, `schemaTables`, `schemaRuneStructures`, `schemaEmits`, `schemaRegisters`, `schemaBasePresets`, registers-source cache) now use it.
- `packages/runes/src/lib/schema-table.ts` — `SLOT_ATTR`; `isSlotted` admits a node by owner + slot in `findAllByName` and `findChildren`; `isMine` splits the namespaces for a node carrying both markers.
- Tests: `packages/runes/test/schema-table.test.ts` (slot resolution, release keeps `data-slot`), `packages/runes/test/slot-markers.test.ts` (declaration, non-mutation, side-table fallback, guard against raw `WeakMap<Schema`), `packages/content/test/slot-marker-survival.test.ts` (D12 set derived from `requiresParent` + schema types; seven node kinds through 92 runes).
- Changeset: minor for `@refrakt-md/runes` and `@refrakt-md/content`.

### Findings
- **SPEC-146 `isMine` vs D10a.** "Extends, not replaces" did not hold as written: `isMine` rejected a node marked for another rune even among the primitive's own nodes, so a primitive could not resolve its own `data-name` on a placed node. Measured: `figure` with an image marked for `character` lost `contentUrl`. Resolved narrowly: a node carrying both markers keeps its `data-name` / `data-field` / `data-rune` in the primitive's namespace, and the owner reaches it only by `data-slot`. A node with `data-owner` alone keeps SPEC-146's behaviour. Inert today; confirm before WORK-622.
- **Schema identity.** Copying schemas at assembly broke every identity-keyed side table (`{% include %}` reached the transform unresolved). Fixed with `SchemaSideTable`.
- **Drops** (kept out of D12's set for that node kind, per D10a step 5, listed in `NOT_YET_PLACEABLE`): `nav` list, `tabs` heading/list, `budget-category` list, `conversation` blockquote, `reveal` heading, `form` paragraph/list/heading/blockquote, `comparison` heading/list, `symbol-group` list, `changelog` heading, `preview` fence. Each rebuilds that kind of node into its own structure.
- `snippet`, `data` and `include` are resolved in preprocess and cannot be probed by a transform; carrying a marker through them is WORK-622's concern.
- D9's "peer" is relational; the derivation treats every non-media type as a peer, which is conservative.

### Notes
- SEO baseline and both contract copies unchanged; `npm test` 5342 passed.

{% /work %}
