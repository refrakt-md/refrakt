{% work id="WORK-032" status="ready" priority="medium" complexity="moderate" tags="cli, plan" %}

# `plan status` Command

> Ref: SPEC-022 (Plan CLI — `status` section)

## Summary

Terminal status summary showing entity counts by type and status, active milestone progress, blocked items, highest-priority ready items, and warnings. Quick overview without opening a browser.

## Acceptance Criteria

- [ ] Counts entities by type and status (specs, work, bugs, decisions)
- [ ] Shows active milestone with progress bar (done/total)
- [ ] Lists blocked items with their blockers
- [ ] Lists highest-priority ready items (top 3-5)
- [ ] Reports warnings: broken refs, orphaned work items (no milestone), stale in-progress
- [ ] `--format json` outputs structured data for scripting
- [ ] `--milestone <name>` scopes to a specific milestone
- [ ] Tests for counting, progress calculation, and warning detection

## Dependencies

- WORK-027 (plugin architecture)
- WORK-028 (plan file scanner)

## References

- SPEC-022 (Plan CLI)

{% /work %}
