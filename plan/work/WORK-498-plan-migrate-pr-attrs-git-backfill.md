{% work id="WORK-498" status="done" priority="medium" complexity="complex" milestone="v0.28.0" source="SPEC-049" tags="plan, migration, git, traceability, pr" pr="refrakt-md/refrakt#565" %}

# refrakt plan migrate pr-attrs — git backfill of PR references

Backfill the `pr` attribute on legacy `done` work / `fixed` bug items from git merge-commit history, so `plan status` rollups are rich from day one rather than skeletal (only ~2 of 177 items carry a PR today).

## Acceptance Criteria
- [x] `refrakt plan migrate pr-attrs` (CLI + MCP) walks git history, dry-run by default with `--apply` / `--git`
- [x] For each `done` work / `fixed` bug lacking `pr`, finds the status-flip commit, walks forward to the first reachable merge commit, and captures `Merge pull request #NNN` (repo slug from `origin`)
- [x] Writes resolved `pr="<org>/<repo>#<num>"` back to the work item file on `--apply`
- [x] Emits a report: resolved, skipped (multiple plausible merge commits), unresolved (direct-to-main / lost history) — unresolved items are listed, not modified
- [x] Modeled on the existing `migrate filenames` command structure
- [x] Tests cover resolution, the skip-on-ambiguity path, and the report shape (against a fixture repo or mocked git)

## Dependencies
- {% ref "WORK-496" /%} — the `pr` attribute this backfills

## References
- {% ref "SPEC-049" /%} — spec (Migration, Open Questions: migration false positives)

## Resolution

Completed: 2026-07-09

Branch: `claude/milestone-v0-28-0-llvtfa`
PR: refrakt-md/refrakt#565

### What was done
- `refrakt plan migrate pr-attrs` (CLI + MCP), dry-run default, --apply/--git. Resolves a done/fixed flip to the PR whose topic branch introduced the commit (reachable from second parent, not first), skips ambiguous multi-PR histories, reports unresolved untouched.
- Tests use a real git fixture (resolution, apply, direct-to-main unresolved, ambiguous skip, no-remote).

### Notes
- Not run with --apply on the corpus: this environment is a shallow clone, so most items' introducing merge is beyond the graft boundary. Run on a full clone before the release.

{% /work %}
