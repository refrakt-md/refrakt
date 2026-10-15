{% work id="WORK-640" status="ready" priority="medium" complexity="simple" source="SPEC-160" tags="site,changelog,release,validation,tests" %}

# Every ref in a release note resolves to a plan entity

`refrakt validate --deep` passes a page containing `{% ref "SPEC-99999" /%}`. Only the site
build reports it, as one "entity not found" warning among hundreds. A mistyped ID in a
release note would therefore ship as a dead drawer.

## Acceptance Criteria

- [ ] A test fails when a file in `releases/notes/` contains a `{% ref %}` or `{% xref %}` whose target is not an ID or milestone name declared in the plan
- [ ] The failure names the note file, the line and the unknown ID
- [ ] Declarations inside code fences in `plan/` do not count as declared
- [ ] The milestone openings WORK-639 uses as a fallback are checked the same way

## Approach

Collect declared IDs from the `id` attribute of `spec`, `work`, `bug` and `decision` tags and
the `name` attribute of `milestone` tags across the plan directory, skipping fenced blocks.
Then scan the notes for ref targets. This is a string check, so it needs no build and runs
with the rest of `scripts/*.test.mjs`.

## Blocked by

- {% ref "WORK-639" /%}

## References

- {% ref "SPEC-160" /%} D6.

{% /work %}
