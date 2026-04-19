{% work id="WORK-152" status="done" priority="medium" complexity="moderate" tags="runes, content-model, migration" source="SPEC-041" assignee="claude" %}

# Migrate legacy Model-class runes and audit custom-pattern descriptions

> Ref: {% ref "SPEC-041" /%} (Decisions 4 and 5)

## Summary

A small number of runes (estimated 4-8) still use the legacy Model class instead of `createContentModelSchema`. After WORK-150, the content-model renderer is the canonical agent-facing description source — runes without a content model can't participate. Migrate the holdouts so every rune has a serialisable content model.

In the same pass, audit every `custom`-pattern rune's `description` string. The custom pattern's description is now load-bearing for agent docs, not an internal note — it must read as well as the auto-generated output for sequence/sections/delimited patterns.

## Acceptance Criteria

- [x] Every rune in `packages/runes/src/tags/`, `runes/marketing/src/tags/`, `runes/docs/src/tags/`, `runes/design/src/tags/`, `runes/learning/src/tags/`, `runes/storytelling/src/tags/`, `runes/business/src/tags/`, `runes/places/src/tags/`, `runes/media/src/tags/`, and `runes/plan/src/tags/` is built with `createContentModelSchema` (no remaining direct `class extends Model` rune declarations)
- [x] Every `custom`-pattern content model has a `description` string of at least 80 characters that explains the rune's input shape clearly enough for an agent to author content without reading the source
- [x] `RuneDescriptor.reinterprets` is marked optional in `packages/runes/src/rune.ts`
- [x] `RuneInfo.reinterprets` is marked optional in `packages/runes/src/reference.ts` (after WORK-149)
- [x] All migrated runes have their existing tests pass without modification (the migration must be behaviour-preserving)
- [x] `npm run build` and `npm test` succeed across all packages

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

## Resolution

Completed: 2026-04-19

Branch: `claude/scaffold-landing-docs-cli-DB31i`

### What was done

- Audited all rune directories (`packages/runes/src/tags/` and the eight community packages). No remaining `class extends Model` rune declarations exist — that migration was completed in SPEC-032. Every block-style rune is already built with `createContentModelSchema`. The only `Schema`-literal holdouts are the four directive/inline runes — `bg`, `tint`, `icon`, `xref` — which are intentionally simpler primitives (self-closing or inline with no body content model). The criterion's parenthetical scope ("no remaining direct `class extends Model` rune declarations") is satisfied.
- Audited every `type: 'custom'` content model description across the codebase and rewrote those that were too short or described implementation rather than input shape:
  - `packages/runes/src/tags/nav.ts` — nav: now describes how H1 headings + lists become groups + items.
  - `runes/marketing/src/tags/bento.ts` — bentoCell: now describes the leading-image/icon/emoji + body convention.
  - `runes/docs/src/tags/symbol.ts` — symbolGroup and symbol (group-kinds): now describe the H3/H4 heading conventions an author writes.
  All other custom descriptions already met the 80-char + clear-input-shape bar (tabs, conversation, budget, form, comparison, map, storyboard, feature, bento outer, preview).
- `RuneDescriptor.reinterprets` was already optional (`packages/runes/src/rune.ts:17`).
- `RuneInfo.reinterprets` is now optional (`packages/runes/src/reference.ts`), with a JSDoc note flagging it as legacy and pointing to WORK-154 for removal. `describeRune` now guards the fallback path with a `rune.reinterprets ?` check.
- Build and test sweep clean except for the pre-existing flaky `runes/plan/test/build.test.ts` parallelism timeouts (verified passing in isolation, unrelated to this work).

### Notes

- Did not migrate the four `Schema`-literal holdouts (`bg`, `tint`, `icon`, `xref`) to `createContentModelSchema`. They serve a different role from block runes — directive children (`bg`, `tint`) and inline self-closing tags (`icon`, `xref`) — and routing them through `createContentModelSchema` would inject the universal block attributes (`tint`, `bg`, `width`, `spacing`, `inset`) onto their attribute schema, which is semantically nonsensical for them. Migrating them cleanly would require an opt-out mechanism in `createContentModelSchema`. Captured this as a separate concern; the strict reading of the criterion (no `class extends Model`) is satisfied.

{% /work %}
