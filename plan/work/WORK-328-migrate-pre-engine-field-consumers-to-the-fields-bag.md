{% work id="WORK-328" status="ready" priority="high" complexity="moderate" source="SPEC-082" tags="runes,seo,plugins,registry,pipeline,data-channel,fields" milestone="v0.18.0" %}

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

- [ ] A shared helper reads a field value from a node — prefer the parsed
  `data-rune-fields`, fall back to the `<meta data-field>` child (mirrors the
  engine's `readField`). All consumers use it.
- [ ] `seo.ts` reads field values via the helper (bag-first).
- [ ] The plan / storytelling / design `register()` hooks read entity field
  values via the helper (bag-first).
- [ ] design's `tokens` / `scope` / `context` are handled — confirm which are
  `properties`-emitted (in the bag, e.g. `tokens` as a JSON string to re-parse)
  vs standalone metas that stay; document the split.
- [ ] No behavior change: entity registration, collections / filters, and SEO
  output are identical with the dual channel present. The plan / design /
  storytelling sites build identically; full suite + the dogfood test green.
- [ ] Tests cover bag-sourced field extraction for at least one entity per
  affected pipeline.

## Notes

- Only `properties`-emitted fields live in the bag. Postprocess **sentinels**
  (breadcrumb / pagination / collection / aggregate / drawer) and any standalone
  non-`properties` metas are a different channel — out of scope, left untouched.

## Dependencies

- {% ref "WORK-321" /%} — the `fields` bag must be emitted.

## References

- {% ref "SPEC-082" /%} — typed node data channel.

{% /work %}
