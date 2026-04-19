{% work id="WORK-152" status="ready" priority="medium" complexity="moderate" tags="runes, content-model, migration" source="SPEC-041" %}

# Migrate legacy Model-class runes and audit custom-pattern descriptions

> Ref: {% ref "SPEC-041" /%} (Decisions 4 and 5)

## Summary

A small number of runes (estimated 4-8) still use the legacy Model class instead of `createContentModelSchema`. After WORK-150, the content-model renderer is the canonical agent-facing description source — runes without a content model can't participate. Migrate the holdouts so every rune has a serialisable content model.

In the same pass, audit every `custom`-pattern rune's `description` string. The custom pattern's description is now load-bearing for agent docs, not an internal note — it must read as well as the auto-generated output for sequence/sections/delimited patterns.

## Acceptance Criteria

- [ ] Every rune in `packages/runes/src/tags/`, `runes/marketing/src/tags/`, `runes/docs/src/tags/`, `runes/design/src/tags/`, `runes/learning/src/tags/`, `runes/storytelling/src/tags/`, `runes/business/src/tags/`, `runes/places/src/tags/`, `runes/media/src/tags/`, and `runes/plan/src/tags/` is built with `createContentModelSchema` (no remaining direct `class extends Model` rune declarations)
- [ ] Every `custom`-pattern content model has a `description` string of at least 80 characters that explains the rune's input shape clearly enough for an agent to author content without reading the source
- [ ] `RuneDescriptor.reinterprets` is marked optional in `packages/runes/src/rune.ts`
- [ ] `RuneInfo.reinterprets` is marked optional in `packages/runes/src/reference.ts` (after WORK-149)
- [ ] All migrated runes have their existing tests pass without modification (the migration must be behaviour-preserving)
- [ ] `npm run build` and `npm test` succeed across all packages

## Approach

1. Audit pass: grep for legacy patterns across the rune directories. Look for `class.*extends Model`, `defineRune` calls without a `createContentModelSchema` schema, etc. Produce a working list of holdouts.
2. For each holdout, design the content model that captures its current behaviour. Most legacy runes will fit `sequence` or `delimited`; only genuinely irregular structures need `custom`.
3. Migrate one rune at a time, running its existing tests after each migration to confirm no behaviour change.
4. After migration, sweep every `custom`-pattern rune (existing and newly-introduced). Read the description; rewrite if it's terse, internal-jargon-heavy, or doesn't explain the input shape clearly. Aim for the same level of clarity as the auto-rendered output for the other three patterns.
5. Mark `reinterprets` optional on the descriptor and info types. Do **not** drop it yet — that's WORK-154 once the renderer is fully live.

## Dependencies

- None functionally (can start in parallel with WORK-149/150/151) but coordinate with WORK-154 which removes `reinterprets` once this is done

## References

- {% ref "SPEC-041" /%} — Decisions 4 and 5
- {% ref "SPEC-003" /%} — Declarative Content Model
- {% ref "SPEC-032" /%} — Remove Legacy Model Decorators (related earlier migration)

{% /work %}
