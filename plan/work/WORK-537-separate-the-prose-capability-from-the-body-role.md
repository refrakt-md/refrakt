{% work id="WORK-537" status="done" priority="medium" complexity="moderate" source="SPEC-125" tags="runes,facets,schema,reading,breaking" milestone="v0.32.0" pr="refrakt-md/refrakt#594" %}

# Separate the prose capability from the body role

`body` carries two meanings that were merged by accident of timing:

- **Structural** — "the rune's main content region". Its original purpose,
  consumed by Lumina's `styles/dimensions/sections.css:42` and
  `styles/dimensions/density.css:45`.
- **Editorial** — "prose that a reading register applies to". Added later by
  {% ref "SPEC-108" /%}, which reused the existing structural declaration as a
  *proxy* for a capability it never declared.

The proxy holds for most of the 21 runes with a `body` role and breaks for a real
minority. Without this, {% ref "WORK-534" /%} would offer `reading` and `dropcap`
on `DataTable` — so `{% datatable reading="prose" dropcap=true %}` would validate
and stamp a drop cap onto a table.

**Removing the role is not the fix.** DataTable's table genuinely *is* the rune's
main content region and Lumina styles that role; dropping it would change how the
rune renders for a reason unrelated to rendering.

## Shape

Declare the gate rather than inferring it, per {% ref "SPEC-125" /%}'s governing
rule:

```ts
readingAxis.requires = 'prose'
TextBlock: { provides: ['prose'] }
```

Only one axis needs it initially, so this is close to a bespoke field in cost. It
is worth the general shape because {% ref "SPEC-124" /%} already gave every facet
a declaration point — `requires` sits beside `contract` and `describeForRune`,
and flows into the structure contract for free. A bespoke `proseSection` on
`RuneConfig` solves the same case and leaves the next axis to invent its own.

## Acceptance Criteria

- [x] `reading` and `dropcap` gate on a declared prose capability, not on the
      `body` role
- [x] The capability is declared by the facet and provided by the rune, so the
      next axis needing one does not invent a bespoke field
- [x] The structural `body` role and every stylesheet keying on
      `[data-section="body"]` are unchanged
- [x] The 32 body-role runes are audited for whether they bear authored prose
- [x] `DataTable`, `Showcase`, `Form`, `Api` and `Symbol` no longer offer
      `reading`/`dropcap`; `Blog`, `TextBlock`, `PullQuote`, `Sidenote` and `Lore`
      still do
- [x] The structure contract's `unavailable` reasons reflect the new gate rather
      than still citing the body role
- [x] A breaking changeset records the runes that lose the attributes
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Scope grew in v0.31.0 — the audit list, not the answer

The criteria above said "~21" when this item was written. Phase 1 added a `body`
role to twelve more runes, so the audit covers **32**:

`AccordionItem`, `Annotate`, `Api`, `BentoCell`, `Blog`, `Bond`, `Bug`, `Card`,
`Character`, `CharacterSection`, `DataTable`, `Decision`, `Drawer`, `Event`,
`Faction`, `FactionSection`, `Form`, `ItineraryStop`, `Lore`, `MediaText`,
`Milestone`, `Organization`, `Playlist`, `PullQuote`, `Realm`, `RealmSection`,
`Showcase`, `Sidenote`, `Spec`, `Symbol`, `TextBlock`, `Work`.

**The expected non-provider list is unchanged.** All twelve additions are
prose-bearing regions — a card's body, a bento cell's body, an accordion
answer, a storytelling entity's or section's prose, an itinerary stop's note,
the prose after a playlist's track list — so `DataTable`, `Showcase`, `Form`,
`Api` and `Symbol` remain the five expected to lose `reading`/`dropcap`. The
larger number is more runes to confirm, not more exceptions to find.

One caveat on `Character`: its body role is correct but its slot is **always
empty** — prose written directly inside `{% character %}` is dropped by its
content model ({% ref "BUG-003" /%}). It provides prose in principle and none in
practice until that is fixed; audit it on the intent, not on the current output.

## Approach

**Sequenced after {% ref "WORK-534" /%}, and the order is load-bearing.** The
design question is the default:

- **Default-on** (a `body` role implies prose unless a rune opts out) keeps the
  migration tiny, but preserves the lossy proxy as the default — so this same bug
  recurs for the next non-prose rune.
- **Default-off** (a rune must declare that it bears prose) is honest, but a
  forgotten declaration silently disables `reading` — today's failure mode
  returning.

Default-off is right **only once schemas have narrowed**: with
{% ref "WORK-534" /%} in place a forgotten declaration is no longer silent — the
attribute is not offered and `refrakt reference` says so. Running this first would
forfeit that, so take default-off and rely on the narrowing to make omissions
discoverable.

Note `Playlist` may arrive here from {% ref "WORK-531" /%} with a newly-added
structural `body` role and no prose — that is the intended interaction between
the two items, not a conflict.

## Blocked by
- {% ref "WORK-534" /%}

## References

- {% ref "SPEC-125" /%} — Phase 4, and *The governing rule*
- {% ref "SPEC-108" /%} — where the proxy was introduced
- {% ref "SPEC-124" /%} — the facet declaration point this reuses

## Resolution

Completed: 2026-09-09

Branch: `claude/milestone-v0-31-0-e5ihxr`
PR: refrakt-md/refrakt#594

### What was done

`reading` and `dropcap` now gate on a declared content capability rather than on
the `body` section role that had been standing in for one.

- **`packages/transform/src/types.ts`** — `RuneConfig.provides`, a list of
  content capabilities. Added to `IDENTITY_FIELDS`: like `sections`, it decides
  what an author may write on the rune, so a theme redefining it would change
  what the same markdown means (ADR-028).
- **`packages/transform/src/facets/describe.ts`** — `UniversalAxisFacet.requires`,
  the declaration point. The gate is stated by the axis that needs it instead of
  inferred from a structural fact that happens to correlate.
- **`packages/transform/src/facets/reading.ts`** — `PROSE_CAPABILITY`,
  `NO_PROSE_REASON`, and `bearsProse()` replacing `hasBodySection()` in both
  contract descriptors and both runtime facets. `reading` now publishes **no**
  register when the capability is absent, rather than publishing one that falls
  off later — which is what made the axis silent originally, and means `dropcap`
  (which reads the resolved register) sees the same answer. `dropcap` checks the
  capability first, so a `datatable` gets the reason that explains it rather than
  `reading="ui"`, which would be true and useless.
- **`packages/runes/src/lib/index.ts` + `universal-attributes.ts`** — `provides`
  recorded on `schemaRuneStructures` and fed into narrowing, so the schema layer
  answers without theme config.
- **27 tag modules + 27 config entries** — `provides: ['prose']`, declared in
  both places exactly as `sections` is.
- **Docs** — `site/content/runes/surfaces.md`: which runes accept `reading` and
  why the five do not.
- **Changeset** — `.changeset/quick-pots-invent.md`, breaking.

### The audit

All 32 body-role runes confirmed. The expected five — `Api`, `DataTable`,
`Form`, `Showcase`, `Symbol` — lose `reading`/`dropcap`; the other 27 keep them.
Verified through the real schemas (including the docs plugin, which this repo's
site config does not load) rather than from the config alone.

Two of the five deserved a closer look than the others, and I want the reasoning
on record rather than implied by the outcome. `DataTable`'s body role is on its
`<table>` and `Showcase`'s on its viewport — unambiguous. `Form`'s body holds
fields. But **`Api` and `Symbol` genuinely do contain authored sentences**: an
api body is a description paragraph followed by a parameter table and a response
fence, and a symbol member body is "paragraphs, fences, lists". I kept them as
non-providers because a *reading register* is not a meaningful control over a
reference body — its dominant content is tabular and code — and `dropcap` on
"Returns a paginated list of users." is the datatable failure in miniature. That
is a judgement call, not a structural fact, and it is the one to revisit first if
anyone disagrees.

**The structural role is untouched.** All five keep `body`; every
`[data-section="body"]` stylesheet is unchanged. Removing the role was the other
available fix and it is the wrong one — Lumina styles that role for layout and
density, so dropping it would change how the rune renders for a reason unrelated
to rendering.

### Two defects the audit turned up

1. **`MusicPlaylist` was a stub.** The schema.org alias of `Playlist` — same
   schema object, same emitted tree — was configured as a bare `{ block:
   'playlist' }`, so `{% music-playlist %}` rendered with *none* of the five
   `data-section` attributes its primary emits. The prose capability diverging
   between the two is what surfaced it; the section drift was the same bug a
   layer down. It now carries the same join tables, which is why the body-role
   count is 33 rather than the item's 32.
2. **The warning collector deduped on a bare key**, so two *different*
   diagnostics keying on the rune name silenced each other. `frame` and
   `content-place` already collided this way — a warn-once swallowing an
   unrelated warning for the rest of a build — and my new `dropcap-without-prose`
   made it bite a contract-agreement test. Keys are now namespaced by warning
   code in the collector rather than by convention at each call site, which the
   driver's own tests show was the intent (they pass `'once:card'`, `` `k:${rune}` ``).

### Tests

`packages/lumina/test/prose-capability.test.ts` (6) — the tag and config copies
agree for every rune across core and the nine plugins (two copies can drift, and
this is what keeps them one fact); the body-role count; the five declare no
prose; every other body-role rune does; a rune with `defaultReading` must bear
prose (otherwise it would silently lose its own default); and the five keep their
structural role.

`packages/runes/test/universal-attributes.test.ts` gains the direct case: a
`body` role alone no longer unlocks the prose axes, a declared capability does.
`dropped-axes.test.ts` pins the same at the facet level, with a fixture that
keeps its body role deliberately.

### Notes

- **Default-off, per the item's reasoning, and the sequencing mattered.** A
  forgotten declaration disables `reading` — today's failure mode inverted — and
  that is acceptable only because WORK-534 landed first: the attribute is not
  offered and `refrakt reference` names the reason, so the omission is visible
  rather than silent.
- Fixture updates in `scalars.test.ts`, `reading.test.ts`,
  `contract-engine-agreement.test.ts` and `identity-fields.test.ts` are the
  default-off migration reaching the tests, not behaviour changes.
- `BUG-003` still stands: `Character` provides prose in principle and none in
  practice, because its content model drops prose written directly inside it.
  Audited on intent, as the item directs.

{% /work %}
