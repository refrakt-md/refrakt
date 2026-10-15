{% work id="WORK-644" status="done" priority="medium" complexity="simple" source="SPEC-176" tags="site,changelog,release,docs" milestone="v0.41.1" pr="refrakt-md/refrakt#704" %}

# Backfill release notes and review milestone fallbacks

Once the generator handles notes, the existing page needs content in the summary slot where the
milestone fallback is missing or reads badly. See the migration table in {% ref "SPEC-176" /%}.

## Acceptance Criteria

- [x] Handwritten notes exist for v0.39.0, v0.40.0 and v0.41.0, each with an action-needed block where that release requires a change from users
- [x] v0.4.0 to v0.9.0 each have a one-line note linking their `whats-new-in-0-x` blog post
- [x] Each of the 38 milestone openings used as a fallback has been read on the rendered index, and those that do not read as a summary have a note file instead
- [x] No milestone file is edited to improve its opening as a summary
- [x] `site/content/releases/` is regenerated and the site builds with no new errors

## Approach

The v0.41.0 draft from the session that produced SPEC-176 is the starting point for its note.
Those three notes are the examples later releases follow, so keep them short: two or three
sentences, an action-needed block only when one is needed, then the background line.

## Blocked by

- {% ref "WORK-641" /%}
- {% ref "WORK-642" /%}

## References

- {% ref "SPEC-176" /%} "Scope of the migration".

## Resolution

Completed: 2026-10-15

Branch: `claude/site-changelog-readability-k4p902`
PR: refrakt-md/refrakt#704

### What was done
- `releases/notes/`: handwritten notes for v0.39.0, v0.40.0 and v0.41.0 with action-needed blocks (snippet wrapper and parentUrl; theme overrides of identity fields; content-unmatched and schema-table coverage).
- Blog-link notes for v0.4.0 to v0.9.0.
- Notes for seven milestones whose opening did not read as a summary: v0.36–v0.38 (problem only), v0.24 (scheduling), v0.31 (jargon), v0.11 and v0.12 (list-first, title only). 27 releases keep the milestone fallback.

### Notes
- No milestone file was edited. Claims in the notes were checked against each release's changelog.

{% /work %}
