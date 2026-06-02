{% work id="WORK-318" status="done" priority="high" complexity="moderate" source="SPEC-080" tags="docs,plugin,api,symbol,migration,blocks,layout,bar,eyebrow,proof" milestone="v0.17.0" %}

# Migrate `docs` package to blocks/layout (api proof)

Migrate the docs meta-bearing runes (Api, Symbol; Changelog untouched)
straight to the {% ref "SPEC-080" /%} blocks/layout model. **api is the
deliberate proof point**: method/auth render as chips and path renders as a
bare `<code>` — all from `metaType`, in one flat `bar` — with no
layout-specific or slot-specific logic.

Supersedes `WORK-309`, which migrated docs to SPEC-079 `zones` (path as
`metaType: 'id'` mono, method/path as split left/right). Skip the
now-obsolete `zones` step and go directly to blocks/layout. api is still on
the legacy `structure` path today, so this is its first real migration.

## Acceptance Criteria

- [x] **api.** `metaFields`: `method` (`category` + sentiment → chip),
  `path` (`code` → bare `<code>`), `auth` (`status` → chip, conditional).
  `blocks: { eyebrow: { fields: ['method','path',{field:'auth',align:'end'}], layout: 'bar', wrap: false } }`,
  `layout: { content: ['eyebrow','body'] }`. The legacy `structure` block is
  removed.
- [x] **symbol.** Migrated analogously (kind / lang / since / deprecated /
  source), preserving its sentiment and conditional fields.
- [x] **CSS + tests.** `api` / `symbol` CSS and docs tests updated; output
  matches today's visual (method/auth chips, path mono code).
- [ ] **`WORK-309` marked superseded.**

## Approach

Sequence *after* plan + learning have validated the model on real runes;
api then proves the mixed chip/bare `bar` in isolation before the long tail
of remaining packages (`WORK-319`).

## Dependencies

- {% ref "WORK-314" /%}, {% ref "WORK-315" /%} — infrastructure.
- {% ref "WORK-316" /%}, {% ref "WORK-317" /%} — sequence after plan +
  learning prove the model.

## References

- {% ref "SPEC-080" /%} — api case study.
- Supersedes `WORK-309` (SPEC-079 docs migration).

## Resolution

Completed: 2026-06-02

Branch: claude/spec-079-implementation

### What was done
- api migrated straight to blocks/layout (the proof): endpoint header is one eyebrow bar — method (category->chip) + path (code->bare mono) + auth (status->chip, align end), all shape-from-metaType. Removed legacy structure/contentWrapper.
- Added a link field type to the model (chosen over the alternatives): MetaField gains `href` (a modifier name); the field renders as a bare <a href> with the label (or value) as text, data-meta-type="link". Spec'd in SPEC-080.
- symbol migrated: eyebrow bar (kind/lang chips + source link via href, aligned end) + a since/deprecated definition-list (labelled facts) + the authored headline; layout root [eyebrow, preamble, metadata, body]. CSS updated (.rf-symbol__eyebrow, link styling via [data-meta-type=link]); api.css trimmed to __eyebrow + __body.
- Tests: engine-blocks gains a link-field case; contracts regenerated; full suite green (one pre-existing flaky plan history test passes on retry).

### Notes
- WORK-309 (SPEC-079 docs->zones) is superseded in substance; left untouched since the plan schema has no superseded/cancelled status (prior decision).
- Deferred: surfacing block names in the generated structure contracts (the WORK-314 criterion). The generator reads structure/contentWrapper/autoLabel, not blocks/layout — it should be one consistent pass across plan/learning/docs, so it moves to WORK-320 (finalize contracts).

{% /work %}
