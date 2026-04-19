{% work id="WORK-150" status="done" priority="high" complexity="moderate" tags="runes, content-model, ai-workflow" source="SPEC-041" assignee="claude" %}

# Add content-model renderer for agent-facing rune docs

> Ref: {% ref "SPEC-041" /%} (Content-Model-Derived Descriptions)

## Summary

Today's `describeRune()` renders the flat `reinterprets` map (`heading → headline`). The declarative content model captures far more — ordering, optionality, repeats, named zones, headingExtract parsing — but no code converts it to readable prose.

Add `renderContentModel(serialized)` that walks a serialized content model (one of the four patterns: `sequence`, `sections`, `delimited`, `custom`) and emits agent-readable markdown describing the rune's input shape. This is the single new piece of code SPEC-041 introduces; everything else in the spec is plumbing or migration.

## Acceptance Criteria

- [x] `renderContentModel(model: SerializedContentModel): string` exported from `packages/runes/src/reference.ts`
- [x] **Sequence pattern:** renders fields as a numbered list, marking each as required/optional and showing the `match` predicate (e.g., `paragraph`, `heading`, `list|fence`, `any`)
- [x] **Sections pattern:** renders named sections with required/optional state; surfaces `headingExtract` shape when present (e.g., `"heading text is parsed as <time> — <location>"`)
- [x] **Delimited pattern:** renders zones with the delimiter shown (`---` for `hr`), fields nested under each zone, distinguishes static `zones` from `dynamicZones`
- [x] **Custom pattern:** renders the `description` string verbatim under a "Content structure" heading
- [x] `describeRune()` is updated to call `renderContentModel()` instead of (or in addition to, see WORK-152) the legacy `reinterprets` rendering path
- [x] Snapshot tests cover at least one rune per pattern: `palette` (sequence), `character` (sections), `hero` (delimited), and one `custom` rune
- [x] Output for `hero` matches the example in SPEC-041 (delimited zones with content/media, eyebrow as paragraph in content zone, etc.)
- [x] Output is stable: rerunning the renderer on the same serialized model produces byte-identical output

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

## Resolution

Completed: 2026-04-19

Branch: `claude/scaffold-landing-docs-cli-DB31i`

### What was done
- **packages/runes/src/reference.ts**: added `renderContentModel(model: SerializedContentModel): string` plus four per-pattern renderers (sequence/sections/delimited/custom). Extended `SerializedContentModel` types (`SerializedSequenceModel`, `SerializedSectionsModel`, `SerializedDelimitedModel`, `SerializedCustomModel`, `SerializedContentField`, `SerializedDelimitedZone`, `SerializedHeadingExtractField`, `SerializedKnownSection`). Extended `stripContentModel` to preserve `headingExtract` (with regex patterns converted to source strings), `knownSections` (with `hasModel` flag), and `implicitSection`. Added optional `contentModel?: SerializedContentModel` to `RuneInfo`. Updated `describeRune` to render from `contentModel` when present, falling back to the legacy `reinterprets` path otherwise.
- **packages/runes/src/index.ts**: re-exports `renderContentModel` plus all new serialized-model type aliases.
- **packages/runes/test/reference.test.ts** (new): 14 tests covering all four patterns (palette/sequence, character/sections, hero/delimited, tabs/custom), headingExtract parsing, knownSections, dynamicZones, conditional model unwrapping, stability (byte-identical output on repeat), and describeRune's contentModel → renderer path with a reinterprets fallback.

### Notes
- Match predicates render as readable prose: `any` → "any block", `heading:2` → "level-2 heading", `tag:NAME` → "`NAME` tag", `list|fence` → "list or fence".
- `headingExtract` RegExp patterns are serialized as their `.source` strings (not the RegExp itself) so the output is JSON-safe.
- The write command path is unchanged — its callers pass `Rune` instances without `contentModel`, so they hit the legacy reinterprets fallback. WORK-155 will populate `contentModel` explicitly when building `refrakt reference` output.
- All 557 tests in packages/ai, packages/editor, packages/cli, packages/runes pass. `npm run build` succeeds.

{% /work %}
