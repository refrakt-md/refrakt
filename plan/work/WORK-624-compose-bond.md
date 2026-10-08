{% work id="WORK-624" status="done" priority="high" complexity="moderate" source="SPEC-145,SPEC-147" milestone="v0.40.0" tags="composition,storytelling,registry" pr="refrakt-md/refrakt#684" %}

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

- [x] `bond` is defined as a composed rune, with the definition stored as a `.md` file in the format SPEC-145's worked example shows, and fixtures of its own
- [x] The composed `bond` registers the same edge as the plugin's — same `from`, `to` and `kind` — asserted against the storytelling registry snapshot
- [x] The composed `bond`'s rendered tree is compared with the plugin's and every difference is recorded in the item's resolution, each with its reason (SPEC-147 D2)
- [x] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)
- [x] `npm run seo:baseline:check` and `refrakt contracts --check` report no drift on either contract copy

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-composed-bond`
PR: refrakt-md/refrakt#684

### What was done
- `packages/content/test/fixtures/composed-storytelling/runes/bond.md`: the composed `bond` definition, in SPEC-145's format. It places `{% hint %}` and uses `{% if %}` for the arrow and `registers.edge`. It has no `schema`.
- `packages/content/test/fixtures/composed-storytelling/fixtures/bond.{canonical,one-way,defaults}.md`: its own fixtures.
- `packages/content/test/composed-bond.test.ts` (20 tests). It uses a fixture plugin: storytelling as shipped, with `bond` swapped for `{ template }` and the hand-written `Bond` theme entry dropped. It goes through `composedPluginRune` → `mergePlugins` → `loadContent`.
- It is not registered in `@refrakt-md/storytelling` (SPEC-147 D1). `plugins/storytelling/` has no diff.
- Why under `packages/content/test/`:
  - inside `plugins/storytelling/` would break "unchanged";
  - a `plugins/*` sibling would be read as a plugin package by `sync-plugin-versions.mjs`, `plugin-manifests.test.ts` and `imperative-schema-migration.test.ts`.

### Registration
- The composed `bond` reproduces the committed `registry-snapshot.json` exactly, compared as text. That covers every registration, the name index, the cross-links and the warnings.
- Its edges have the same from/to/kind and `bidirectional`, and `getRelated` returns exactly the edges in `bond-relationships.json`.
- A control test finds the plugin's capture and the composed one equal.

### Findings: SPEC-145's worked example does not hold as written
1. `registers.edge.kind: { field: type }` fails construction. SPEC-144 requires `kind.field` to name a key of the edge's data bag (`from`, `to`, `name`, declared `data`). A test pins the error.
2. The example declares no `bidirectional`, so it defaults to `false` and the reverse edges are lost (`getRelated('Aria')` is empty). A test pins this.
3. To match the plugin's bag, the definition declares:
   - `data: [{ bondType: type }, status, bidirectional]`;
   - `kind: { field: bondType }`;
   - `bidirectional: { field: bidirectional }`.

   It also drops the example's `type` default (`fellowship`). The plugin has none: unset registers `bondType: ""` and the kind falls back to `bond`.
4. `provides: [prose]` is added. Without it, `reading` and `dropcap` are no longer accepted. With it, the attribute set equals the plugin's.

The definition is therefore 29 lines, not 17. SPEC-145's text is unchanged; the findings are recorded here and in the PR.

### Rendered-tree differences (SPEC-147 D2), each asserted
**Same in both:** `data-rune="bond"`, `data-status` and `data-density` on the root. The placed `hint`'s HTML equals a hand-written `{% hint %}` with the same content, apart from `data-slot`; `data-field="content-section"` and `marker="**"` are hint's own. No `data-owner` leaks.

1. Root `div` → `aside`: the definition's `tag`, from the example.
2. No `rf-bond*` class (D2/D2a). Lumina's 53-line `bond.css` stops matching; D16 `contextModifiers` is the route back.
3. No `data-bond-type` and no `data-bidirectional`. The generated config makes modifiers of `matches` attributes only; `type` is open and `bidirectional` is boolean.
4. No `data-elevation="flat"`: the plugin's `defaultElevation` has no counterpart in a generated config. The hint brings `sunken`, and an author's `elevation=` on the root would double-paint (D14, open).
5. The `from` / `connector` / `arrow` / `to` `data-name`s are gone, and the endpoints are `<strong>` text. The rune names nothing of its own (D3). The plugin's `editHints` have no counterpart: the definition has no `editHints` key, and the editor half (D11) is deferred.
6. The arrow is a `↔` / `→` glyph in the text (`{% if %}`), not a CSS-drawn empty span.
7. The body's `div[data-name=body][data-section=body]` is gone; its paragraph carries `data-slot="body"` (D10c).
8. A visible "note" label and icon from the hint header. The literal is a D13 case: template text with no keying scheme.
9. `status` is a closed set (`matches` in the example): `status="estranged"` is `attribute-value-invalid` where the plugin accepted it.

### Notes for WORK-625
- Every bag key a `{ field }` names must be declared in `data`, in the snapshot's key order.
- `character`'s entity block has no `{ field }` references, so finding 1 does not recur there. But `tags` is in its `data` and is not a declared attribute in SPEC-145's character example; the snapshot carries `tags: ""`.
- Only enum attributes become modifiers.
- No `refrakt.stale` check applied: no documented source file was changed.

{% /work %}
