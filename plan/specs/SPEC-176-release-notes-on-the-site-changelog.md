{% spec id="SPEC-176" status="accepted" tags="site, changelog, release, plan, docs" %}

# Release notes on the site changelog

The site changelog (`site/content/releases.md`) is generated from the per-package changesets
and reads like it. It is 1,508 lines over 75 versions, every entry a flat list of bullets
written for someone reading a diff. v0.41.0 has around 30, and nothing distinguishes what the
release is for from an incidental export added along the way, or says what a user has to do
after upgrading.

The plan already knows what each release was for. Every minor release from v0.9.0 to v0.41.0
has a milestone, and each milestone opens with a title and a paragraph saying what it
delivers and which specs it implements. This spec puts a short, user-facing note at the top
of each entry, links the plan entities behind it as drawers, and collapses the changeset
detail underneath.

## Shape of an entry

```markdoc
## v0.41.0 - October 14, 2026

**Composed runes you can ship.** Two or three sentences, written for users, on what the
release is for.

{% hint type="warning" %}
**Action needed:** only when upgrading needs a change from the reader.
{% /hint %}

Background: {% ref "v0.41.0" preview="drawer" label="the milestone" /%} ·
{% ref "SPEC-153" preview="drawer" /%} · {% ref "BUG-028" preview="drawer" /%}

{% details summary="All changes in v0.41.0" %}
- the changeset bullets, exactly as generated today
{% /details %}
```

## Decisions

### D1 — `releases.md` stays fully generated

Notes are merged in by `scripts/generate-changelog.mjs`, which already runs in
`npm run version-packages`, so the changesets action runs it when it opens the
"chore: version packages" PR. Nobody edits `releases.md` by hand, and it stays listed under
`stale.generated` and `stale.archival` in `refrakt.config.json`.

### D2 — One note per release, in `releases/notes/`

A note is a Markdoc fragment at `releases/notes/v<version>.md`, at the repository root. It sits
outside `site/content` so it gets no route of its own, and outside `plan/` because it is
written for users, not for planning. The generator places its content verbatim at the top of
the matching version's entry. Unlike changeset text, it is **not** sanitised: its runes are
meant to be live.

A note for a version that has no changelog entry yet (written ahead of the release) is
ignored, not an error.

### D3 — Without a note, use the milestone's opening

When no note file exists and a milestone is named after the version, the generator uses the
milestone's title (the text after the `—` in its `#` heading) in bold, followed by its first
paragraph. Every plain `{% ref %}` in that paragraph gets `preview="drawer"`, because plan
entities have no page on the main site and a plain ref there renders as unlinked text.

The opening is written for maintainers, so it is a fallback, not the goal: a release always
gets a summary, and a handwritten note replaces it. A release with neither a note nor a
milestone (most patch releases) gets no summary, only the collapsed detail.

### D4 — Changeset detail goes inside `{% details %}`

The generated bullets keep today's processing (`parseChangelog`, `processBulletBlock`,
fence and table stripping) and move inside a `{% details %}` block. This makes the page
scannable: 75 entries read as 75 summaries, and nothing is lost.

### D5 — Background links are drafted from the milestone, not from `released-in`

`released-in` is set on a spec after the release ships, so it is empty while the note is
being written. The milestone links exist from the start: the work and bug items with
`milestone="vX.Y.Z"`, and their `source` specs. A draft command (WORK-643) writes those as
drawer refs, so the person releasing writes only the opening sentences and decides whether an
action-needed block is needed.

### D6 — Refs in notes are checked in tests

`refrakt validate --deep` does not report a `{% ref %}` to an ID that does not exist; only the
site build does, as one warning among hundreds. A test in `scripts/` fails when a note
references an ID the plan does not declare, so a mistyped ID fails CI instead of shipping a
dead drawer.

### D7 — Plan entities are shown only as drawers

The plan site is being retired, and plan content on the main site will be shown only through
drawers. So a drawer has no "view full page" footer link and refs nested inside a drawer body
render as unlinked text. Both are acceptable, and neither renders a broken link. This spec
does not add page URLs for plan entities on the main site.

## Scope of the migration

The new generator applies to every version at once, because the page is regenerated from the
changelogs. The summary slot is filled as follows:

| Releases | Count | Summary |
|---|---|---|
| Milestone, no note | 35 | Milestone opening (D3) |
| v0.39.0, v0.40.0, v0.41.0 | 3 | Handwritten notes |
| v0.4.0 to v0.9.0 minor releases | 6 | One-line note linking the `whats-new-in-0-x` blog post |
| Patch releases | ~28 | None, collapsed detail only |
| v0.2.0, v0.3.0, v0.10.0 | 3 | None |

The 38 milestone openings are reviewed; one that reads badly as a summary gets a note file,
and the milestone itself is left alone.

## Non-goals

- Rewriting existing changeset text, or writing notes for every past release.
- Feeding notes into the npm or GitHub release bodies. The changesets action writes those
  from the changesets, and that is unchanged.
- One page per release. The single page with collapsed detail comes first; per-release pages
  can follow if notes grow longer.
- Making `refrakt validate --deep` catch unresolved refs, and the styling and build-log
  volume of unresolved refs inside drawers. Each is worth fixing on its own; D6 covers what
  release notes need.

## Implementation

- {% ref "WORK-641" /%}: the generator merges notes, falls back to the milestone opening and
  collapses the detail (D1–D4).
- {% ref "WORK-642" /%}: the test that every ref in a note resolves (D6).
- {% ref "WORK-643" /%}: the draft command and the RELEASING.md step (D5).
- {% ref "WORK-644" /%}: the backfill and the review of milestone openings.

{% /spec %}
