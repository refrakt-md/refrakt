{% work id="WORK-643" status="ready" priority="medium" complexity="simple" source="SPEC-176" tags="site,changelog,release,scripts,docs" milestone="v0.41.1" %}

# A command drafts a release note from the milestone

Handwritten notes tend to stop after a few releases unless writing one is close to free. This
command writes everything but the opening sentences.

## Acceptance Criteria

- [ ] `npm run release-notes:draft -- <version>` writes `releases/notes/v<version>.md`, and refuses to overwrite an existing file
- [ ] The draft contains a placeholder for the opening, prefilled with the milestone's title and first paragraph when the milestone exists
- [ ] The draft contains a commented-out action-needed `{% hint type="warning" %}` block
- [ ] The background line has drawer refs to the milestone, to the distinct `source` specs of its work and bug items, and to its bugs
- [ ] Links are taken from `milestone="vX.Y.Z"` on work and bug items, not from `released-in`
- [ ] `RELEASING.md` has a step to draft and finish the note before merging the release PR

## Approach

Reuse the milestone and ID readers from WORK-641 and WORK-642 rather than parsing the plan a
third time. Order the background refs so the milestone comes first, then specs, then bugs, each
group in ID order.

## Blocked by

- {% ref "WORK-641" /%}

## References

- {% ref "SPEC-176" /%} D5.

{% /work %}
