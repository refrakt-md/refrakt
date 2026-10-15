{% work id="WORK-641" status="done" priority="high" complexity="moderate" source="SPEC-176" tags="site,changelog,release,scripts" milestone="v0.41.1" pr="refrakt-md/refrakt#704" %}

# The changelog generator merges handwritten release notes and collapses changeset detail

`scripts/generate-changelog.mjs` writes `site/content/releases.md` as one flat list of
changeset bullets per version. This item gives the changelog the shape {% ref "SPEC-176" /%}
describes: an index of summaries at `/releases`, and a page per release with drawers and the
full list of changes (D4, revised while implementing this item).

## Acceptance Criteria

- [x] A file at `releases/notes/v<version>.md` is placed verbatim at the top of that version's entry, with its runes left live
- [x] A note for a version that has no changelog entry is ignored without failing the script
- [x] Without a note, a version whose milestone exists gets the milestone's title in bold and its first paragraph, with `preview="drawer"` added to each plain `{% ref %}`
- [x] A version with neither a note nor a milestone gets no summary
- [x] `/releases` lists every release with its summary, refs flattened to plain text, and a link to the release's page
- [x] Each release with a summary or a change has a page at `/releases/v<version>` with the summary, its drawers, and every changeset bullet, processed exactly as today
- [x] A release page whose version no longer has a changelog entry is removed when the generator runs
- [x] `scripts/generate-changelog.test.mjs` covers the note, the milestone fallback, the ref rewrite, the index, the release page and the no-summary case
- [x] `site/content/releases/` is generated in place of `site/content/releases.md`, and the site builds with no new errors

## Approach

Milestones are found by reading the `name` attribute of each file in the plan directory's
`milestones/` folder (from `plan.dir` in `refrakt.config.json`), not by filename. "First
paragraph" means the first block after the `#` heading that is a paragraph, so a milestone
that opens with a list or a heading falls through to the next paragraph.

Keep the note and milestone readers as exported functions beside `parseChangelog`, so the
test imports them the same way it does today and importing the module still does not
write the release pages.

## References

- {% ref "SPEC-176" /%} D1–D4.

## Resolution

Completed: 2026-10-15

Branch: `claude/site-changelog-readability-k4p902`
PR: refrakt-md/refrakt#704

### What was done
- `scripts/generate-changelog.mjs`: writes `site/content/releases/index.md` (every release with its summary, refs flattened, a note's `Background:` paragraph left out, and a link to its page) and one page per release with the summary's drawers and every changeset bullet. Stale release pages are removed. Summary = `releases/notes/v<version>.md`, else the milestone's bold title and first prose paragraph with `preview="drawer"` added to plain refs.
- `site/content/releases.md` removed; 75 release pages + index generated. Bullets byte-identical to before.
- `scripts/generate-changelog.test.mjs`: index, release page, notes, milestone fallback, ref rewrite, no-summary cases.
- `refrakt.config.json` stale lists, RELEASING.md and two link-checker comments point at `site/content/releases/`.
- `plan/specs/SPEC-054-*`: an old plan-site link to SPEC-046 became a ref; drawn content is prerender-crawled, so it failed the build.

### Notes
- SPEC-176 D4 revised: one page with `{% details %}` measured 6.8 MB vs 2.0 MB, because each drawer embeds a whole spec. The index is now ~400 KB with no drawers. D8 records the SPEC-054 finding.

{% /work %}
