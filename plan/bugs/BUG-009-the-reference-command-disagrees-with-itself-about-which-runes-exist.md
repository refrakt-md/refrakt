{% bug id="BUG-009" status="fixed" severity="major" milestone="v0.33.0" tags="cli,reference,runes" %}

# The reference command disagrees with itself about which runes exist

`refrakt reference` answers "which runes are there?" differently depending on
which way you ask. Two symptoms, one question, so they are filed together.

Found by {% ref "WORK-547" /%}'s survey, which reads `reference dump` as the
rune set and got a set that matches neither `reference <name>` nor
`check-rune-docs.mjs`.

## Symptom 1 — a legacy name is registered as a second rune, not as an alias

`music-playlist` and `music-recording` are registered in
`plugins/media/src/index.ts` as **separate entries** in `Plugin.runes`, each
carrying a self-referential `aliases: ['music-playlist']`, rather than as
aliases on `playlist` / `track`. They share the primary's `transform`, so
`{% music-playlist %}` already renders identically — `data-rune="playlist"`,
`.rf-playlist`. The duplication is in the *registration*, not the output.

Three consequences:

- `reference music-playlist` prints `Aliases: music-playlist` — a rune listing
  itself as its own alias.
- The JSON dump carries a **phantom rune**: every playlist attribute appears a
  second time under a legacy name. A generated artifact would inherit that, and
  a coverage assertion would demand a page for it.
- The duplicate registration forced a duplicate **theme config** entry
  (`MusicPlaylist` / `MusicRecording`), which then drifted from the primary's —
  WORK-537 had to copy the join tables across to stop `{% music-playlist %}`
  rendering without its section roles. The config entries are unreachable
  (nothing emits `data-rune="music-playlist"`), so that was a patch on a
  phantom.

**Corrected from the first draft of this bug.** It claimed
`reference music-playlist` fails while `dump` lists it. That was a measurement
error: the lookup was run without `--site`, and the media plugin is not in the
default site's plugin set — `reference playlist` fails the same way. With
`--site main` the lookup resolves. There is no cross-command inconsistency here;
the defect is the duplicate registration and what it drags along.

## Symptom 2 — nine child runes are invisible to the reference; twenty
equivalent ones are not

`EXCLUDED_RUNES` (`packages/runes/src/reference.ts:65`) filters nine runes out of
`hydrateAllRuneInfos`, so they never reach any reference output:

```
error, tab, accordion-item, budget-category, budget-line-item,
conversation-message, reveal-step, note, form-field
```

All nine are core child runes. But `PAGELESS` in `check-rune-docs.mjs` lists
**29** runes with no page of their own, and the other **20** — `bento-cell`,
`tier`, `step`, `map-pin`, `symbol-member`, `timeline-entry` and the rest — are
plugin child runes that *do* appear in the reference, attributes and all.

**This one is a real cross-command inconsistency**, and it is the load-bearing
half of the bug:

```bash
refrakt reference accordion-item --site main   # → describes it, required `name`
refrakt reference dump --format json --site main | grep accordion-item   # → nothing
```

`EXCLUDED_RUNES` filters `hydrateAllRuneInfos` but not `hydrateRuneByName`, so a
rune is fully documented one way and invisible the other.

The exclusion itself is deliberate — a test asserts child-only runes stay out of
the catalogue listing, which is right: they would bury the top-level runes a
reader is scanning for. The mistake is *where* it is applied. Filtering at the
data layer makes it a property of the rune set rather than of the rendered
document, so it also strips them from `--format json`, which is the
machine-readable set a consumer needs.

Nothing distinguishes the nine from the twenty, either. `accordion-item` and
`bento-cell` are the same kind of thing. `EXCLUDED_RUNES` looks like it predates
the plugin child runes and was never revisited.

## Expected

The catalogue stays curated; the machine-readable set is complete. A name the
dump reports is describable by `reference <name>`.

## Actual

The curation is applied to the data, so `--format json` inherits it — and the
list it applies is nine of twenty-nine equivalent runes.

## Why it matters now

{% ref "WORK-548" /%} generates attribute tables from `reference dump`. As it
stands that artifact would:

- carry **phantom entries** for `music-playlist` / `music-recording`, duplicating
  `playlist` / `track` under legacy names, and a coverage assertion would then
  demand pages for them;
- be **unable to document nine child runes at all**, including `accordion-item`
  and `tab` — `accordion-item` being the rune {% ref "SPEC-128" /%} D1's own
  design leans on.

## Steps to reproduce

```bash
npm run build
node packages/cli/dist/bin.js reference dump --format json --site main -o /tmp/r.json

grep -c '"name": "music-playlist"' /tmp/r.json   # → 1, a phantom duplicate of playlist
node packages/cli/dist/bin.js reference music-playlist --site main | head -3
#   → "Aliases: music-playlist" — a rune aliasing itself

grep -c '"name": "accordion-item"' /tmp/r.json   # → 0
node packages/cli/dist/bin.js reference accordion-item --site main | head -4
#   → describes it, including a *required* `name` attribute
```

Note `--site main` throughout: the media plugin is not in the default site's
plugin set, so an unqualified `reference playlist` fails too. That is expected
multi-site behaviour, not part of this bug.

## Acceptance Criteria
- [x] `music-playlist` / `music-recording` are aliases of `playlist` / `track`, not separate `Plugin.runes` entries
- [x] The duplicate `MusicPlaylist` / `MusicRecording` theme config entries go with them, since a real alias resolves to the primary's config
- [x] `{% music-playlist %}` and `{% music-recording %}` still parse and render exactly as before
- [x] `EXCLUDED_RUNES` is applied where the catalogue is rendered, not in `hydrateAllRuneInfos` — so `--format json` carries the complete rune set
- [x] Child runes reachable in the JSON dump, so their attributes can be generated onto the parent's page
- [x] The markdown catalogue listing is unchanged
- [x] A test asserts every name in `reference dump` resolves via `reference <name>`

## Approach

Take symptom 1 first — it is a two-line registration fix in the media plugin,
and it shrinks the rune count to something the other checks can agree on.

Symptom 2 needs the rule stated before it is coded. The honest one is probably
that **child runes are reported like any other rune** and page-placement is a
separate question, already answered by `PAGELESS` (and by D5, which turns its
parent annotations into data). `EXCLUDED_RUNES` then reduces to `error` alone —
an internal rune that is genuinely not authored.

Do not simply widen `EXCLUDED_RUNES` to match `PAGELESS`. That direction hides
twenty more runes from the reference, and the attributes of `bento-cell` or
`tier` are exactly what an author writing one needs.

## References

- {% ref "WORK-547" /%} — the survey that surfaced both symptoms
- {% ref "WORK-548" /%} — reads `reference dump`, so it inherits both
- {% ref "SPEC-128" /%} D5 — `PAGELESS` becomes a Map; this bug decides what it is a map *of*

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`plugins/media/src/index.ts`** — `music-playlist` / `music-recording` are now
`aliases` on `playlist` / `track` rather than separate `Plugin.runes` entries.
`runeTagMap` expands aliases into tag names, so both spellings still parse; they
already shared the primary's `transform`, so rendering was identical before and
after (`data-rune="playlist"`, same section roles).

**`plugins/media/src/config.ts`** — deleted the `MusicPlaylist` /
`MusicRecording` theme config entries. They were unreachable (nothing emits
`data-rune="music-playlist"`) and existed only because the runes were
registered twice. WORK-537 had previously copied the primary's join tables into
`MusicPlaylist` to stop it rendering without section roles — a patch on a
phantom, now unnecessary. Confirmed dead by the contract diff: 60 lines removed,
all under `dataRune: "music-playlist"` / `"music-recording"`.

**`packages/runes/src/reference.ts`** — `hydrateAllRuneInfos` takes
`{ includeExcluded }`. `EXCLUDED_RUNES` is a *catalogue* policy, so it belongs
to the rendered document, not the rune data; filtering it at the data layer also
stripped child runes from `--format json`.

**`packages/cli/src/commands/reference.ts`** — the JSON dump passes
`includeExcluded: true`. The markdown catalogue and list are untouched.

**Tests** — two new in `packages/cli/test/reference.test.ts`: the JSON dump
carries `accordion-item` / `tab`, and every name in the dump resolves via
`reference <name>`. Verified the first genuinely fails without the fix before
relying on it.

**`plugins/media/test/helpers.ts`** — the harness built runes with
`defineRune({ name, schema })`, dropping `aliases`, so it did not mirror
`loadPlugin`. That made `{% music-recording %}` unparseable in tests while
working in a real build. Now passes `aliases` through.

**Count guards updated** with the reason: `prose-capability.test.ts` 33 -> 32
(the number the original audit named — it only read 33 because of the duplicate
config entry), `section-role-drift.test.ts` 132 -> 130.

**Contracts regenerated** — `contracts/structures.json` and Lumina's copy.

### Notes

- Symptom 1 as first filed was partly a measurement error: I compared a `dump`
  run using `--site main` against a `reference <name>` run without it, and the
  media plugin is not in the default site. `reference playlist` fails the same
  way. Corrected in the bug body. The real defect was the duplicate registration
  and the phantom config and dump entries it dragged along.
- Symptom 2 is the load-bearing half and was confirmed properly:
  `reference accordion-item --site main` describes a required `name` attribute
  that `reference dump` omitted entirely.
- **Left open deliberately:** `EXCLUDED_RUNES` (9) still lists a different set
  from `PAGELESS` (29), so the *markdown catalogue* still hides nine child runes
  while listing twenty equivalents. Fixing that means deciding whether the
  catalogue lists child runes at all — a product call that changes AGENTS.md for
  every scaffolded project, and one WORK-548 no longer depends on now that the
  JSON dump is complete.
- Full suite: 4247 tests, 351 files, all passing.

{% /bug %}
