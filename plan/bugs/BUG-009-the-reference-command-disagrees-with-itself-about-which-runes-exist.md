{% bug id="BUG-009" status="confirmed" severity="major" milestone="v0.33.0" tags="cli,reference,runes" %}

# The reference command disagrees with itself about which runes exist

`refrakt reference` answers "which runes are there?" differently depending on
which way you ask. Two symptoms, one question, so they are filed together.

Found by {% ref "WORK-547" /%}'s survey, which reads `reference dump` as the
rune set and got a set that matches neither `reference <name>` nor
`check-rune-docs.mjs`.

## Symptom 1 — `dump` emits runes that `reference <name>` cannot describe

```bash
refrakt reference dump --format json   # → includes music-playlist, music-recording
refrakt reference music-playlist       # → Error: Unknown rune "music-playlist"
```

`music-playlist` and `music-recording` are registered in
`plugins/media/src/index.ts` as **separate entries** in `Plugin.runes`, each
with a self-referential `aliases: ['music-playlist']`, rather than as aliases on
`playlist` / `track`. So:

| Consumer | Verdict |
|---|---|
| `reference dump --format json` | a rune, with all 5 (resp. 7) own attributes |
| `inspect --list --json` | a rune, self-aliasing |
| `reference <name>` | not a rune |
| `check-rune-docs.mjs` | an alias — so it passes, requiring no page |

They are documented as *legacy names for the same rune* ("use playlist"), so the
self-alias is doing the work an `aliases` entry on the primary should do.

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

Nothing distinguishes the two groups. `accordion-item` and `bento-cell` are the
same kind of thing: a child rune documented on its parent's page. One is
reported, the other is not. `EXCLUDED_RUNES` looks like it predates the plugin
child runes and was never revisited.

## Expected

One answer to "is X a rune?", consistent across `reference <name>`,
`reference dump`, `inspect --list` and the docs guard.

## Actual

Four consumers, three answers.

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
node packages/cli/dist/bin.js reference dump --format json -o /tmp/r.json
grep -c music-playlist /tmp/r.json              # → present
node packages/cli/dist/bin.js reference music-playlist   # → Unknown rune
grep -c accordion-item /tmp/r.json              # → 0
```

## Acceptance Criteria
- [ ] `music-playlist` / `music-recording` are aliases of `playlist` / `track`, not separate `Plugin.runes` entries — or, if they must stay separate, `reference <name>` resolves them
- [ ] One rune set backs `reference <name>`, `reference dump` and `inspect --list`
- [ ] `EXCLUDED_RUNES` and `PAGELESS` no longer disagree: a child rune is either reported everywhere or nowhere, on a stated rule
- [ ] Child runes reachable in the reference, so their attributes can be generated onto the parent's page
- [ ] A test asserts every name in `reference dump` resolves via `reference <name>`

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

{% /bug %}
