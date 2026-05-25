{% work id="WORK-262" status="done" priority="high" complexity="moderate" source="SPEC-070" tags="runes, transform, collection, content" milestone="v0.16.0" %}

# Deferred-body capture for per-entity templates

Implement the `deferBody` mechanism SPEC-070's prototype validated: a catalog flag plus a pre-transform pass in the content loader that captures a rune's pristine body as a source string and empties it, so postProcess can re-parse and transform it per entity with a bound variable. Capture must happen before the page transform — by schema-transform time Markdoc has already resolved the body's `$item` interpolations to `undefined`.

## Acceptance Criteria
- [ ] A `deferBody` flag on a rune's catalog entry marks its body for deferred capture
- [ ] A pre-transform loader pass walks the parsed AST and, for each `deferBody` rune, formats its children to source (`Markdoc.format` on pristine nodes), stashes it on an attribute, and empties the body so the page transform never resolves `$item`
- [ ] postProcess re-parses the stashed source and transforms it per entity with the bound variable; reparse-per-entity is used (reusing captured AST resolves variables to `null`)
- [ ] The mechanism is generic — used by `collection` body templates (WORK-263) and table column cells (WORK-264)
- [ ] Tests confirm independent, correct per-entity output across N entities

## Dependencies
None — foundation. Pairs with WORK-263 (collection) which is the first consumer.

## References

- {% ref "SPEC-070" /%} — Per-item template mechanism (prototype findings)

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- Added `packages/runes/src/deferred-body.ts`: `captureDeferredBodies(ast, isDeferBody)` (pre-transform walk → `Markdoc.format` pristine children → stash on `__deferred-body` → empty body), `readDeferredBody(attrs)`, `transformDeferredTemplate(source, config, variables)` (fresh parse + transform per entity), and the `DEFERRED_BODY_ATTR` constant.
- `createContentModelSchema` gained a `deferBody` option: declares the `__deferred-body` String attribute and marks the produced schema `deferBody: true`.
- Content loader (`packages/content/src/site.ts` `transformContent`) runs the capture pass before `Markdoc.transform`, keyed off `mergedTags[name].deferBody`.
- Tests: `packages/runes/test/deferred-body.test.ts` (4) — confirms capture+empty, that the page transform leaves `$item` unresolved, and independent per-entity output. Full runes suite (604) green.

### Notes
- The stash attribute must NOT be `render:false` — that strips it from `transformAttributes`, so the consuming rune couldn't read it. Important for WORK-263.
- Reparse-per-entity is mandatory (reusing the captured AST resolves variables to null), matching the SPEC-070 prototype.

{% /work %}
