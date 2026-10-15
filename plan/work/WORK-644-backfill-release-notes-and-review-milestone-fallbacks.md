{% work id="WORK-644" status="ready" priority="medium" complexity="simple" source="SPEC-176" tags="site,changelog,release,docs" milestone="v0.41.1" %}

# Backfill release notes and review milestone fallbacks

Once the generator handles notes, the existing page needs content in the summary slot where the
milestone fallback is missing or reads badly. See the migration table in {% ref "SPEC-176" /%}.

## Acceptance Criteria

- [ ] Handwritten notes exist for v0.39.0, v0.40.0 and v0.41.0, each with an action-needed block where that release requires a change from users
- [ ] v0.4.0 to v0.9.0 each have a one-line note linking their `whats-new-in-0-x` blog post
- [ ] Each of the 38 milestone openings used as a fallback has been read on the rendered index, and those that do not read as a summary have a note file instead
- [ ] No milestone file is edited to improve its opening as a summary
- [ ] `site/content/releases/` is regenerated and the site builds with no new errors

## Approach

The v0.41.0 draft from the session that produced SPEC-176 is the starting point for its note.
Those three notes are the examples later releases follow, so keep them short: two or three
sentences, an action-needed block only when one is needed, then the background line.

## Blocked by

- {% ref "WORK-641" /%}
- {% ref "WORK-642" /%}

## References

- {% ref "SPEC-176" /%} "Scope of the migration".

{% /work %}
