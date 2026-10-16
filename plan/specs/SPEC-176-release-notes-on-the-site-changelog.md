{% spec id="SPEC-176" status="implemented" tags="site, changelog, release, plan, docs" %}

# Release notes on the site changelog

The site changelog (`site/content/releases.md`, before this spec) is generated from the per-package changesets
and reads like it. It is 1,508 lines over 75 versions, every entry a flat list of bullets
written for someone reading a diff. v0.41.0 has around 30, and nothing distinguishes what the
release is for from an incidental export added along the way, or says what a user has to do
after upgrading.

The plan already knows what each release was for. Every minor release from v0.9.0 to v0.41.0
has a milestone, and each milestone opens with a title and a paragraph saying what it
delivers and which specs it implements. This spec gives every release a short, user-facing
summary, lists those summaries on `/releases`, and gives each release a page of its own with
the plan entities behind it as drawers and the full list of changes.

## Shape of the pages

The index, `/releases`, one entry per release:

```markdoc
## v0.41.0 · Composed runes you can ship - October 9, 2026

Two or three sentences, written for users, on what the release is for (SPEC-153).

[All 33 changes in v0.41.0 →](/releases/v0.41.0)
```

A release page, `/releases/v0.41.0`:

```markdoc
# v0.41.0 · Composed runes you can ship

Released October 9, 2026 · [All releases](/releases)

The same summary, with its refs as drawers ({% ref "SPEC-153" preview="drawer" /%}).

{% hint type="warning" %}
**Action needed:** only when upgrading needs a change from the reader.
{% /hint %}

## Changes

- the changeset bullets, exactly as generated today
```

## Decisions

### D1 — The changelog stays fully generated

Notes are merged in by `scripts/generate-changelog.mjs`, which already runs in
`npm run version-packages`, so the changesets action runs it when it opens the
"chore: version packages" PR. Nobody edits `site/content/releases/` by hand, and it stays
listed under `stale.generated` and `stale.archival` in `refrakt.config.json`.

### D2 — One note per release, in `releases/notes/`

A note is a Markdoc fragment at `releases/notes/v<version>.md`, at the repository root. It sits
outside `site/content` so it gets no route of its own, and outside `plan/` because it is
written for users, not for planning. The generator places its content verbatim as the
release's summary. Unlike changeset text, it is **not** sanitised: its runes are meant to be
live. A `#` or `##` heading is rejected, naming the file, because `##` would start a new
release inside `{% changelog %}`.

A note for a version that has no changelog entry yet (written ahead of the release) is
ignored, not an error.

### D3 — Without a note, use the milestone's opening

When no note file exists and a milestone is named after the version, the generator uses the
milestone's first paragraph as the summary. On the release page, every plain `{% ref %}` in that paragraph gets
`preview="drawer"`, because plan entities have no page on the main site and a plain ref there
renders as unlinked text.

**The title goes in the heading** (`v0.41.0 · Composed runes you can ship`), not at the start of
the summary. It is the milestone's title (the text after the `—` in its `#` heading), or a
note's frontmatter `title:` when the note sets one. The changelog rune reads it after the
middle dot. *Revised after v0.41.1: the first version opened the summary with the title in
bold, which Lumina styled as an uppercase badge and which repeated what the heading could say.*

The opening is written for maintainers, so it is a fallback, not the goal: a release always
gets a summary, and a handwritten note replaces it. A release with neither a note nor a
milestone (most patch releases) gets no summary, only the link to its changes.

### D4 — The index summarises; each release has its own page

*Revised during WORK-641. The first version folded each release's changes into
`{% details %}` on one page.*

That version worked, and measured badly. A drawer embeds its entity's whole rendered body, and
SvelteKit serialises it into the page data a second time. Plan specs are long design documents,
so the 30 drawers the milestone openings produced took `/releases` from 2.0 MB to 6.8 MB, and
the page would grow with every release.

So drawers live where they are read:

- **`/releases`** (`site/content/releases/index.md`) lists every release with its summary and a
  link to its page. Refs are flattened to their label or ID as plain text, so the index carries
  no drawers; a `file-ref` keeps its link and loses its drawer preview. A summary paragraph
  opening with `Background:`, the drawer list the draft command writes, is left out, because
  flattened it is a row of IDs that link nowhere. It measured 377 KB.
- **`/releases/v<version>`** carries the summary with its drawers and the full list of changes
  under `## Changes`. A release gets a page when it has a summary or at least one change.

The changeset bullets keep today's processing (`parseChangelog`, `processBulletBlock`, fence
and table stripping). A page whose version no longer has a changelog entry is removed when the
generator runs.

### D5 — Background links are drafted from the milestone, not from `released-in`

`released-in` is set on a spec after the release ships, so it is empty while the note is
being written. The milestone links exist from the start: the work and bug items with
`milestone="vX.Y.Z"`, and their `source` specs. A draft command (WORK-643) writes those as
drawer refs, so the person releasing writes only the opening sentences and decides whether an
action-needed block is needed. The draft marks what is left with `TODO:` lines, since refrakt content has no comment
syntax, and a test fails while any remains in a note, so an unfinished draft cannot ship.

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

### D8 — A link inside a drawer is a link on the page

The SvelteKit prerender crawls drawer bodies like any other content, so a broken link inside a
drawn entity fails the site build. WORK-641 hit one: SPEC-054 linked SPEC-046 as
`[SPEC-046](/plan/specs/SPEC-046)`, a path from the old plan site. Plan content links other
plan entities with `{% ref %}`, which cannot break this way; a hard-coded path into the plan
site is a defect to fix where it is found.

## Scope of the migration

The new generator applies to every version at once, because the pages are regenerated from the
changelogs. The summary is filled as follows:

| Releases | Count | Summary |
|---|---|---|
| Milestone, no note | 27 | Milestone opening (D3) |
| v0.39.0, v0.40.0, v0.41.0 | 3 | Handwritten notes |
| v0.11.0, v0.12.0, v0.24.0, v0.31.0, v0.36.0 to v0.38.0 | 7 | Notes replacing an opening that did not read as a summary (WORK-644) |
| v0.4.0 to v0.9.0 minor releases | 6 | One-line note linking the `whats-new-in-0-x` blog post |
| Patch releases | ~28 | None, only the link to their changes |
| v0.2.0, v0.3.0, v0.10.0 | 3 | None |

The 38 milestone openings are reviewed; one that reads badly as a summary gets a note file,
and the milestone itself is left alone.

## Non-goals

- Rewriting existing changeset text, or writing notes for every past release.
- Feeding notes into the npm or GitHub release bodies. The changesets action writes those
  from the changesets, and that is unchanged.
- Making `refrakt validate --deep` catch unresolved refs, and the styling and build-log
  volume of unresolved refs inside drawers. Each is worth fixing on its own; D6 covers what
  release notes need.

## Implementation

- {% ref "WORK-641" /%}: the generator merges notes, falls back to the milestone opening, and
  writes the index and the release pages (D1–D4).
- {% ref "WORK-642" /%}: the test that every ref in a note resolves (D6).
- {% ref "WORK-643" /%}: the draft command and the RELEASING.md step (D5).
- {% ref "WORK-644" /%}: the backfill and the review of milestone openings.

{% /spec %}
