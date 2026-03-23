{% work id="WORK-032" status="done" priority="medium" complexity="moderate" tags="cli, plan" %}

# `plan status` Command

> Ref: {% ref "SPEC-022" /%} (Plan CLI — `status` section)

## Summary

Terminal status summary showing entity counts by type and status, active milestone progress, blocked items, highest-priority ready items, and warnings. Quick overview without opening a browser.

## Acceptance Criteria

- [x] Counts entities by type and status (specs, work, bugs, decisions)
- [x] Shows active milestone with progress bar (done/total)
- [x] Lists blocked items with their blockers
- [x] Lists highest-priority ready items (top 3-5)
- [x] Reports warnings: broken refs, orphaned work items (no milestone), stale in-progress
- [x] `--format json` outputs structured data for scripting
- [x] `--milestone <name>` scopes to a specific milestone
- [x] Tests for counting, progress calculation, and warning detection

## Dependencies

- {% ref "WORK-027" /%} (plugin architecture)
- {% ref "WORK-028" /%} (plan file scanner)

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}
