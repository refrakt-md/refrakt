{% work id="WORK-296" status="ready" priority="medium" complexity="moderate" source="SPEC-076" tags="aggregate,plan,plan-progress,sugar" milestone="v0.16.0" %}

# Decompose plan-progress as sugar over aggregate

With the generic `aggregate` rune in place ({% ref "WORK-294" /%}), `plan-progress` becomes **thin sugar over `aggregate`** — same pattern as `backlog` / `decision-log` / `plan-activity` wrapping `collection`. plan-progress's current rendering (the progress bar + per-status badge row) is exactly the aggregate composition; we just need plan-specific defaults baked in so the call site stays `{% plan-progress /%}`.

## Acceptance Criteria
- [ ] `plan-progress` is rewritten to emit (or delegate to) an `aggregate` composition rather than its own render path: a `progress` bar in the preamble + a `badge` row in the per-group template + the empty-state fallback.
- [ ] Plan-specific defaults are baked in: `type` defaults to the plan content types (`work,bug,spec,decision,milestone` — or whatever the current "show all" set is); `value="status:done"` (and the equivalent achievement statuses per type if needed); `group="status"`; status enum drives `data-status` on badges so they pick up the existing sentiment-mapped colors via the restyled `badge` rune.
- [ ] Authors can still override via attributes (e.g. `{% plan-progress type="work" /%}` to scope to one type) — the rune still accepts the relevant collection-shaped attributes and passes them through.
- [ ] Rendered output is visually equivalent (or better) to today's plan-progress on a milestone page, on a generic plan dashboard, and on a single-type slice.
- [ ] The old plan-specific render path / CSS (`packages/lumina/styles/runes/plan-progress.css`) is either removed or trimmed to plan-specific deltas only; the generic chip styling now comes from the restyled `badge` rune.
- [ ] Tests in `plugins/plan/test/` cover the same scenarios the existing plan-progress tests do: default "show all," scoped-by-type, scoped-by-milestone, empty state.

## Approach
Two viable implementations: (1) plan-progress's transform emits the aggregate composition as a markdoc subtree (cleanest — true sugar; the post-process resolver then handles everything), or (2) plan-progress emits its own sentinel and a plan-side resolver does the same work `aggregate` would. (1) is preferred — it reuses the generic resolver and keeps plan-progress as pure markup composition. Either way, drop the plan-specific status-color CSS in favour of the badge rune's `data-status` / sentiment styling.

## Dependencies
- {% ref "WORK-294" /%} — the `aggregate` rune itself.
- {% ref "WORK-295" /%} — Lumina styling so the composed output looks right.

## References
- {% ref "SPEC-076" /%}

{% /work %}
