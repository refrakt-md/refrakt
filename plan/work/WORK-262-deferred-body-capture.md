{% work id="WORK-262" status="ready" priority="high" complexity="moderate" source="SPEC-070" tags="runes, transform, collection, content" milestone="v0.16.0" %}

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

{% /work %}
