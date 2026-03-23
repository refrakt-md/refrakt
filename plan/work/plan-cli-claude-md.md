{% work id="WORK-036" status="ready" priority="high" complexity="simple" tags="cli, plan, docs" %}

# Update CLAUDE.md files for plan CLI usage

> Ref: {% ref "SPEC-022" /%} (Plan CLI)

## Summary

Once the plan CLI commands are fully implemented, update the root `CLAUDE.md` and `plan/CLAUDE.md` files so that Claude Code sessions know how and when to use `refrakt plan` commands instead of manually editing Markdoc files.

Currently the Plan section in root `CLAUDE.md` and the Workflow section in `plan/CLAUDE.md` instruct Claude to manually edit status attributes and checkboxes in `.md` files. These should be updated to use the CLI equivalents (`refrakt plan update`, `refrakt plan next`, `refrakt plan status`, etc.) once those commands are available.

## Acceptance Criteria

- [ ] Root `CLAUDE.md` Plan section uses `refrakt plan` commands in its workflow instructions
- [ ] `plan/CLAUDE.md` workflow section references CLI commands for status transitions and checkbox toggling
- [ ] Examples show real command invocations (e.g., `refrakt plan update WORK-001 --status in-progress`)
- [ ] Documents `refrakt plan next` for finding the next work item
- [ ] Documents `refrakt plan status` for viewing project state
- [ ] Preserves existing guidance about reading specs, decisions, and dependencies before implementing
- [ ] Only documents commands that are actually implemented at time of writing (no stubs)

## Approach

Straightforward text editing of two files. Should be done after the core commands (`update`, `next`, `status`) are all implemented and tested — those are the ones referenced in the workflow.

## Dependencies

- {% ref "WORK-030" /%} (plan update — done)
- {% ref "WORK-031" /%} (plan next)
- {% ref "WORK-029" /%} (plan status)

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}
