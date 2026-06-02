{% work id="WORK-316" status="done" priority="high" complexity="complex" source="SPEC-080" tags="plan,plugin,runes,migration,blocks,layout" milestone="v0.17.0" %}

# Migrate `plan` package to blocks/layout

Re-migrate the plan family (work, spec, bug, decision, milestone) from the
SPEC-079 `metaFields` + `zones` model (`WORK-306`, done) to the
{% ref "SPEC-080" /%} blocks/layout model. The `metaFields` manifest is
reused as-is; the `zones` / `contentSlots` / `order` / dispatcher reliance
is replaced by transforms that build named-block trees plus `blocks` /
`layout` config. This is the bulk of the SPEC-080 migration — the plan
family leans hardest on the engine dispatcher.

## Acceptance Criteria

- [x] **Transforms build a named-block tree.** Each plan rune emits its own
  addressable blocks (eyebrow content, title, body, trailers) instead of
  relying on the dispatcher to assemble from `contentSlots` + canonical
  order. Plan entities are **flat** (no content/media wrapper), so blocks
  sit at the rune root and are ordered via `layout: { root: [...] }` — the
  first real consumer of the reserved `root` key.
- [x] **Configs use `blocks` + `layout`.** Eyebrow projected as a `bar`
  (id left, status `align: 'end'`); metadata block(s) per current visual;
  `zones` / `zoneLayouts` / `contentSlots` / `order` removed from the plan
  configs.
- [x] **Pipeline intact.** Entity registration (`plugins/plan/src/pipeline.ts`)
  resolves names from the new block tree.
- [x] **Tests + plan site.** Plan plugin tests pass and the plan site renders
  equivalently to today.

## Approach

`metaFields` already exist from `WORK-306`; the work is restructuring the
transforms to build their own block tree (dropping the dispatcher) and
writing `blocks` / `layout`. Follow the recipe / faction patterns
established on this branch as the reference.

## Dependencies

- {% ref "WORK-314" /%} — engine projection.
- {% ref "WORK-315" /%} — `bar` + field shape.

## References

- {% ref "SPEC-080" /%}, {% ref "SPEC-079" /%}; reuses `WORK-306` metaFields.

## Resolution

Completed: 2026-06-02

Branch: `claude/spec-079-implementation`

### What was done
- Migrated all five plan entities (Spec, Work, Bug, Decision, Milestone) from SPEC-079 `zones` + `contentSlots` + `order` + `zoneLayouts` to SPEC-080 `blocks` + `layout`.
- Each entity now declares: `blocks` = eyebrow (`bar`: id/name + status aligned end), metadata (`definition-list`), tags (`bar`); `layout: { root: [...] }` — the first real consumer of the reserved `root` key. `metaFields`, `modifiers`, `sections`, `editHints`, `checklist` reused unchanged.
- Removed the now-dead `tagsTrailer` helper.
- No transform changes: the transforms already emit `title`/`blurb`/`body` as named blocks at root, so the engine reshapes at render while the cross-page pipeline (which reads the pre-engine tree) is unaffected — `extractTitle` still finds the title.
- CSS: dropped the dead `.rf-{block}__preamble` rules (flat root has no preamble wrapper); preserved the eyebrow identifier's primary-colour kicker via `.rf-{block}__eyebrow [data-meta-type="id"]` (the old split left-slot styling).

### Notes
- Intended visual changes from intrinsic field shape: `tag`-type fields (assignee, milestone, version) now render as chips in the metadata def-list (were plain text); the eyebrow is a `bar`, not a `split`. complexity dots + assignee `@` prefix CSS still target the def-list rows by `data-field`.
- Plan entities aren't in the `main`/lumina structure contracts (separate site), so no contract regen needed.
- Full suite green (3079).

{% /work %}
