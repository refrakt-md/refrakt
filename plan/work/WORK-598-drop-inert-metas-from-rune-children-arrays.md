{% work id="WORK-598" status="ready" priority="high" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dead-code" %}

# Drop inert metas from rune children arrays

100 metas across 24 tag files are mapped in `properties` **and** emitted into
`children`, where `createComponentRenderable` filters them straight back out
(`packages/runes/src/lib/component.ts:127-131`). 133 other metas already omit
that emission and render identically.

Delete the emission. Nothing else.

## Acceptance Criteria

- [ ] No meta mapped in `properties` is also listed in a `children` array or pushed onto one, in any of the 121 runes
- [ ] `refrakt contracts --check` reports no drift, on both committed copies (`contracts/structures.json` and `packages/lumina/contracts/structures.json`)
- [ ] `npm run seo:baseline:check` reports no drift
- [ ] `npm test` passes unchanged
- [ ] A meta that is *not* in `properties` and is deliberately rendered is left alone — the sweep is bounded to property-mapped metas

## Approach

The emission takes two forms and both must go: direct entries in a
`children: [...]` literal (63 sites) and `children.push(meta)` / multi-argument
pushes (37 sites).

Verified before filing by stripping all twelve from `plugins/plan/src/tags/work.ts`:
`refrakt inspect work --site plan --json` returned byte-identical output and
`npm run seo:baseline:check` reported no drift.

The deletion is safe by construction, not just by sample. `schemaTags`
(`component.ts:57`) is populated only from `result.schema`, which has **zero
callers** — so `isSeoMeta` is always `false`, every property meta is added to
`pureDataMetas`, and `pureDataMetas` members are unconditionally filtered from
`childArray`. There is no input for which a property-mapped meta survives.

Highest-count files: `work.ts` (12), `bug.ts` (10), `map.ts` (8),
`decision.ts` (8), `spec.ts` (8), `form.ts` (6).

## Verification

`contracts --check` plus `seo:baseline:check` returning no diff is the test.
Both artefacts are generated from config and describe every rune's complete
output, so a behavioural change cannot hide from them.

## References

- {% ref "SPEC-140" /%} — the survey this implements, Tier 1
- {% ref "SPEC-082" /%} — the `data-rune-fields` bag that made the emission inert
- {% ref "WORK-331" /%} — the change that started filtering pure-data metas out

{% /work %}
