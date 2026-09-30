{% spec id="SPEC-155" status="draft" tags="runes, composition, media, plugins, feasibility, seo" %}

# Media plugin composition audit

## Summary

Eighth plugin audited against {% ref "SPEC-145" /%}, and the one that came with a specific
question: **can `playlist` be a composition the way `recipe` can, given the right
primitives?**

Yes — and the two things it needs both already exist in the codebase, unused by it. One is
designed for precisely playlist's shape; the other is a shipped attribute pair. What
does *not* compose is its embedded player, which already has a decoupled form.

Auditing the coupling that decoupled form depends on also turned up **two measured defects
in shipped behaviour**, one of them a regression, in a path nothing tests. Those are the
audit's most immediately useful output and they are independent of composition.

## The distinction that makes the question answerable

Per-rune verdicts fail on repeated-item runes, because "does this rune compose" turns
entirely on **what happens to its items**. Three modes, and only one is a blocker:

| Mode | What the rune does | Runes | Composes |
|---|---|---|---|
| **Place** | stamps `data-name` on each `<li>` and keeps it | `howto`, `recipe`, `steps`, plan's checklists | ✓ — the template places the list, items survive |
| **Promote** | `emitTag` turns each item into a child rune, which builds itself | `cast`, `plot`, `itinerary` | ✓ — two tractable problems instead of one |
| **Rebuild** | `itemModel` decomposes each item; the transform reassembles it | **`playlist`**, `audio` | ✗ — a template cannot reassemble |

`playlist` rebuilds. `playlist.ts:269-314` walks `tracksData` and hand-builds, per item, a
`track-name` span, a `track-artist` span, a `track-duration` span, a `duration` meta
carrying `PT…S`, a `track-meta` span and an optional cue-point list. A Markdoc template
places nodes; it cannot do that.

So the answer is not "playlist is too complex". It is **"playlist rebuilds where it could
promote."**

## Promoting is already the designed answer, and playlist is the documented case

`packages/types/src/content-model.ts:47-51`:

> **When set alongside `itemModel` on a list field**, each extracted item is [emitted as a
> tag].

That sentence describes playlist's `tracks` field exactly — a list field with an
`itemModel`. It is implemented (`packages/runes/src/lib/resolver.ts:188-215`, building
`Ast.Node('tag', attrs, itemChildren, field.emitTag)` per item) and exercised by two runes.

Counted across the repo, **four runes use `itemModel` at all**:

| Rune | `itemModel` | `emitTag` | Mode |
|---|---|---|---|
| `cast` (business) | ✓ | ✓ `cast-member` | promote |
| `plot` (storytelling) | ✓ | ✓ | promote |
| **`playlist`** (media) | ✓ ×5, two levels | ✗ | **rebuild** |
| **`audio`** (media) | ✓ | ✗ | **rebuild** |

Two promote, two rebuild, and **both rebuilders are in this plugin**. Playlist has the most
elaborate item model in the codebase — two nesting levels, four regex patterns,
`extract: 'href'`, `pattern: 'remainder'` — and is the one that did not adopt the mechanism
written for it.

This is the **sixth** instance of the pattern this series keeps producing — *the primitive
exists, adoption is partial, the bespoke code predates it* — and the most on-the-nose,
because the type system's own doc comment describes the hold-out's case.

`cast` is the worked precedent, and it is playlist's shape almost line for line:

```ts
itemModel: { fields: [ … ] },
emitTag: 'cast-member',
emitAttributes: { name: '$name', role: '$role', image: '$image' },
```

Playlist's item fields (`name`, `src`, `artist`, `duration`, `date`) and `track`'s
attributes (`src`, `artist`, `duration`, `number`, `date`, `url`) are two spellings of one
list, so `emitAttributes` is a near-mechanical mapping. And `{% track %}` **already lands in
the same `tracks` field** — `match: 'list|tag:track'`, added by WORK-572 for
{% ref "BUG-016" /%}. Promoting the list items makes the two forms one form instead of two
that merge by walking node counts.

## The player is the one part that cannot compose, and it already has a decoupled form

`playlist.ts:371-373` hand-writes a custom element and a payload derived from its own items:

```ts
playerEl = new Tag('div', { 'data-name': 'player' }, [
  new Tag('rf-audio', { waveform: 'false' }, [
    new Tag('script', { type: 'application/json' }, [JSON.stringify(playerData)]),
  ]),
]);
```

Three blockers at once: a **custom element** (client lifecycle — the `map` class,
{% ref "SPEC-148" /%} D3), **derived data** (the payload is computed from `tracksData` —
{% ref "SPEC-150" /%} D2 and {% ref "SPEC-151" /%} D2's blocker, third instance), and
duplication of what `audio` already does.

But the decoupling is a shipped feature. `playlist` declares
`id` — *"Unique identifier used to link an audio rune to this playlist"* — and `audio`
declares `playlist` — *"ID of a playlist rune to load tracks from."* `<rf-audio>` resolves
it at runtime: it finds the playlist element in the document, reads its track items, and
binds click handlers (`packages/behaviors/src/elements/audio.ts:150-170`).

**So a composed playlist needs no player capability at all.** The author writes
`{% audio playlist="x" %}` beside `{% playlist id="x" %}`, and the inline `player` attribute
is what does not survive composition — not the player.

## Two measured defects in that coupling

Measured on the plugin's own canonical fixture (`refrakt inspect playlist --site main`):

```html
<section typeof="MusicAlbum" … data-rune="playlist">
  <li data-field="track" typeof="MusicRecording" property="track">   ← markdown list item
  <li data-field="track" typeof="MusicRecording" property="track">   ← markdown list item
  <li data-field="track" typeof="MusicRecording" … data-rune="track"> ← authored {% track %}
```

against what `<rf-audio>` looks for:

```js
const playlists  = document.querySelectorAll('[typeof="MusicPlaylist"]');   // audio.ts:150
const trackItems = foundEl.querySelectorAll('li[data-rune="track"]');       // audio.ts:165
```

**1. The playlist is never found, for four of five types including the default.** WORK-569
(fixing {% ref "BUG-013" /%}) made the root type follow the author's `type`:
album→`MusicAlbum`, podcast→`PodcastSeries`, audiobook→`Audiobook`,
series→`CreativeWorkSeries`, mix→`MusicPlaylist`. Only `mix` still matches the selector.
**This is a regression introduced by that fix**, in a coupling no test covers.

**2. Markdown-list tracks are never found.** `playlist.ts:313` returns
`new Tag('li', trackAttrs, …)` carrying only an optional `data-src` — no `data-rune`. On the
fixture above the selector finds **1 of 3** tracks. This one is pre-existing, not a
regression.

Both fail silently: a player with an empty queue looks like a player.

**3. The active-track marker is a BEM class, so a composed track can never carry it.**
`audio.ts:192` is `item.classList.toggle('rf-track--active', i === this.currentTrackIndex)`,
styled at `audio.css:145-149` (which also reaches `.rf-track--active .rf-track__track-name`).
That class exists only because `track` declares `block: 'track'`, so
{% ref "SPEC-145" /%} D2 rules it out by construction.

It is also unfinished work rather than a design choice. {% ref "WORK-065" /%} (`done`)
migrated behaviors *"from class-based state toggling to `data-state` attribute toggling…
enabling themes to style all interactive states generically"*, and
`lumina/styles/dimensions/state.css` ships `[data-state="open" | "active" | "inactive" |
"selected" | "disabled"]`. It enumerated accordion, tabs, datatable and form. The audio
player was not in that list, so it is the last behavior writing a state class.

So the player couples to these two runes through **three rune-specific selectors**, while
the repo already contains the pattern that would replace all three — `carousel`'s
block-agnostic `[data-layout="carousel"]` contract ({% ref "SPEC-100" /%}).
{% ref "ADR-038" /%} generalises that into a rule, and its three-change migration of
`<rf-audio>` is exactly this list.

**And `emitTag: 'track'` repairs the second as a side effect**, because a promoted item is a
real `track` rune and carries `data-rune="track"`. The change that makes playlist composable
fixes one of the three.

## Per property

### `playlist` — the first audited rune whose schema is a **variant**

`{ by: 'type', rows: { album, mix, podcast, audiobook, series }, fallback }`. The `album`
row:

| Property | schema.org | Source | Path | Composed |
|---|---|---|---|---|
| `headline` | `name` | `pageSectionProperties` | **B-intrinsic** | **lost** |
| `mediaImage` | `image` | media-zone node via `extractMediaImage` | **B-intrinsic** | **lost** |
| `artist` | `byArtist` | attribute | A | ✓ |
| `track` | `MusicRecording` / `track`, **plus six per-item properties** | `<li>`s | E | ✓, with a caveat |

**The caveat is {% ref "SPEC-146" /%}'s unresolved question, and playlist is its fixture.**
That spec records: *"a child row carrying its own `properties` resolves them with
`findAllByName(item, …)`, where `item` is the author's node and is therefore `top` and
exempt from the guard. Worth a targeted test before deciding this is RDFa-only."* Playlist's
child rows carry **six** properties each (`MUSIC_ITEM` / `SPOKEN_ITEM`) — the only rune in
the repo that does at any scale. So the question SPEC-146 left open has a measurable subject
here rather than a hypothetical one.

### `track` — attribute-driven, and a second variant schema

`{ by: 'type', rows: { song, episode, chapter, talk, video }, fallback }`, with every
property sourced from an attribute (`trackCommon` plus `artist: 'byArtist'` on `song`).
**Path A throughout, so `track` composes before {% ref "SPEC-146" /%} lands** — the same
profile SPEC-154 found in `prerequisite`, and rarer than it looks.

### `audio` — never

An `<rf-audio>` wrapper. Its own `itemModel` (`chapterList`) is rebuilt into the JSON
payload, and its whole output is a custom element plus a serialized blob. Same class as
`map`: {% ref "ADR-036" /%}'s escape hatch by design, not a gap to close.

## The plugin dissolves, as places does

| Rune | Verdict |
|---|---|
| `playlist` | Composes, after `emitTag: 'track'` and the player decoupling; gated on SPEC-146 for `name` / `image` |
| `track` | Composes today — path A throughout |
| `audio` | Never (D5) |

Second dissolution after {% ref "SPEC-148" /%}'s places, and it strengthens that spec's
cross-audit finding: *a domain plugin is mostly domain content, which composes, plus one
capability that never will.* Here the resident that cannot leave via composition is again
the client-lifecycle one.

Whether `audio` is *misfiled* is a fairer question than it was for `map`, since a player is
media-domain in a way a map is not places-domain. But {% ref "SPEC-154" /%} D7's tier test
settles it: **a player is a primitive, not a domain type.** It belongs beside `diagram`,
`nav`, `sandbox` and `map`, and the pending `video` ({% ref "WORK-018" /%}) is its sibling —
which makes the destination a small family rather than a one-off relocation.

## Two corrections to record

**{% ref "SPEC-148" /%} D3 says `map` "has a Svelte component override."** That mechanism is
gone: `packages/svelte/src/registry.ts` is now `export const registry: ComponentRegistry =
{}`, *"empty but preserved for user-defined component overrides"*. Interactive runes are
framework-neutral **custom elements** in `@refrakt-md/behaviors`, emitted by a
`postTransform`. D3's conclusion stands — `map` still needs a client lifecycle — but the
mechanism it names is stale, and this audit relies on the same file.

**{% ref "BUG-013" /%} is fixed in code and still `confirmed` in the plan.** WORK-569 is
`done`, the per-type mappings are in `playlist.ts` and `track.ts`, the per-type assertions
are in `plugins/media/test/seo.test.ts`, and the baseline carries `playlist.album.md` and
`playlist.podcast.md`. It is one of the two non-terminal items making
{% ref "SPEC-130" /%} report `spec-status-ahead`.

## Decisions

### D1 — for a repeated-item rune, the audit unit is what happens to its items

Place, promote, or rebuild. Only rebuilding blocks composition, and promoting converts a
rebuild into two tractable problems. This subsumes per-rune guesswork the same way
{% ref "SPEC-148" /%} D1's five paths did for schema properties.

### D2 — `playlist` composes structurally; its **appearance** has a further dependency

Not a new primitive: `emitTag` alongside an `itemModel` is the documented, implemented
mechanism, and `{% audio playlist %}` is a shipped attribute pair. `name` and `image` remain
gated on {% ref "SPEC-146" /%}, as for every other entity rune with a harvested headline.

**Corrected.** An earlier revision of this decision read "`playlist` composes", concluded
from the transform, the schema and the content model, and did not check the CSS. It should
have: `lumina/styles/runes/track.css` is 98 lines with every selector keyed on `.rf-track`
or `.rf-track__*` — the duration's `tabular-nums`, the `·` separators on artist and meta,
the name's ellipsis — and a composed `track` has no block, so none of it matches. The
mechanism holds; the appearance does not.

That is not a playlist problem. It is {% ref "SPEC-145" /%} D2's inheritance claim being
conditional on the theme's vocabulary being rune-agnostic, which today is three layout
tokens ({% ref "ADR-018" /%}) adopted by three runes. {% ref "ADR-030" /%} rule 4 already
names this exact case — *"A playlist is a ladder of rows… This is the capability whose
absence currently forces bespoke CSS"* — so composing `playlist` well is gated on the
arrangement vocabulary, not only on SPEC-146. D2 of SPEC-145 now states the conditional.

### D3 — `emitTag: 'track'` stands on its own merits, before any composition work

It deletes ~46 lines of per-item tag construction, collapses the two track forms into one
(retiring WORK-572's count-walking merge), and repairs defect 2 above. None of that depends
on playlist ever being composed, and this is the second audit in a row whose most valuable
finding is a content-model adoption ({% ref "SPEC-154" /%} D4 was the first).

**It also deletes duplicated CSS**, which the first revision of this decision missed.
`playlist.css`'s `.rf-playlist__tracks > li` carries the same `gap`, `padding`,
`transition`, `+ li` border-top, `:hover` background and `::before` ordinal rules that
`track.css` gives `.rf-track`. Two parallel blocks because the markup has two forms: a
promoted item is a `track` rune, so one block serves both and the playlist-side copy goes.

### D4 — a composed playlist has no inline player

The `player` attribute is what does not survive, not the capability. Authors get the
decoupled form, which is better factored anyway: one player implementation instead of
playlist and `audio` both serializing payloads.

### D5 — `audio` is out of scope for composition permanently

A custom-element wrapper whose output is a serialized blob. Recorded as permanent, like
{% ref "SPEC-148" /%} D3's `map`, so it is not re-examined each time the vocabulary grows.

### D6 — media dissolves rather than retires

`playlist` and `track` become compositions; `audio` relocates to the client-lifecycle
family. Same replace-not-delete staging as {% ref "SPEC-147" /%} D1 and
{% ref "SPEC-148" /%} D2.

### D7 — `playlist` is the fixture for {% ref "SPEC-146" /%}'s open child-row question

Six per-item properties on a child row, which no other rune has. The question of whether a
child row's own `properties` carry the over-match into the JSON-LD graph should be answered
against this rune.

### D8 — the two selector defects are recorded here and want a bug of their own

They are shipped-behaviour defects, not composition findings, and one is a regression. They
are stated here because the audit found them; they should not stay in a spec about
composition.

## Implementation notes, deliberately not yet work items

Kept here rather than filed, so the adopting milestone decides its own breakdown.

1. **File the two selector defects** (D8) — the regression first, since `{% audio playlist %}`
   is broken for the default playlist type today.
2. **Adopt `emitTag: 'track'` + `emitAttributes`** (D3), modelled on `cast.ts`. Independent
   of everything else here.
3. **Answer SPEC-146's child-row question against `playlist`** (D7).
4. **Compose `track`** — path A throughout, so it needs nothing pending.
5. **Compose `playlist`** after SPEC-146, with the player as a sibling `{% audio %}`.
6. **Relocate `audio`** with the client-lifecycle family, alongside `video` if that is ever
   built.

## Non-goals

- Deleting `plugins/media/` — same staging as {% ref "SPEC-147" /%} D1 (D6)
- Composing `audio`, now or later (D5)
- Building `album`, `artist` or `video` ({% ref "SPEC-008" /%}); {% ref "SPEC-154" /%} D7's
  tier test applies to them, this spec does not disposition them
- Changing `<rf-audio>`'s player UI or its payload format beyond the selectors
- Auditing `docs`, the last remaining plugin

## Acceptance Criteria

- [ ] `<rf-audio>` finds a playlist of every `type`, not only `mix` — asserted per type, since the current selector matches one of five
- [ ] `<rf-audio>` finds markdown-list tracks as well as authored `{% track %}` children, asserted on a fixture containing both
- [ ] `<rf-audio>` marks the active track with `data-state` rather than `rf-track--active`, completing {% ref "WORK-065" /%}'s coverage, with Lumina styling `[data-state]` instead of reaching into the track block
- [ ] `playlist` emits its tracks via `emitTag: 'track'` + `emitAttributes`, with `refrakt contracts --check` and `npm run seo:baseline:check` reviewed rather than regenerated — the `<li>` gains `data-rune="track"`, so a diff is expected (D3)
- [ ] The two track forms share one path after promotion, and WORK-572's count-walking merge is gone
- [ ] Whether a child row's own `properties` reach the JSON-LD graph is answered against `playlist`'s six-property rows, and the finding recorded in {% ref "SPEC-146" /%} (D7)
- [ ] `track` exists as a composition publishing all five of its `by: 'type'` rows correctly **before** SPEC-146 lands, asserted so the path-A claim cannot silently regress
- [ ] `playlist` composes after SPEC-146 with `name` and `image` publishing, and its per-item track properties preserved
- [ ] A composed `playlist` beside `{% audio playlist="…" %}` drives the player, asserted against the rendered DOM rather than the schema
- [ ] `audio` renders from its new home with its existing fixtures unchanged
- [ ] {% ref "BUG-013" /%} is flipped to a terminal status with a resolution, or the reason it is still open is recorded

## References

- {% ref "SPEC-145" /%} — composed runes; D2's no-behavior rule and D18's `card`, which `playlist` shares with `recipe`
- {% ref "SPEC-146" /%} — name resolution; what gates `playlist`, and whose open child-row question D7 assigns a fixture
- {% ref "SPEC-148" /%} — the places audit; the dissolution shape, the client-lifecycle blocker, and the stale registry citation corrected above
- {% ref "SPEC-154" /%} — the learning audit; D7's tier test, and the content-model adoption finding D3 repeats
- {% ref "SPEC-150" /%} — the design audit; the derived-data blocker the inline player is a third instance of
- {% ref "SPEC-151" /%} — the marketing audit; the `pageSectionProperties` set `playlist` belongs to
- {% ref "SPEC-130" /%} — the schema table; `playlist` and `track` are its two variant-schema runes
- {% ref "BUG-013" /%} — the per-type schema defect whose fix caused defect 1
- {% ref "BUG-016" /%} — why `{% track %}` lands in the `tracks` field, and what promotion would simplify
- {% ref "ADR-036" /%} — the plugin escape hatch `audio` falls under
- {% ref "ADR-038" /%} — a behavior binds on a data contract; the rule the three couplings above motivated
- {% ref "ADR-030" /%} — arrangements; rule 4 names this plugin's track rows as its motivating case
- {% ref "ADR-018" /%} — the canonical layout vocabulary a composed track row would be styled through
- {% ref "SPEC-156" /%} — the ladder and row arrangements; `emitTag` here is its prerequisite, and `track`'s two hand-written row implementations are its evidence
- {% ref "WORK-065" /%} — the `data-state` migration that never reached the audio player
- {% ref "SPEC-100" /%} — the `carousel` contract; the block-agnostic pattern the player should follow

{% /spec %}
