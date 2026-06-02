{% work id="WORK-306" status="done" priority="medium" complexity="moderate" source="SPEC-079" tags="plan,plugin,runes,migration,metafields,zones" milestone="v0.17.0" %}

# Plan plugin migration to metaFields + zones

Phase 1 proof case for {% ref "SPEC-079" /%}. Migrates the plan
plugin's entity runes (work, bug, spec, decision, milestone) from
the legacy `slots + structure` config shape to the new
`metaFields + zones + sections` model. Lands together with
{% ref "WORK-305" /%} so v0.18 ships the spec end-to-end.

## Acceptance Criteria

- [x] **`plugins/plan/src/config.ts` rewritten.** Each of the five
  entity runes (Work, Bug, Spec, Decision, Milestone) replaces
  its `slots: [...entitySlots]` + `structure: { … }` block with:
  - `metaFields` declaring each field's `metaType`, `metaRank`,
    `label`, `condition`, `tag` (for `<time>` etc.), and
    `sentimentMap` where applicable.
  - `zones.eyebrow = { left: ['id'], right: ['status'] }` for the
    primary header.
  - `zones.metadata = { fields: [...] }` for the descriptive
    header (priority, complexity, assignee, milestone, source,
    created, modified, tags — varies per entity type).
  - `sections.title`, `sections.blurb`, `sections.body` retained
    as today.

- [x] **`entitySlots` constant deleted.** The `slots: [...entitySlots]`
  array is no longer needed (engine derives render order from the
  canonical vocabulary).

- [x] **Per-entity field shapes mirror today's behaviour.**
  - **Work**: id, status, priority, complexity, assignee, milestone,
    source, created, modified, tags. Eyebrow: id+status. Metadata:
    the rest.
  - **Bug**: id, status, severity, assignee, milestone, source,
    created, modified, tags. Eyebrow: id+status. Metadata: the rest.
  - **Spec**: id, status, version, supersedes, created, modified,
    tags. Eyebrow: id+status. Metadata: the rest.
  - **Decision**: id, status, date, supersedes, source, created,
    modified, tags. Eyebrow: id+status. Metadata: the rest.
  - **Milestone**: name (used as id), status, date, target, done /
    total counts (from {% ref "WORK-281" /%} rollup), created,
    modified, tags. Eyebrow: name+status. Metadata: the rest.
  - `sentimentMap` values preserved verbatim from today's config.

- [x] **`plugins/plan/src/index.ts` `theme.runes` entry updated.**
  The exported theme config for the plugin reflects the new
  shape. Existing per-rune CSS (work.css, bug.css, etc.)
  inspected for selectors that referenced the old class names
  (`__header-primary`, `__header-secondary`); rewritten to the
  new zone-named selectors (`__eyebrow`, `__metadata`).

- [x] **Rune-specific CSS quirks preserved.** Complexity dots on
  work (`[data-complexity="…"] > .rf-work__metadata > .rf-work__complexity dd::after`)
  continue to render correctly under the new DOM. Assignee `@`
  prefix preserved. Body section dividers untouched.

- [x] **Plan-site rendering passes.** All existing plan-site
  snapshot tests in
  `packages/content/test/plan-site-dogfood-real.test.ts` pass with
  the new DOM shape (zone-named classes, def-list metadata).
  Visual QA on a representative work / bug / decision / spec /
  milestone page in the rendered plan site.

- [x] **Backwards-compat shim NOT exercised by plan plugin
  itself.** Plan plugin is fully migrated; the shim only catches
  third-party consumers (which the plan plugin is not). Verify
  via the shim's first-encounter warning — it should not fire
  for any plan rune.

- [x] **Plan plugin tests updated.** Tests in
  `plugins/plan/test/` that snapshot rune output reflect the new
  DOM. Scanner tests untouched (they read frontmatter / rune
  attributes, not output DOM).

- [x] **Docs.** Plan-rune doc pages
  (`site/content/runes/plan/{spec,work,bug,decision,milestone}.md`)
  updated:
  - Output contract snippets reflect the new DOM (zone-named
    classes, def-list metadata).
  - Any examples referencing `__header-primary` etc. updated to
    `__eyebrow` / `__metadata`.

## Approach

Mechanical config rewrite + selective CSS adjustment. The work
splits into per-entity passes that can land as small commits:

1. **Work**: the canonical case. Migrate first to validate the
   shape and lock the test approach.
2. **Bug**: similar shape, smaller field set.
3. **Spec**: simpler — only id+status in eyebrow, fewer metadata
   fields.
4. **Decision**: similar to spec.
5. **Milestone**: the outlier (`name` as id, integrates with
   {% ref "WORK-281" /%} progress rollup).

Each pass is small enough to review independently. CSS sweep
follows the config migration (rename class selectors). Snapshot
tests get regenerated last after all five entities migrate.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives must land
  first (or in the same merge train). Without it, the new config
  shape has no consumer.

## References

- {% ref "SPEC-079" /%} — the spec being implemented.
- {% ref "WORK-281" /%} — milestone progress rollup, the source of
  `checkedCount` / `totalCount` on milestone entities.

## Resolution

Completed: 2026-06-01

Branch: `claude/spec-079-implementation` (same branch as WORK-305 — Phase 1 lands together).

### What was done

**Plan plugin config (`plugins/plan/src/config.ts`):**
- Rewrote all five entity runes (Spec, Work, Bug, Decision, Milestone) from legacy `slots: [...entitySlots]` + `structure: { 'header-primary': …, 'header-secondary': … }` to SPEC-079 `metaFields` + `zones` + `contentSlots`.
- Eyebrow zone declared as `{ left: ['id'], right: ['status'] }` for all entities (Milestone uses `name` as id). Metadata zone declared with the appropriate field list per entity.
- `entitySlots` constant removed — engine derives render order from canonical vocabulary (`eyebrow → title → blurb → metadata → body`).
- `projection: preambleProjection` removed — engine auto-derives the `.rf-{block}__preamble` wrapper around header positions.
- Per-rune `editHints` collapsed to `{ body: 'none' }` — per-field hints (`'id-badge': 'none'` etc.) no longer needed since the engine derives row identity from `data-field`.
- `sentimentMap` values preserved verbatim from the old config.

**Per-rune CSS (`packages/lumina/styles/runes/`):**
- `work.css`, `bug.css`, `spec.css`, `decision.css`, `milestone.css` — renamed `__header-primary` / `__header-secondary` selectors to `__eyebrow` / `__metadata`. Layout geometry comes from `[data-zone-layout=…]` selectors (universal), so per-rune CSS now carries only spacing and rune-specific quirks.
- Work-specific quirks preserved: complexity dots now target `.rf-work__metadata [data-field="complexity"] dd::after` (with content driven by `[data-complexity=…]` on the work root). Assignee `@` prefix targets `[data-field="assignee"] dd::before`.

**Tests + docs:**
- All existing plan-site snapshot tests (`packages/content/test/plan-site-dogfood-real.test.ts`, `plan-site-dogfood.test.ts`) pass with the new DOM shape — the snapshots re-derive from the live config so the rename rides along.
- Plan plugin's own tests (`plugins/plan/test/{work,bug,spec,decision,milestone,plan-config}.test.ts`) all pass — they read frontmatter / rune attributes, not output DOM.
- Plan-rune doc pages (`site/content/runes/plan/{work,bug,spec,decision,milestone}.md`) have no `__header-primary` / `__header-secondary` references — nothing to update there.

### Notes

- **Plan plugin no longer uses the backwards-compat shim** — it's fully migrated to SPEC-079. Verified the `warnLegacySlots` first-encounter warning doesn't fire for any plan rune (it only triggers when a rune has `config.slots + config.structure` AND legacy slot names, neither of which the plan plugin sets anymore).
- **Field name mapping was a 1-to-1 carry-over** — every modifier the legacy config declared has a matching `metaFields` entry. The engine reads the value via the existing modifier-from-meta machinery and renders it via the new layout primitives. No data-flow changes; only the rendering shape moved from plugin to theme.
- **Milestone uses `name` instead of `id`** — the milestone rune's identifier modifier is `name` (not `id`), so its `metaFields.name = idField` and `zones.eyebrow.left = ['name']`. The rendered DOM is identical to other entities (left slot = monospace identifier, right slot = sentiment-tinted status chip).
- **Per-field `condition`** — fields like `assignee`, `milestone`, `source`, `created`, `modified`, `tags` use `condition` to render only when the corresponding modifier has a value. Same conditional-rendering semantics as the legacy `structure[…].condition` field.
- **Contracts regenerated** — `contracts/structures.json` (main site) and `packages/lumina/contracts/structures.json` (Lumina theme test surface) both updated to reflect the new DOM shape. The plan rune contracts now show `zones` + `contentSlots` instead of `slots` + `structure`.

{% /work %}
