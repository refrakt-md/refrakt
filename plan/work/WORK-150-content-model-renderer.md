{% work id="WORK-150" status="ready" priority="high" complexity="moderate" tags="runes, content-model, ai-workflow" source="SPEC-041" %}

# Add content-model renderer for agent-facing rune docs

> Ref: {% ref "SPEC-041" /%} (Content-Model-Derived Descriptions)

## Summary

Today's `describeRune()` renders the flat `reinterprets` map (`heading → headline`). The declarative content model captures far more — ordering, optionality, repeats, named zones, headingExtract parsing — but no code converts it to readable prose.

Add `renderContentModel(serialized)` that walks a serialized content model (one of the four patterns: `sequence`, `sections`, `delimited`, `custom`) and emits agent-readable markdown describing the rune's input shape. This is the single new piece of code SPEC-041 introduces; everything else in the spec is plumbing or migration.

## Acceptance Criteria

- [ ] `renderContentModel(model: SerializedContentModel): string` exported from `packages/runes/src/reference.ts`
- [ ] **Sequence pattern:** renders fields as a numbered list, marking each as required/optional and showing the `match` predicate (e.g., `paragraph`, `heading`, `list|fence`, `any`)
- [ ] **Sections pattern:** renders named sections with required/optional state; surfaces `headingExtract` shape when present (e.g., `"heading text is parsed as <time> — <location>"`)
- [ ] **Delimited pattern:** renders zones with the delimiter shown (`---` for `hr`), fields nested under each zone, distinguishes static `zones` from `dynamicZones`
- [ ] **Custom pattern:** renders the `description` string verbatim under a "Content structure" heading
- [ ] `describeRune()` is updated to call `renderContentModel()` instead of (or in addition to, see WORK-152) the legacy `reinterprets` rendering path
- [ ] Snapshot tests cover at least one rune per pattern: `palette` (sequence), `character` (sections), `hero` (delimited), and one `custom` rune
- [ ] Output for `hero` matches the example in SPEC-041 (delimited zones with content/media, eyebrow as paragraph in content zone, etc.)
- [ ] Output is stable: rerunning the renderer on the same serialized model produces byte-identical output

## Approach

1. Read the four `ContentModel` shapes in `packages/types/src/content-model.ts` and the existing `serializeContentModel` from WORK-149 (it strips function fields like `processChildren` and `headingExtract`, so the renderer must accept that the function is gone but key metadata it produced — like `headingExtract` field names — should be retained on the serialized form).
2. Extend `serializeContentModel` if needed so the serialized form preserves enough metadata for the renderer (e.g., a `headingExtract: { fields: ['time', 'location'] }` summary instead of dropping the function entirely).
3. Implement `renderContentModel` with a dispatch over `model.type` (or `pattern`, depending on the serialized shape). Each branch emits a structured prose block.
4. Update `describeRune()` to call the new renderer. For now, fall back to the legacy `reinterprets` path when no content model is registered (the fallback is removed in WORK-154 once the migration is complete).
5. Add snapshot tests in `packages/runes/test/reference.test.ts`.

## Dependencies

- WORK-149 (shared infrastructure must be in place first)

## References

- {% ref "SPEC-041" /%} — Content-Model-Derived Descriptions
- {% ref "SPEC-003" /%} — Declarative Content Model

{% /work %}
