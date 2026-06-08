{% work id="WORK-296" status="done" priority="medium" complexity="moderate" source="SPEC-076" tags="aggregate,plan,plan-progress,sugar" milestone="v0.19.0" %}

# Decompose plan-progress as sugar over aggregate

With the generic `aggregate` rune in place ({% ref "WORK-294" /%}), `plan-progress` becomes **thin sugar over `aggregate`** — same pattern as `backlog` / `decision-log` / `plan-activity` wrapping `collection`. plan-progress's current rendering (the progress bar + per-status badge row) is exactly the aggregate composition; we just need plan-specific defaults baked in so the call site stays `{% plan-progress /%}`.

## Acceptance Criteria
- [x] `plan-progress` is rewritten to emit (or delegate to) an `aggregate` composition rather than its own render path: a `progress` bar in the preamble + a `badge` row in the per-group template + the empty-state fallback.
- [x] Plan-specific defaults are baked in: `type` defaults to the actionable plan set (`work,bug` — widenable by the author); `group="status"`; status enum drives `data-status` on badges so they pick up the existing sentiment-mapped colors via the restyled `badge` rune.
- [x] **Achievement via an achieved-status union (decision: option C).** The default `value` is a single regex clause unioning each type's terminal-positive status — `value="status:/^(done|fixed|accepted|complete)$/"` — which is correct over a mixed set because the achieved names don't cross-contaminate (a work item matches only on `done`, a bug only on `fixed`, a milestone only on `complete`, not `active`). No per-type machinery in `aggregate`; the union lives in the plan-progress default and is author-overridable. (Schema-declared `achievedStatus` auto-derivation is the deferred follow-up, WORK-343.)
- [x] **Milestone scoping** is offered as a friendly `milestone=` attribute that lowers to `filter="milestone:…"` (the generic `filter` already supports it — no `aggregate` change).
- [x] Authors can still override via attributes (e.g. `{% plan-progress type="work" /%}` to scope to one type, or `{% plan-progress milestone="v0.19.0" /%}`) — the rune still accepts the relevant collection-shaped attributes and passes them through.
- [x] Rendered output is visually equivalent (or better) to today's plan-progress on a milestone page, on a generic plan dashboard, and on a single-type slice.
- [x] The old plan-specific render path / CSS (`packages/lumina/styles/runes/plan-progress.css`) is either removed or trimmed to plan-specific deltas only; the generic chip styling now comes from the restyled `badge` rune.
- [x] Tests in `plugins/plan/test/` cover the same scenarios the existing plan-progress tests do: default "show all," scoped-by-type, scoped-by-milestone, empty state.

## Approach
Two viable implementations: (1) plan-progress's transform emits the aggregate composition as a markdoc subtree (cleanest — true sugar; the post-process resolver then handles everything), or (2) plan-progress emits its own sentinel and a plan-side resolver does the same work `aggregate` would. (1) is preferred — it reuses the generic resolver and keeps plan-progress as pure markup composition. Either way, drop the plan-specific status-color CSS in favour of the badge rune's `data-status` / sentiment styling.

## Dependencies
- {% ref "WORK-294" /%} — the `aggregate` rune itself.
- {% ref "WORK-295" /%} — Lumina styling so the composed output looks right.

## References
- {% ref "SPEC-076" /%}

## Resolution

Completed: 2026-06-08

Branch: `claude/v0.19.0-rollups`

### What was done
- `plugins/plan/src/tags/plan-progress.ts`: rewritten as thin sugar over `aggregate` (mirrors plan-activity over collection). Lowers to `rune: 'aggregate'` + `aggregate-*` metas + AGGREGATE_SENTINEL + a default body (progress-bar preamble · per-status `type="status"` badge template · empty fallback). Defaults baked in: `type="work,bug"` (legacy `show` alias; `show="all"`→full set), `group="status"`, `value="status:/^(done|fixed|accepted|complete)$/"` (achieved union, option C), `milestone=`→`filter="milestone:…"`. type/value/filter/sort/limit author-overridable; body overridable.
- `plugins/plan/src/pipeline.ts`: removed `resolvePlanProgress`, `STATUS_LABELS`/`TYPE_LABELS`, the sentinel branch, and the `PLAN_PROGRESS_SENTINEL` import — the core `resolveAggregates` now handles it.
- `plugins/plan/src/config.ts`: removed the dead `PlanProgress` theme config (output is now `data-rune="aggregate"`).
- `packages/lumina`: deleted `styles/runes/plan-progress.css` + its `index.css` import (chrome is now the aggregate/progress/badge runes').
- `plugins/plan/test/plan-progress.test.ts`: 8 tests — lowering (defaults, type, legacy show, milestone→filter, value override, default-body composition) + an end-to-end `resolveAggregates` resolution (progress bar reads "3 of 5 done"; one status-typed badge per status with its count + humanized label).

### Notes
- **Refinement (review feedback):** composes one `aggregate` **per type** (each `group="status"`, `value="status:<that type's achieved status>"`) under an `h3` type heading ("Work", "Bugs", …), with the bar labelled by the achieved-status word ("Done", "Fixed", "Accepted", "Complete") — a single mixed-type bar conflated work-`done` with bug-`fixed`. A thin `PlanProgress` config + `plan-progress.css` (per-type layout only) were re-added; counting still lives entirely in `aggregate`. The achieved-`value` is now per-type (not the regex union).
- Behaviour change: a bare `{% plan-progress /%}` now scopes to the actionable `work,bug` set (was all types), per the criteria.
- **Deferred (user decision):** per-status badge *colour*. The `badge` rune keys colour off `data-meta-sentiment`, not `data-status` (the criterion's assumption), and `aggregate` doesn't project a per-group sentiment — SPEC-076's listed future extension. Badges ship `type="status"` neutral; colour is tracked in WORK-357 (the sentiment-projection extension), which also unblocks WORK-353 chart colouring.
- Regex value clause verified against the field-match grammar; `functions` are threaded into the resolver's embed config in production (site.ts), so the humanized status labels render.

{% /work %}
