{% work id="WORK-318" status="in-progress" priority="high" complexity="moderate" source="SPEC-080" tags="docs,plugin,api,symbol,migration,blocks,layout,bar,eyebrow,proof" milestone="v0.17.0" %}

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

- [ ] **api.** `metaFields`: `method` (`category` + sentiment → chip),
  `path` (`code` → bare `<code>`), `auth` (`status` → chip, conditional).
  `blocks: { eyebrow: { fields: ['method','path',{field:'auth',align:'end'}], layout: 'bar', wrap: false } }`,
  `layout: { content: ['eyebrow','body'] }`. The legacy `structure` block is
  removed.
- [ ] **symbol.** Migrated analogously (kind / lang / since / deprecated /
  source), preserving its sentiment and conditional fields.
- [ ] **CSS + tests.** `api` / `symbol` CSS and docs tests updated; output
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

{% /work %}
