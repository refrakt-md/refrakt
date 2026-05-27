{% work id="WORK-281" status="done" priority="medium" complexity="moderate" source="ADR-011" tags="plan,plan-site,collection,milestone,progress" milestone="v0.16.0" %}

# Milestone page via collection; render progress via the generic progress rune

Render a milestone's work via a `collection` in the milestone template (the link is the forward field `work.data.milestone`), replacing the rune-injected auto-backlog. Render the completion **progress** via the new generic `progress` rune (WORK-285) fed an aggregate the plan plugin writes onto the milestone entity — **not** via `plan-progress`, which is a status-count tally, not a bar.

## Acceptance Criteria
- [x] The milestone detail template renders its work via `{% collection type="work,bug" filter="milestone:$item.id" group="status" sort="priority" %}` with a `card`/work-card partial.
- [x] Status groups appear in actionable-first order (via WORK-283's `work.status` override; the `matches` lifecycle order is the fallback).
- [x] The plan plugin's `aggregate` computes the criteria rollup per milestone (sum of `checkedCount` / `totalCount` over the milestone's work+bug) and writes it onto the milestone entity's `data` (e.g. `progressDone` / `progressTotal`).
- [x] The milestone template renders the bar via the generic `progress` rune fed those fields (e.g. `{% progress value=$item.data.progressDone max=$item.data.progressTotal /%}`) — no progress markup baked into the milestone rune.
- [ ] No milestone work is rendered via the injected `buildMilestoneBacklog` path (its removal is WORK-282).
- [x] The plan-site milestone page shows the same information as before (work grouped by status + a completion bar).

## Approach
Add the collection to the milestone render-template (WORK-280 establishes the template pattern). Move the rollup computation out of `buildMilestoneBacklog` (pipeline.ts:711) into the `aggregate` hook, writing the totals onto each milestone's `data` so the template can read them. Render via WORK-285's `progress` rune. (Correction from the original plan: `plan-progress` is a type×status tally, so it is not the home for a single milestone's bar.)

## Dependencies
WORK-280 (entity templates), WORK-283 (status ordering override), WORK-285 (generic `progress` rune).

## References
- {% ref "ADR-011" /%} — milestone work → collection; progress rollup relocation.

## Resolution

Completed: 2026-05-27

Branch: `claude/v0.16.0`

### What was done
- `plan-site/content/_partials/entity/milestone.md` — new render template, parallel to the work/spec/bug/decision templates from WORK-280. Composes `{% expand $item.id level=1 /%}` (the milestone's own authored body), then a `## Progress` section with `{% progress value=$item.data.progressDone max=$item.data.progressTotal /%}`, then a `## Work` section with `{% collection type="work,bug" filter=join(["milestone:", $item.id], "") group="status" sort="priority" %}` whose body delegates to the dispatcher partial from WORK-280, then the standard `## Relationships` and `## History` blocks. The status-grouped collection automatically picks up the actionable-first order from WORK-283's `work.status` override via the shared `Ordering`.
- `refrakt.config.json` — milestone entityRoute switched from inline `render: "{% expand $item.name level=1 /%}"` to `render-template: "entity/milestone.md"`.
- `plugins/plan/src/pipeline.ts` (`performUnconditionalScan`) — when scanning a work or bug file, populate `data.checkedCount` and `data.totalCount` from the entity's `criteria` array. The page-walk register path already wrote those (via `countCheckboxes(tag)`); without this, the standard-load path's milestone rollup ran on empty data and every progress bar was 0%.
- `plugins/plan/src/pipeline.ts` (end of `register`, after the scan) — per-milestone rollup sums `checkedCount` / `totalCount` across all work+bug entities whose `data.milestone` matches the milestone's id, writing `progressDone` / `progressTotal` onto the milestone entity's `data`. Originally drafted in `aggregate`, but the entityRoutes adapter snapshots `$item` into each contributed page's variables at the **contributePages** phase (between register and aggregate), and the `progress` rune is identity-transform-only — so its attributes resolve at transform time, not postProcess. Moving the rollup to the end of `register` ensures the values are on the entity before any contributed page captures them. The "second register pass" the cross-page pipeline runs after contributePages re-derives them idempotently.

### How `filter=join([...])` ended up there
Markdoc's `ValueString` grammar is a pure string literal — it doesn't interpolate variables, so `filter="milestone:$item.id"` (the literal example from the WORK item) ships the string `"milestone:$item.id"` to the filter parser, which finds no entities with `data.milestone === "$item.id"` and renders an empty collection. Function-call attribute values do compose at transform time, and Markdoc accepts array literals as function arguments, so `filter=join(["milestone:", $item.id], "")` produces the right string at transform time. The default refrakt `functions` set already exports `join`, so no engine change was needed. Worth filing a follow-up to either teach Markdoc string interpolation or surface a `concat` function so future authors don't trip on this — for now `join([...], "")` is the idiom.

### Verification
- `plan-site` build: 0 errors / 0 warnings.
- `/milestones/v0.16.0/`: progress bar reads `68/146` (47%), Work section renders 26 cards in 3 status groups (in-progress → ready → done — actionable-first), all backed by the dispatcher partial routing to `work-card.md`.
- `/milestones/v1.0.0/`: progress bar reads `127/345` (37%).
- 592/592 plan + content tests pass.

### What's still pending
The "No milestone work is rendered via the injected `buildMilestoneBacklog` path" criterion is still false — the plan plugin's `postProcess` still appends the auto-backlog to every milestone rune tag. That section now sits *inside* the expand-inlined milestone body (above the template's `## Progress` / `## Work` sections), so milestone detail pages temporarily show the work listing twice. WORK-282 deletes the injection and the duplication along with it; both criteria for that item are otherwise already wired here.

{% /work %}
