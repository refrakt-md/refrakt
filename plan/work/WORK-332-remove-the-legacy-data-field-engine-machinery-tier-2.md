{% work id="WORK-332" status="ready" priority="low" complexity="moderate" source="SPEC-082" tags="runes,engine,cleanup,data-channel,fields,tests" %}

# Remove the legacy data-field engine machinery (Tier 2)

Internal-only cleanup that lands the rest of {% ref "WORK-323" /%} once
{% ref "WORK-331" /%} has stopped emitting the dual-emit metas. Remove the
now-dead legacy read/strip path so `data-rune-fields` is the engine's *only*
field-data input. No external/contract benefit beyond Tier 1 — this is for a
single internal representation and a smaller engine.

## Scope

Delete, in `packages/transform/src/engine.ts`:

- the `readField` **meta-fallback** (read modifier/field values from the bag
  only — the `readMeta` fallback branch goes away);
- the **step-7 meta-strip** filter (no population-1 metas remain to strip);
- the **kebab-cased `consumedModifierFields` set** that drives that strip;
- any remaining unconsumed-meta leak handling tied to the data channel.

Genuine schema.org `<meta property>` and the directly-built cross-page sentinel
metas (`collection-*`, `aggregate-*`, …) are untouched — they never went through
the `readField` path.

## Cost / risk

Removing the engine meta-fallback breaks the engine-unit-test fixtures that feed
`<meta data-field>` **directly** to the engine with no bag (the "168-break" seen
in the original WORK-323 attempt). Measured surface (2026-06-03): ~10 files —
`engine-core`, `engine-blocks`, `metadata`, `value-mapping`, `computed`,
`repeat`, `engine-features`, `context-modifiers`, `fields`, `extract-interface`
(~80 `data-field` references) — must be migrated to construct
`data-rune-fields` instead. Moderate risk: this changes the engine input
contract to bag-only, a behaviour change for any *external* producer of a
serialized tree (cached content, third-party tooling) that emits metas without a
bag.

## Acceptance Criteria

- [ ] The engine reads modifier/field values **only** from `data-rune-fields`;
  the `readMeta` data-fallback, step-7 modifier strip, and kebab set are removed.
- [ ] Engine-unit-test fixtures that fed `<meta data-field>` directly are
  migrated to `data-rune-fields`.
- [ ] SEO `<meta property>` and cross-page sentinel metas still pass through
  unchanged.
- [ ] Rendered output unchanged; full suite + both structure contracts green.

## Dependencies

- {% ref "WORK-331" /%} — emission must stop before the read/strip path can be
  removed without changing output.

## References

- {% ref "SPEC-082" /%} — typed node data channel.
- {% ref "WORK-323" /%} — original full-excision item (descoped); Tier 2 lands
  its engine-side remainder.

{% /work %}
