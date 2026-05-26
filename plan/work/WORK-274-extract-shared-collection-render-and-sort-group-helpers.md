{% work id="WORK-274" status="ready" priority="high" complexity="moderate" source="SPEC-072" tags="collection,refactor,runes" milestone="v0.16.0" %}

# Extract shared collection render and sort/group helpers

Pull the reusable pieces of `packages/runes/src/collection-resolve.ts` — the built-in item renderer, grouping, sorting, and the deferred-body reparse — into a shared module so both `collection` and the new `relationships` rune (WORK-278) consume one implementation. This is a pure refactor that unblocks WORK-276 (ordering) and WORK-278 (relationships) and lets them build on a common surface instead of stepping on each other.

## Acceptance Criteria
- [ ] The built-in item renderer, `groupEntities`, `sortEntities`, and the deferred-body reparse are exported from a shared module (not private to `collection-resolve.ts`).
- [ ] `collection` resolution is rewritten in terms of the shared module with no behavior change.
- [ ] The module exposes a seam for a caller-supplied source set (entities for `collection`, resolved edges for `relationships`) and an optional extra binding (`$kind`) so WORK-278 can reuse it without forking.
- [ ] Existing collection tests pass unchanged; CSS-coverage unaffected.

## Approach
Identify the slice of `collection-resolve.ts` that is source-agnostic (everything after "we have an ordered list of entities"): built-in list/grid/table item rendering, grouping wrapper, sort, and the per-item deferred-body transform that binds `$item`. Move these into a shared helper module under `packages/runes/src/`. Keep `collection`'s query/selection (type + field-match filter) in `collection-resolve.ts` and have it call the shared helpers. Leave sort/group *call sites* in place — WORK-276 will swap their internals for the ordering lookup — but ensure the functions are the shared ones so the change lands once.

## Dependencies
None — this is the enabling refactor and should land first.

## References
- {% ref "SPEC-072" /%} — "Implementation" notes under the relationships rune.

{% /work %}
