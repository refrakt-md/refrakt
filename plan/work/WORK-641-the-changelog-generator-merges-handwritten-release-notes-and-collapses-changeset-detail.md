{% work id="WORK-641" status="ready" priority="high" complexity="moderate" source="SPEC-176" tags="site,changelog,release,scripts" milestone="v0.41.1" %}

# The changelog generator merges handwritten release notes and collapses changeset detail

`scripts/generate-changelog.mjs` writes `site/content/releases.md` as one flat list of
changeset bullets per version. This item gives each entry the shape {% ref "SPEC-176" /%}
describes: a summary on top, then the bullets inside `{% details %}`.

## Acceptance Criteria

- [ ] A file at `releases/notes/v<version>.md` is placed verbatim at the top of that version's entry, with its runes left live
- [ ] A note for a version that has no changelog entry is ignored without failing the script
- [ ] Without a note, a version whose milestone exists gets the milestone's title in bold and its first paragraph, with `preview="drawer"` added to each plain `{% ref %}`
- [ ] A version with neither a note nor a milestone gets no summary
- [ ] Every entry's changeset bullets render inside `{% details summary="All changes in vX.Y.Z" %}`, processed exactly as today
- [ ] `scripts/generate-changelog.test.mjs` covers the note, the milestone fallback, the ref rewrite and the no-summary case
- [ ] `site/content/releases.md` is regenerated, and the site builds with no new errors

## Approach

Milestones are found by reading the `name` attribute of each file in the plan directory's
`milestones/` folder (from `plan.dir` in `refrakt.config.json`), not by filename. "First
paragraph" means the first block after the `#` heading that is a paragraph, so a milestone
that opens with a list or a heading falls through to the next paragraph.

Keep the note and milestone readers as exported functions beside `parseChangelog`, so the
test imports them the same way it does today and importing the module still does not
rewrite `releases.md`.

## References

- {% ref "SPEC-176" /%} D1–D4.

{% /work %}
