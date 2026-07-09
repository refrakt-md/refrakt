{% work id="WORK-498" status="draft" priority="medium" complexity="complex" milestone="v0.28.0" source="SPEC-049" tags="plan, migration, git, traceability, pr" %}

# refrakt plan migrate pr-attrs — git backfill of PR references

Backfill the `pr` attribute on legacy `done` work / `fixed` bug items from git merge-commit history, so `plan status` rollups are rich from day one rather than skeletal (only ~2 of 177 items carry a PR today).

## Acceptance Criteria
- [ ] `refrakt plan migrate pr-attrs` (CLI + MCP) walks git history, dry-run by default with `--apply` / `--git`
- [ ] For each `done` work / `fixed` bug lacking `pr`, finds the status-flip commit, walks forward to the first reachable merge commit, and captures `Merge pull request #NNN` (repo slug from `origin`)
- [ ] Writes resolved `pr="<org>/<repo>#<num>"` back to the work item file on `--apply`
- [ ] Emits a report: resolved, skipped (multiple plausible merge commits), unresolved (direct-to-main / lost history) — unresolved items are listed, not modified
- [ ] Modeled on the existing `migrate filenames` command structure
- [ ] Tests cover resolution, the skip-on-ambiguity path, and the report shape (against a fixture repo or mocked git)

## Dependencies
- {% ref "WORK-496" /%} — the `pr` attribute this backfills

## References
- {% ref "SPEC-049" /%} — spec (Migration, Open Questions: migration false positives)

{% /work %}
