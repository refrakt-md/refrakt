{% work id="WORK-031" status="ready" priority="high" complexity="moderate" tags="cli, plan, ai-workflow" %}

# `plan next` Command

> Ref: {% ref "SPEC-022" /%} (Plan CLI — `next` section, AI Agent Integration section)

## Summary

Dependency-aware work item selection. Finds the highest-priority ready item, skipping items whose dependencies aren't complete. This is the entry point of the AI agent workflow — `refrakt plan next --format json` tells the agent what to work on.

## Acceptance Criteria

- [ ] Scans for work items with `status="ready"` and bugs with `status="confirmed"`
- [ ] Excludes items whose dependency IDs (from References/Dependencies section) are not yet `done` or `fixed`
- [ ] Sorts by priority (critical > high > medium > low), then complexity (simpler items first as tiebreaker)
- [ ] `--milestone <name>` scopes results to a specific milestone
- [ ] `--tag <tag>`, `--assignee <name>`, `--type work|bug|all` filters work correctly
- [ ] `--count N` returns top N items (default: 1)
- [ ] `--format json` outputs structured data including criteria list, referenced specs, dependencies, and file path
- [ ] Text output shows ID, title, priority, complexity, file path, and acceptance criteria
- [ ] Exit codes: 0 = items found, 1 = no matches, 2 = invalid arguments
- [ ] Tests for filtering, sorting, dependency exclusion, and edge cases

## Approach

Use the scanner ({% ref "WORK-028" /%}) to get all entities. Build a status lookup map (ID → status). Filter work/bug items by ready status, then exclude those with unfinished dependencies. Sort and slice. For JSON output, include the full criteria list and spec references.

## Dependencies

- {% ref "WORK-027" /%} (plugin architecture)
- {% ref "WORK-028" /%} (plan file scanner)

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}
