{% work id="WORK-137" status="ready" priority="medium" complexity="moderate" source="SPEC-038" tags="plan, cli, git, history" %}

# CLI `plan history` global mode and filters

Implement the global history feed and all filter flags for the `plan history` CLI command. The global mode shows recent events across all entities, grouped by commit.

## Acceptance Criteria

- [ ] `plan history --limit 20` shows commit-grouped global feed
- [ ] Commits that touch multiple entities are grouped as a single entry
- [ ] Each commit entry shows date, short hash, and commit message
- [ ] Entity changes within a commit are listed as compact summary lines
- [ ] Criteria in global mode are summarised as counts (`☑ 8/8`) not individual items
- [ ] `--since` filter maps to `git log --since` for efficient time-based filtering
- [ ] `--since` accepts relative durations (`7d`, `30d`) and ISO dates
- [ ] `--type` filter restricts to entity types (`work`, `spec`, `bug`, `decision`, comma-separated)
- [ ] `--author` filter restricts to commits by a specific author (substring match)
- [ ] `--status` filter shows only events where an entity transitioned to the given status
- [ ] `--all` flag includes content-only events in global mode (omitted by default)
- [ ] `--format json` outputs machine-readable JSON for global mode
- [ ] `--limit` defaults to 20 when omitted

## Dependencies

- {% ref "WORK-134" /%} — Event model and per-entity extraction
- {% ref "WORK-135" /%} — Batch extraction
- {% ref "WORK-136" /%} — Single-entity CLI (shared command registration)

## Approach

Extend the `history` command handler to detect global mode (no entity ID argument). Use batch extraction to collect all events, then group by commit hash. Apply post-extraction filters for `--type`, `--author`, `--status`. The `--since` flag is passed through to `git log --since` for efficiency.

The commit-grouped formatter collects events that share a commit hash and renders them as a single entry with the commit message as header and entity summaries below.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (CLI: `plan history` — Global mode + Filters)

{% /work %}
