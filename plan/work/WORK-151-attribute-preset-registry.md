{% work id="WORK-151" status="ready" priority="medium" complexity="simple" tags="runes, attributes, ai-workflow" source="SPEC-041" %}

# Add attribute preset registry for tier-aware reference output

> Ref: {% ref "SPEC-041" /%} (Attribute Tiers, Decision 8)

## Summary

Every `createContentModelSchema` rune ends up with three attribute tiers — universal (auto-merged), base preset (opted in via `base:`), own (declared inline). The reference output should surface them as separate groups so the rune-specific attributes don't get buried in the 6-11 inherited ones. Universal attributes are detectable by name; base presets need a registry because the merge in `createContentModelSchema` loses the source.

Add `registerAttributePreset()` so any package — core or community — can publish a named, described attribute preset that the reference renderer recognises.

## Acceptance Criteria

- [ ] `packages/runes/src/attribute-presets.ts` exists with `registerAttributePreset(record, metadata)` and `lookupAttributePreset(record)` exports
- [ ] Registry uses reference identity (`Map<object, PresetMetadata>`) to match a rune's `base:` record back to the registered preset
- [ ] `splitLayoutAttributes` (currently in `packages/runes/src/tags/common.ts`) registers itself with name `"split layout"` and a description
- [ ] At least one community-package preset registers itself as a working example (pick the most reused base record across `runes/marketing`, `runes/learning`, `runes/storytelling` — likely a layout preset)
- [ ] The reference renderer (`describeRune` in `packages/runes/src/reference.ts`) classifies attributes into three groups: own, base (with preset name when registered, falls back to "additional shared attributes" when not), universal
- [ ] Snapshot tests confirm `hero` shows `align` as own, `layout/ratio/valign/gap/collapse` as inherited from "split layout", and `tint/bg/width/spacing/inset` as universal
- [ ] Documentation comment on `registerAttributePreset` explains the API for community-package authors (one paragraph in the source file)

## Approach

1. Create `packages/runes/src/attribute-presets.ts`:
   ```ts
   const presets = new Map<object, { name: string; description: string }>();
   export function registerAttributePreset(
     record: Record<string, SchemaAttribute>,
     metadata: { name: string; description: string },
   ): void { presets.set(record, metadata); }
   export function lookupAttributePreset(
     record: object,
   ): { name: string; description: string } | undefined { return presets.get(record); }
   ```
2. Export from `packages/runes/src/index.ts`.
3. In `packages/runes/src/tags/common.ts`, call `registerAttributePreset(splitLayoutAttributes, {...})` at module load.
4. Pick one community package preset, extract it (if inline today) and register it the same way.
5. Update `describeRune` to: extract the `base` record reference from the rune's schema (need a way to inspect this — likely requires a small change to `createContentModelSchema` to store the original `base` reference on the schema), look it up in the registry, classify attributes accordingly.
6. Update snapshot tests (overlap with WORK-150).

## Dependencies

- WORK-149 (shared infrastructure)
- Best paired with WORK-150 since both touch `describeRune`

## References

- {% ref "SPEC-041" /%} — Attribute Tiers, Decision 8
- `packages/runes/src/tags/common.ts:10-16` (existing `splitLayoutAttributes`)
- `packages/runes/src/lib/index.ts:161-176` (where attributes get merged)

{% /work %}
