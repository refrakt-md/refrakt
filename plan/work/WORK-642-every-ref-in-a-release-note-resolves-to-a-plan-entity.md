{% work id="WORK-642" status="done" priority="medium" complexity="simple" source="SPEC-176" tags="site,changelog,release,validation,tests" milestone="v0.41.1" pr="refrakt-md/refrakt#704" %}

# Every ref in a release note resolves to a plan entity

`refrakt validate --deep` passes a page containing `{% ref "SPEC-99999" /%}`. Only the site
build reports it, as one "entity not found" warning among hundreds. A mistyped ID in a
release note would therefore ship as a dead drawer.

## Acceptance Criteria

- [x] A test fails when a file in `releases/notes/` contains a `{% ref %}` or `{% xref %}` whose target is not an ID or milestone name declared in the plan
- [x] The failure names the note file, the line and the unknown ID
- [x] Declarations inside code fences in `plan/` do not count as declared
- [x] The milestone openings WORK-641 uses as a fallback are checked the same way

## Approach

Collect declared IDs from the `id` attribute of `spec`, `work`, `bug` and `decision` tags and
the `name` attribute of `milestone` tags across the plan directory, skipping fenced blocks.
Then scan the notes for ref targets. This is a string check, so it needs no build and runs
with the rest of `scripts/*.test.mjs`.

## Blocked by

- {% ref "WORK-641" /%}

## References

- {% ref "SPEC-176" /%} D6.

## Resolution

Completed: 2026-10-15

Branch: `claude/site-changelog-readability-k4p902`
PR: refrakt-md/refrakt#704

### What was done
- `scripts/generate-changelog.mjs`: `declaredPlanIds` (spec/work/bug/decision ids and milestone names, fenced examples excluded), `unresolvedRefs`, and `releaseRefFindings`, which checks every note and every milestone opening used as a fallback.
- Tests on fixtures plus one over this repository's real notes and milestones.

### Notes
- Findings name the file, line and target. A string check, so it runs with `npm test` and needs no build.

{% /work %}
