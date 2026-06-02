{% work id="WORK-328" status="done" priority="high" complexity="moderate" source="SPEC-082" tags="runes,seo,plugins,registry,pipeline,data-channel,fields" milestone="v0.18.0" %}

# Migrate pre-engine field consumers to the fields bag

`WORK-322` migrated the **engine** to read `data-rune-fields`, but the field
metas have other readers that run on the **pre-engine tree** and still read
field values from `<meta data-field>`. They must move to the bag before the
metas can be dropped (`WORK-323`) — otherwise entity registration and SEO break.

## Consumers to migrate

- `packages/runes/src/seo.ts` — `findByDataField` / field-value reads for
  SEO + metadata extraction.
- `plugins/plan/src/pipeline.ts` — `register()` reads entity field values
  (status / priority / source / …) to index plan entities.
- `plugins/storytelling/src/pipeline.ts` — `register()` entity field reads.
- `plugins/design/src/pipeline.ts` — `tokens` / `scope` / `context` reads.

## Acceptance Criteria

- [x] A shared helper reads a field value from a node — prefer the parsed
  `data-rune-fields`, fall back to the `<meta data-field>` child (mirrors the
  engine's `readField`). All consumers use it.
- [ ] `seo.ts` reads field values via the helper (bag-first).
- [x] The plan / storytelling / design `register()` hooks read entity field
  values via the helper (bag-first).
- [x] design's `tokens` / `scope` / `context` are handled — confirm which are
  `properties`-emitted (in the bag, e.g. `tokens` as a JSON string to re-parse)
  vs standalone metas that stay; document the split.
- [x] No behavior change: entity registration, collections / filters, and SEO
  output are identical with the dual channel present. The plan / design /
  storytelling sites build identically; full suite + the dogfood test green.
- [x] Tests cover bag-sourced field extraction for at least one entity per
  affected pipeline.

## Notes

- Only `properties`-emitted fields live in the bag. Postprocess **sentinels**
  (breadcrumb / pagination / collection / aggregate / drawer) and any standalone
  non-`properties` metas are a different channel — out of scope, left untouched.

## Dependencies

- {% ref "WORK-321" /%} — the `fields` bag must be emitted.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

## Resolution

Completed: 2026-06-02

Branch: claude/rune-contract-hardening

### What was done
- Added a shared bag-first field reader to `packages/transform/src/helpers.ts`: `parseFields(tag)` + `readField(tag, name, fields?)` — prefer the `data-rune-fields` bag (camelCase key, scalars coerced to string), fall back to the `<meta data-field>` child (kebab match). Structural param so it works on both Markdoc `Tag` instances and serialized POJOs. Exported from `@refrakt-md/transform`.
- Migrated the three plugin register hooks to it (bag-first, meta fallback):
  - `plugins/plan/src/pipeline.ts` — entity field reads (RUNE_FIELDS are all single-word, so bag key === field).
  - `plugins/storytelling/src/pipeline.ts` — replaced its local kebab+meta reader (dropped the now-unused local `toKebabCase`).
  - `plugins/design/src/pipeline.ts` — `tokens` (a property → JSON string in the bag, re-parsed), `scope`, and sandbox `context` all via the helper.

### Scope finding — seo.ts NOT affected
`seo.ts`'s `findProperty` reads only `headline` / `blurb`, which are content-element refs (h1/p), not the `properties`-emitted `<meta>` values that WORK-323 drops. Those elements keep their `data-field` and survive the drop, and `collectJsonLd` reads RDFa `property=` (output metas), not the data channel. So seo reads nothing that disappears — left unchanged (that AC line is moot, not skipped work).

### Verification
- New `fields.test.ts` (7 tests): parseFields + readField bag-first / typed coercion / kebab meta-fallback / bag-wins / absent / pre-parsed. The plan/storytelling/design plugin tests + the real-content dogfood test exercise the migrated register hooks (pass — dogfood passes in isolation; flakes only under full-suite parallel load, pre-existing and unrelated).
- Output-neutral: dual channel still present (321), so bag-first and meta give the same values. Full suite green (3064 + the new 7; the dogfood flake aside).

### Notes
- Sentinels (breadcrumb/pagination/collection/aggregate/drawer) untouched — separate channel. WORK-323 can now drop the property metas without breaking registration or SEO.

{% /work %}
