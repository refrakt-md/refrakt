{% work id="WORK-136" status="ready" priority="high" complexity="simple" source="SPEC-038" tags="plan, cli, git, history" %}

# CLI `plan history` single-entity mode

Implement the `plan history <ID>` CLI subcommand for viewing the git-derived lifecycle timeline of a single plan entity.

## Acceptance Criteria

- [ ] `plan history WORK-024` displays the entity's timeline in reverse chronological order
- [ ] Each event shows date, structured changes, and short commit hash
- [ ] Attribute changes display as `field: old → new`
- [ ] Criteria changes display with ☑/☐ markers
- [ ] Resolution events are shown when a Resolution section is added/modified
- [ ] Content-only events are included for completeness
- [ ] Sub-changes within an event (multiple attributes, multiple criteria) are indented
- [ ] Entity title is displayed as a header line
- [ ] `--format json` outputs machine-readable JSON
- [ ] Command is registered in the plan CLI plugin
- [ ] Error handling for unknown entity IDs

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction

## Approach

Add a `history` command handler in `runes/plan/src/commands/history.ts`. Register it in `runes/plan/src/cli-plugin.ts`. The handler resolves the entity ID to a file path using the existing scanner, then calls `extractEntityHistory()` and formats the output.

The formatter should produce the columnar format shown in the spec: date left-aligned, changes indented, commit hash right-aligned.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (CLI: `plan history` — Single-entity mode)

{% /work %}
