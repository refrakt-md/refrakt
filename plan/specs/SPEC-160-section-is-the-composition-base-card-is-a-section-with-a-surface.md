{% spec id="SPEC-160" status="draft" tags="runes, composition, primitives, section, card, marketing, storytelling" %}

# Section is the composition base; card is a section with a surface

A composed rune that wants a titled region of content, with or without media, places
`{% section %}`. Today it places `{% card %}`, because `card` is the only primitive with a media
split ({% ref "SPEC-145" /%} D18). {% ref "ADR-041" /%} records why that puts a drawn object at
the base of every composition, and decides to move the split onto `section` instead.

This spec says what `section` gains, how its existing pages are kept safe, what happens to
`card`, and in what order the compositions move. It also specifies the `actions` primitive that
`hero` and `cta` need before they can be compositions.

## The two primitives today

| | `section` | `card` |
|---|---|---|
| Element | `<section>`, `property: 'contentSection'` | `<div>` |
| Header anatomy | eyebrow, headline, blurb in a `<header>` | eyebrow only; the first heading stays inside the body |
| Sections declared | `preamble`, `headline: 'title'`, `blurb: 'description'` | `media`, `body` |
| `body` role | **no** (its `body` slot is undeclared) | yes |
| Media zone and split | no | `base: SplitLayoutModel`; `---` zones by count: body / media + body / media + body + footer |
| `cover` | no | yes (`data-cover-scope="full"`) |
| Footer | no | yes |
| Whole-region link | no | `href`, a stretched overlay |
| Surface in Lumina | none | padding, radius, border, `--rf-color-surface` fill |

Sources: `packages/runes/src/tags/section.ts`, `packages/runes/src/tags/card.ts`,
`packages/runes/src/config.ts` (Section and Card entries), `packages/lumina/styles/runes/{section,card}.css`.

The split's CSS is already shared: `packages/skeleton/styles/layouts/split.css` keys on
`[data-media-position]`, `[data-section="media"]` and `[data-name="content"]`, with no rune name.
The cover dimension is rune-agnostic the same way (`skeleton/styles/dimensions/cover.css`). So
the missing parts are in `section`'s schema and config, not in its CSS.

## Decisions

### D1 — `section` declares its `body` role

`sectionSections` gains `body: 'body'`. Today `reading` and `dropcap` do nothing on a section,
silently: the case `packages/transform/src/section-roles.ts` exists to catch. This stands on its
own and lands first.

### D2 — `section` gains the split, and zoning is opt-in

`section` takes `base: SplitLayoutModel` (`media-position`, `media-ratio`, `valign`, `collapse`)
and the `cover` variant, through the same helpers `card` uses (`splitMediaBodyFooter`,
`extractMediaImage`, `buildLayoutMetas` in `packages/runes/src/tags/common.ts`).

**Zones are read only when `media-position` is given.** A `---` inside a `section` is ordinary
body content today, and every existing page that writes one must render unchanged. So:

- No `media-position`: the content model is exactly today's; `---` stays in the body.
- `media-position` given: the children split on `---` by `card`'s rule, a leading media zone, the
  body, and an optional trailing footer. An empty leading zone means no media, and the media
  element is omitted (`card`'s empty-zone guard), so a template can emit the delimiter
  unconditionally as SPEC-145 D17 requires.

A composition opts in by passing the attribute through with a default, for example a composed
`character` declaring `media-position` with `default: top` and writing
`{% section media-position=$attrs["media-position"] %}`. The opt-in is the attribute a split
already needs, not a new switch.

Inside the body zone, the header anatomy applies as it does today: eyebrow, headline and blurb
lead the body, then everything else. With a split, the `<header>` sits in the content column
beside or below the media, where `hero`, `feature` and `recipe` already put it, and
`cover-scope="header"` becomes expressible because `preamble` exists.

**Open question:** whether a section with a split should drop the `contentSection` property.
It describes the element's role in the page, not its layout, so the default answer is no.

### D3 — `card`'s output does not change in this spec

`card` keeps its attributes, its `---` counting, its `href` overlay, its `<div>` and its BEM
output. Its schema moves onto the shared split helpers where it does not already use them, and
`refrakt contracts --check` must report no change to `Card` on either contract copy.

"`card` is a `section` with a surface" is the model this spec adopts, and the direction for
later work, not a rewrite of `card` now. Two follow-ups are recorded and not specified here:

- `card` adopting `section`'s flat header anatomy (title and blurb as placeable slots). That is
  SPEC-145 D20's change, with the no-drift migration D20 costed on every page that places a
  card. With compositions off `card`, nothing is blocked on it.
- A `section` drawn as an object, through {% ref "SPEC-159" /%}'s `materiality` axis once it
  exists. Then `card` and `section materiality="object"` converge, and whether `card` stays a
  separate rune can be decided on evidence.

`href` stays on `card` only. A whole-region link is behaviour of a discrete object, and a
`section` that is itself a link is a pattern this spec does not want to encourage.

### D4 — the storytelling compositions move to `section`

`character`, `realm` and `faction` replace `{% card %}` with `{% section %}`, passing
`media-position` (and, for `realm` and `faction`, the other split attributes they already
forward). Their fixtures' expected output changes, and is reviewed as a diff:

- the element classes change from `rf-card__*` to `rf-section__*`;
- the `title` and `description` slots become a real `<header>`, which they were not inside
  `card` (the composed `character` today renders its `<h1>` inside `rf-card__body`);
- the surface disappears, which is the point.

The comparisons recorded against the plugin are re-run, not re-recorded: JSON-LD against the SEO
baseline, RDFa, and the storytelling registry snapshot (SPEC-145's worked `character` example
lists what each one showed). Any movement is explained in the PR.

### D5 — `recipe` and `howto` compose over `section`

SPEC-145 D18 called them composable over `card`, blocked only on {% ref "SPEC-146" /%}. The
same holds over `section`, and `recipe`'s `cover-scope="header"`, its one existing consumer,
is expressible there. This spec records the change of base; their migration is its own work.

### D6 — an `actions` primitive

Buttons are a convention today, not a primitive:

- `hero` and `cta` override `item` with `linkItem` (`packages/runes/src/tags/common.ts`), which
  renders `<li>` with its text in a `<span>`, and wrap a fence as a `command` block;
- the look is CSS by list position: `li:first-child a` is the primary fill and the rest are
  outlined, duplicated between `packages/lumina/styles/runes/hero.css` and `cta.css`;
- no other rune can get buttons without copying both.

`{% actions %}` is a core rune that takes a list of links, and optionally fences, and renders a
row of actions:

- each link item becomes an action with `data-name="action"`, and its rank as a data attribute:
  `data-rank="primary"` for the first, `secondary` for the rest, so themes style the rank and
  not the list position;
- a fence becomes a `command` (a copyable install line), as in `hero` today;
- `align` follows `section`'s alignment.

A composition places it around a slot, so authors keep writing a plain list:

```md
{% section media-position=$attrs["media-position"] %}
{% slot name="media" /%}

---

{% slot name="headline" /%}
{% slot name="blurb" /%}
{% actions %}{% slot name="actions" /%}{% /actions %}
{% /section %}
```

Lumina's button CSS moves from `hero.css` and `cta.css` into `actions.css`, and `hero` and
`cta` (still plugin runes until D7) place their actions through the same renderer so their
output and look do not change.

**Open question:** whether the rank should be authorable (for example a trailing `{.primary}`
annotation or an attribute on `actions`) or stay positional. Positional matches today and is
the default.

### D7 — `hero` and `cta` become compositions, after the theme question is settled

With D2 and D6, `hero` is a `section` with a split, `cover`, the header anatomy and `actions`;
`cta` is a `section` with a header and `actions`. Both are {% ref "SPEC-151" /%}'s first
marketing migrations.

**The prerequisite is not mechanical.** A composition emits its primitives' element classes: a
composed `character` carries `rf-card__*` and no `rf-character` class anywhere
(`packages/content/test/composed-character.test.ts`). So a composed `hero` would render
`rf-section__headline`, not `rf-hero__headline`, and every theme selector on `rf-hero__*` and
`rf-cta__*`, Lumina's and any third party's, stops matching. Before `hero` and `cta` move, one of
these has to be decided:

1. themes target a composed rune as `[data-rune="hero"]` plus the primitive's classes, and the
   change ships as a documented theme break with a migration note; or
2. a composition may give its root a block class (`rf-hero`) and its placed primitive's named
   parts an outer-rune alias, so existing selectors keep matching.

Option 2 touches SPEC-145's identity model and its path-granular guard
({% ref "SPEC-158" /%}), so it is a decision of its own. This spec does not make it.

## Order

1. D1, the `body` role.
2. D2 and D3: the split on `section`, `card` unchanged.
3. D4: the storytelling compositions on `section`.
4. D6: `actions`, with `hero` and `cta` rendering through it while still plugin runes.
5. D7: `hero` and `cta` as compositions, once the theme-class question has an answer.

Steps 1 to 3 are independent of the theme question and can ship in one milestone.

## Not in scope

- Changing `card`'s output (D3's follow-ups).
- `materiality` itself, which is {% ref "SPEC-159" /%}'s.
- `mediatext`, for the reason SPEC-145 D20 records: it floats text around media, it does not
  split a row, and it has no header to place.
- Other marketing runes (`feature`, `pricing`, `testimonial`, `steps`, `bento`). Their fit is
  assessed separately; {% ref "SPEC-151" /%} is the existing audit.

## Acceptance Criteria

- [ ] `section` declares the `body` role, and `reading` / `dropcap` take effect on its body
- [ ] `section` accepts the split attributes and `cover`; with `media-position` it reads media, body and footer zones by `card`'s rule, and without it every existing `section` fixture renders unchanged
- [ ] `card`'s contract entry and gallery output are unchanged on both contract copies
- [ ] `character`, `realm` and `faction` are composed on `section`; their JSON-LD, RDFa and registry comparisons against the plugin are re-run and any movement explained
- [ ] `{% actions %}` exists as a core rune with rank as a data attribute, Lumina styles it, and `hero` and `cta` render their actions through it with no visual change
- [ ] SPEC-145 D18 and D20 carry a note pointing to ADR-041
- [ ] The decision D7 needs (how themes target a composed rune's parts) is recorded before `hero` or `cta` is composed

## References

- {% ref "ADR-041" /%}: the decision this spec implements.
- {% ref "SPEC-145" /%}: D14 (chrome carrier), D17 (delimiters in templates), D18 and D20 (superseded in part).
- {% ref "SPEC-151" /%}: the marketing audit naming `hero`, `cta` and `steps` first.
- {% ref "SPEC-159" /%}: `materiality`.
- {% ref "SPEC-146" /%}: the reachability gap `recipe`, `howto` and `pricing` wait on.

{% /spec %}
