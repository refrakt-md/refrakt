{% work id="WORK-531" status="done" priority="medium" complexity="simple" source="SPEC-125" tags="runes,config,sections,media,places" milestone="v0.31.0" %}

# Correct section roles — media and places runes

The two remaining slot/role mismatches, in different plugins and unrelated to
each other:

| Rune | Plugin | Missing |
|---|---|---|
| `Playlist` | `plugins/media` | `body` role |
| `ItineraryDay` | `plugins/places` | header-ish role |

Split from {% ref "WORK-529" /%} and {% ref "WORK-530" /%} only because they
share no family with those — not because they are harder.

## Acceptance Criteria

- [x] Both runes are individually assessed: is the missing role an oversight, or
      is the slot deliberately not a semantic section?
- [x] Corrections are applied only where the role genuinely belongs; a decision
      not to add one is recorded with its reasoning
- [x] Each correction has a test asserting the new `data-section` and, for the
      `body` role, that `reading`/`dropcap` land on it
- [x] The rendered-output change is enumerated in the resolution
- [x] `refrakt contracts` is regenerated; the affected `unavailable` entries
      disappear and nothing else moves
- [x] A changeset records the visible change if a role is added
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

`Playlist` is the one to think about rather than assume. A playlist body is a
track list — structured content the rune reinterprets, not authored prose. It may
well warrant the **structural** `body` role (it is the rune's main content
region, and Lumina's shared `[data-section="body"]` rules would apply) while
*not* being prose-bearing.

That is exactly the `DataTable` / `Showcase` shape, and the resolution is the
same: add the role if the region is structurally the body, and let
{% ref "WORK-537" /%} settle whether it bears prose. Do **not** withhold a correct
structural role to work around the overloaded meaning — that is the mistake
{% ref "SPEC-125" /%} Direction 2 exists to avoid.

## Blocked by
- {% ref "WORK-528" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, Direction 1; and Direction 2 for the overload
- {% ref "WORK-537" /%} — separates the prose capability from the structural role

## Resolution

Completed: 2026-09-07

Branch: `claude/milestone-v0-31-0-e5ihxr`

### `Playlist` → add `body: 'body'`

**The work item's Approach rests on a premise the code does not support.** It reasons about Playlist as the `DataTable` / `Showcase` shape — "a playlist body is a track list — structured content the rune reinterprets, not authored prose" — and concludes the structural role should be added anyway.

But Playlist's `layout.content` places `tracks` and `body` as **separate slots**: `['eyebrow', 'preamble', 'player', 'tracks', 'body']`. The content model confirms it — `body: { match: 'any', greedy: true }` follows the track-list field, so the `body` slot is the prose an author writes *after* the tracks (liner notes, recording history). It is both structurally the body and genuinely prose-bearing.

So there is no Direction 2 tension here at all, and the correction is the straightforward one. The track list stays unroled: mapping `tracks` to `body` would have *created* a `datatable`-shaped overload where none existed, and handed {% ref "WORK-537" /%} a case to strip back out.

### `ItineraryDay` → **no** header-ish role

Declined, and the reasoning turned out to generalise. The parent `Itinerary` already declares `sections: { preamble: 'preamble', headline: 'title', blurb: 'description' }`, so the subtree already has its `title`. `prominence` scales *the* header of a page-section family rune; a second title inside the same subtree flattens the hierarchy the axis exists to scale.

Two supporting facts: Lumina pins `.rf-itinerary-day__header`'s `font-size`, `font-weight`, `color` and `margin-bottom`, so `prominence` would be inert there (it re-points `--rf-title-size`, which never reaches a pinned size) — while `[data-section="title"]`'s `margin: 0` *would* strip the heading's top margin. A visible cost for no gain.

The `stops` slot is a structured list, not a body; the prose lives one level down.

### One rule explains all six header-ish cases in the audit

Worth recording, because it came out of the three items rather than going in:

> **A child rune takes the `title` role only when its parent does not already hold one.**

Checked against every rune SPEC-125 listed as missing a header-ish role:

| Child | Parent holds `title`? | Decision |
|---|---|---|
| `BentoCell` | no — `Bento` declares no `sections` at all | **add** ({% ref "WORK-529" /%}) |
| `AccordionItem` | yes — `Accordion.headline` | decline |
| `CharacterSection` | yes — `Character.name` | decline |
| `RealmSection` | yes — `Realm.name` | decline |
| `FactionSection` | yes — `Faction.name` | decline |
| `ItineraryDay` | yes — `Itinerary.headline` | decline |

One rune in six takes the role, and it is exactly the one whose parent has no headline. The rule is a candidate for {% ref "WORK-532" /%} to encode: a lint that flags a missing header-ish role should only fire where the parent has none.

### `ItineraryStop` → add `body: 'body'`

Beyond the work item's table, and the third instance of the same finding (after `AccordionItem` in {% ref "WORK-529" /%} and the three `*Section` runes in {% ref "WORK-530" /%}): SPEC-125 derived its body list from runes declaring a `body` slot *in their `layout`*, and `ItineraryStop` has no `layout` config, so the audit method could not see it. Each stop's note is authored prose and the stop's only content region.

### Rendered-output changes

| Rune | Added |
|---|---|
| `playlist` | `data-section="body"` on `.rf-playlist__body` |
| `itinerary-stop` | `data-section="body"` on `.rf-itinerary-stop__body` |

Contract `unavailable` deltas: `reading` and `dropcap` removed on `Playlist` and `ItineraryStop`. `ItineraryDay` is untouched and correctly still records `prominence` as unavailable. Nothing else in the 132-rune contract moved.

### Visual verification

Headless Chromium diffed computed styles and box geometry for every element with and without the new attributes, against the bundled Lumina stylesheet. **No change on either rune.** `.rf-itinerary-stop__body` already sets its own `font-size`, `line-height` and `color`, so the shared `[data-section="body"]` rules are outranked there; `.rf-playlist__body` has no rule of its own, so they apply — but they are already the values inherited from `html`.

### Files changed

- `plugins/media/src/config.ts` — `Playlist.sections`, with the tracks-vs-body reasoning inline
- `plugins/places/src/config.ts` — `ItineraryStop.sections`, plus the recorded decision on `ItineraryDay`
- `plugins/media/test/playlist-sections.test.ts` (new, 4 cases) — asserts the new role, that `reading`/`dropcap` land, that the track list stays unroled, and that the existing page-section header roles are untouched
- `plugins/places/test/itinerary-sections.test.ts` (new, 4 cases) — asserts the stop body role, that the day header stays unroled, that the subtree has exactly one title, and that the stop list is not a body
- `contracts/structures.json` + `packages/lumina/contracts/structures.json` — regenerated, in lock-step
- `.changeset/fresh-pandas-yawn.md`

### Notes

- Pre-existing and unrelated: the engine warns `` `itinerary-stop` requires parent `itinerary` — found nested directly in `itinerary-day` `` on every itinerary render. Confirmed identical on `HEAD` before these changes — `requiresParent` checks the *direct* parent, but the itinerary nests stops inside days. Not touched here.
- Verified: `npm run build` clean, full suite 4121/4121 across 338 files, `refrakt contracts --check --site main` up to date.
- The `pr` attribute is not set — no pull request was opened for this branch.

{% /work %}
