{% work id="WORK-564" status="done" priority="medium" complexity="simple" source="BUG-015" tags="lumina,css,schema-org,seo" milestone="v0.35.0" pr="refrakt-md/refrakt#607" %}

# Move Lumina off the schema.org channel

Six Lumina rules select on RDFa `property=` attributes. Four of them already
match nothing. Move all six to the BEM element classes that exist for the same
nodes, and add the assertion that keeps presentation off this channel.

Half of this is a bug fix ({% ref "BUG-015" /%}) regardless of whether anything
else in the milestone ships. The other half is removing a tripwire that
{% ref "WORK-565" /%} onward would otherwise be walking across.

## The six

| Selector | State | Why |
|----------|-------|-----|
| `pricing.css:65` — `.rf-tier h1[property="name"]` | **live** | `nameTag` is in both `refs` and `schema` |
| `plot.css:2` — `.rf-plot > span[property="name"]` | **live** | `titleTag` is in both |
| `pricing.css:71` — `.rf-tier p[property="price"]` | dead | `property="price"` lands on `parsedPriceMeta`, a `<meta>` — not on the `<p>` |
| `lore.css:14` — `.rf-lore > span[property="title"]` | dead | the span carries `property="headline"` |
| `bond.css:6` — `.rf-bond > span[property="from"]` | dead | `bond` has no `schema:` map at all |
| `bond.css:7` — `.rf-bond > span[property="to"]` | dead | as above |

None of the four dead rules has a BEM equivalent elsewhere in its stylesheet, so
a `lore` title, a `bond` endpoint and a `tier` price render **unstyled today**.

The CSS coverage test does not catch this: it checks that config-derived
selectors *exist*, not that hand-written ones *match*.

## Acceptance Criteria

- [x] No stylesheet in `packages/lumina/styles/` or `plugins/*/styles/` selects on `property=`
- [x] Each of the six rules is expressed against the rune's BEM element class instead, and the four dead ones are verified to now apply — a screenshot or a rendered-HTML assertion, not an assumption
- [x] A CSS coverage assertion fails if a `property=` selector is reintroduced anywhere
- [x] `lore`'s title, `bond`'s endpoints and `tier`'s price are styled after this lands, having been unstyled before
- [x] {% ref "BUG-015" /%} is resolved, with the four dead rules recorded as the visual change they are
- [x] Any visual diff is deliberate: a rule that was dead and now applies changes the rendering, and the item says what changed rather than treating it as a no-op

## Approach

**The four dead rules are the interesting half.** Restoring them is a visual
change to three runes, not a refactor, and it should be reviewed as such —
someone has been looking at unstyled `bond` endpoints for long enough that the
styled version may read as a regression.

The rule this establishes: **presentation never selects on the schema.org
channel.** The refs already produce BEM element classes for every one of these
nodes (`.rf-tier__name`, `.rf-lore__title`), which is what the CSS should have
used from the start.

The coupling matters beyond tidiness, and it is the same argument
{% ref "ADR-028" /%} makes pointed the other way. A theme may not redefine a
rune's schema.org output because emission is a claim about content, not about
skin. A theme that *styles off* emission makes the rune's appearance depend on
its SEO channel — so a correction to the structured data becomes a visual
regression. Every rename in {% ref "WORK-565" /%}'s tables would be one.

`schema="none"` is the sharpest case: `stripSchemaOrg` deletes `property`
wholesale, so on `pricing` it would unstyle the tier heading. It is benign on
`accordion` by luck rather than design, and {% ref "WORK-552" /%} has already
shipped.

## Blocks

- {% ref "WORK-565" /%}

## References

- {% ref "BUG-015" /%} — the defect, with each selector verified against `refrakt inspect`
- {% ref "SPEC-130" /%} — "Constraint: styling already selects on this channel"
- {% ref "ADR-028" /%} — emission is not theme configuration
- {% ref "WORK-552" /%} — `schema="none"`, shipped

## Resolution

Completed: 2026-09-15

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

- `packages/lumina/styles/runes/{bond,lore,plot,pricing}.css` — the six
  catalogued selectors moved to the BEM element classes the refs emit
  (`.rf-bond__from`, `.rf-bond__to`, `.rf-lore__title`, `.rf-plot__title`,
  `.rf-tier__name`, `.rf-tier__price`).
- `packages/skeleton/styles/runes/{annotate,bento,comparison,lore,map,plot,
  reveal,storyboard}.css` — **eight more the item's survey missed** (see below).
- `packages/lumina/test/css-coverage.test.ts` — the guard. Walks every
  stylesheet under `packages/` and `plugins/` and fails on any rule selecting
  `[property]`, in either the `="value"` or bare-presence form. Verified to fail
  by reintroducing a selector, not assumed.
- `plugins/storytelling/test/schema-channel-styling.test.ts` and
  `plugins/marketing/test/schema-channel-styling.test.ts` — 8 rendered-HTML
  assertions through `createTransform`, proving the BEM classes the new CSS
  selects are really on those nodes.

### The survey was short by eight

The item catalogues six selectors in `packages/lumina/styles/`. There were
**fourteen**: `packages/skeleton/styles/` — the second home for rune CSS, which
the coverage test already scans — carried eight more.

- **Two value selectors**, `.rf-lore > span[property="title"]` and
  `.rf-plot > span[property="name"]`, exact duplicates of their Lumina twins.
  Same defect, same fix.
- **Six bare `span[property]` presence selectors** (reveal, storyboard, bento,
  annotate, comparison, map), each paired with a live `meta { display: none }`.
  All six are provably dead: those runes emit no `<span>` carrying `property` —
  `annotate`, `bento` and `storyboard` never mention `property` in their
  transforms at all, and `reveal`/`comparison` only set `contentSection` on the
  block wrapper. Dropped the dead half, kept the `meta` half.

Eleven of the fourteen selectors were already dead.

### Visual changes — three runes gain styling they had lost

- **`lore` title** — `font-weight: bold`, `margin-bottom: 0.5rem`, text colour,
  plus `display: block` from the skeleton. Was an unstyled inline span.
- **`bond` from / to** — `font-weight: semibold`, `white-space: nowrap`, text
  colour.
- **`tier` price** — `4xl`, bold, tight tracking, `margin-bottom: 1.5rem`,
  tight leading. The one a user would actually notice.

`tier`'s name and `plot`'s title were live and move to the same nodes, so no
change there.

### The finding: the channel hid these rules from another guard

`npm test` failed on `prominence-reach.test.ts` — "no rune stylesheet pins a
title font-size outside the prominence chain" — the moment the selectors were
renamed. That guard (WORK-538) derives its targets from `config.sections`, as
`.rf-{block}__{slot}` for every `title`-role slot, so it had **never been able
to see these two rules**: they named the schema.org channel rather than the BEM
slot. Styling off that channel did not only risk breakage, it made the rules
invisible to the theme's own invariant.

Underneath it was a live bug:

- **`lore`** — the old rule was dead, nothing was pinned, prominence worked by
  accident.
- **`plot`** — the old rule was *live* and pinned `font-size` on the title
  element, severing the chain. **`{% plot prominence="display" %}` did nothing**,
  and the density ramp was inert too — precisely the failure WORK-538 exists to
  prevent, hidden from its guard by a selector name.

Fixed by dropping `font-size` from both rules rather than exempting them.
`sections.css` gives `[data-section="title"]`
`var(--rf-prominence-size, var(--rf-title-size, var(--rf-text-2xl)))`, and
`density.css` sets the resting `--rf-title-size` at full density to
`var(--rf-text-2xl)` — the value those rules pinned. Appearance at full density
is unchanged; the prominence axis and density ramp are restored.

### Notes

- The two guards now compose: reverting to a `[property=]` selector fails the new
  guard first, instead of silently blinding the prominence one as before.
- `schema="none"` is **not** yet the hazard the item describes for `tier`:
  `stripSchemaOrg` has exactly one caller (`accordion`), so the attribute does
  nothing on `pricing` today. A test asserting it here passed vacuously and was
  replaced. WORK-565 extends it to every rune carrying a table, which is when it
  becomes real.
- `tier`'s `<h1>` legitimately carries `property="name"` *and* the BEM class —
  which is why selecting on it looked reasonable and stayed alive, while the
  identical idiom on the price (no `property` at all) went dead unnoticed.
- No plugin ships CSS today, so the AC's `plugins/*/styles/` clause is vacuous
  now; the guard walks that tree anyway so a future plugin stylesheet is covered.
- No changeset: Lumina and skeleton CSS ship in published packages, but this is a
  defect fix with no API change — worth one if the release notes should mention
  the three runes' restored styling.

### Verification

`npm test` — 365 files, 4468 tests, all passing. `npm run format:check` clean.

{% /work %}
