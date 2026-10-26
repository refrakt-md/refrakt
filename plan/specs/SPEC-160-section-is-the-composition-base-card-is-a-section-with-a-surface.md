{% spec id="SPEC-160" status="accepted" tags="runes, composition, primitives, section, card, marketing, storytelling" %}

# Section is the composition base; card is a section with a surface

A composed rune that wants a titled region of content, with or without media, places
`{% section %}`. Today it places `{% card %}`, because `card` is the only primitive with a media
split ({% ref "SPEC-145" /%} D18). {% ref "ADR-041" /%} records why that puts a drawn object at
the base of every composition, and decides to move the split onto `section` instead.

This spec says what `section` gains, how its existing pages are kept safe, what happens to
`card`, and in what order the compositions move. It also specifies two primitives: `actions`, which
`hero` and `cta` need before they can be compositions, and `link`, which takes `href` off `card`.

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

**Closed: whether a section with a split should drop the `contentSection` property.** The
question is moot. The property is inert: its only consumer, the `Page` document node, never
matched it and is never registered. {% ref "SPEC-133" /%} removes it from every rune, and
{% ref "WORK-650" /%} does that before this spec's work starts, so `section` carries it with or
without a split until then.

**The media zone's kind is an attribute.** A rune declares what its media is through
`mediaSlots` in its config, for example `{ portrait: 'portrait' }`, and the engine stamps
`data-media="portrait"` on that element. The shared media dimension then styles it with no rune
CSS: `skeleton/styles/dimensions/media.css` crops a portrait square at `--media-portrait-size`
(5rem, 3rem at compact density), and Lumina rounds it. The vocabulary is
`portrait | cover | thumbnail | hero | icon` (`RuneConfig.mediaSlots`,
`packages/transform/src/types.ts`).

A composition cannot reach that. Its generated config carries only modifiers, `metaFields`,
`blocks` and `provides` (`composedRuneConfig`, `packages/runes/src/lib/composition.ts`), and the
media zone belongs to the rune it places, not to the composition. **This has already cost the
composed `character` its round portrait:** the plugin's `character` renders the portrait zone
with `data-media="portrait"`, and the composed one renders a plain media zone inside
`rf-card__media`, with no kind (`packages/content/test/composed-character.test.ts`, the
recorded plugin-vs-composed HTML).

So `section` takes `media`, with the same five values, and stamps `data-media` on its media
zone when it is given. With no `media`, the zone carries no kind, as today. A composition passes
it through like the split attributes:

```md
{% section media-position=$attrs["media-position"] media="portrait" %}
{% slot name="portrait" /%}

---
…
{% /section %}
```

That gives three runes their portrait back from one attribute and the existing dimension:

- **`character`** and **`testimonial`** (SPEC-161 D1), which declare a `portrait` media slot today;
- **`cast-member`**, which hand-rolls the same circle in its own CSS
  (`.rf-cast-member img { border-radius: var(--rf-radius-full) }` in `lumina/styles/runes/cast.css`)
  instead of using the dimension. As `section media-position="top" media="portrait"` it needs
  none. {% ref "SPEC-149" /%} already found `cast` and `cast-member` composable, with `Person`
  mapped from attributes.

**An `avatar` rune is not proposed.** It would earn its place only for a portrait outside any
media zone, inline with text (a byline, a conversation speaker), or to add a fallback the
dimension cannot, such as initials when there is no image. No rune audited so far needs either.
The `placeholder:` / `icon:` image schemes resolve in the image node
(`packages/runes/src/nodes.ts`), so an image *authored* into the media zone gets them without an
`avatar` rune. An image given as an *attribute*, as `cast-member`'s `image` is, still needs
{% ref "SPEC-149" /%} D4: the composition has to render it through the same resolution.

### D3 — `card`'s output does not change now; `card` as a composition is the target

`card` keeps its attributes, its `---` counting, its `href` overlay, its `<div>` and its BEM
output. Its schema moves onto the shared split helpers where it does not already use them, and
`refrakt contracts --check` must report no change to `Card` on either contract copy.

**The target is `card` as a composition over `section`.** "`card` is a `section` with a
surface" is the model this spec adopts. It becomes literal once three things exist, none of which
this spec builds for `card` itself:

1. **The surface**, from {% ref "SPEC-159" /%}'s `materiality` axis: a card is
   `section materiality="object"` with the split and `media-position` defaulting to `top`, which
   is what `card` renders today.
2. **The whole-card link**, from the `link` primitive (D8) wrapping the section. `href` is the one
   part of `card` that is behaviour rather than layout, and it moves into a primitive every rune
   can use instead of staying a `card` attribute.
3. **An answer to the class question** D7 records. A composed card renders `rf-section__*`, not
   `rf-card__*`, and `card` is the most widely styled rune there is. If the D7 analysis holds for
   `card` too (its look is a surface plus shared dimensions, so Lumina needs no `card.css` of its
   own), the break is a migration note for third-party themes, not a design problem.

Until then `card` stays a schema rune with unchanged output. One intermediate step is recorded
and not specified here:

- `card` adopting `section`'s flat header anatomy (title and blurb as placeable slots), which is
  SPEC-145 D20's change and its no-drift migration. If `card` becomes a composition, it gets the
  anatomy for free and D20 is never implemented, which is the better outcome.

**A core rune can ship as a composition; measured, not assumed.** A throwaway composed `tile`
(placing `section` and `card`) was built with `defineComposedRune` and registered the way
`packages/runes/src/index.ts` registers core runes: added to the `runes` catalog, with its
generated config under its type name beside `baseConfig.runes`. Then:

- `checkComposedCatalog` (cycles, D9 peer types, D12 required parents) passed with it counted
  as core, and `collectCompositions` listed it for `contracts`;
- it rendered through the identity transform as `data-rune="tile"`, its `title` slot landed in
  `section`'s real `<header>` as `rf-section__headline` with `property="name"`, and the
  `CreativeWork` name published.

Two constraints on how, both small:

- **The definition is a string in a TypeScript module, not a file in a rune directory.**
  `@refrakt-md/runes` is imported by the editor's preview, so core must not read the file system
  at load, which a plugin's `runeDir` does. `defineComposedRune(name, source)` takes the source
  as a string, so core passes it one.
- **The catalog checks run at site assembly.** They run inside `mergePlugins`, which every
  assembly path calls (the content loader, the SvelteKit plugin, the CLI), so a core composition
  is checked on every build, not only when a plugin is loaded.

### D4 — the storytelling compositions move to `section`

`character`, `realm` and `faction` replace `{% card %}` with `{% section %}`, passing
`media-position` (and, for `realm` and `faction`, the other split attributes they already
forward). Their fixtures' expected output changes, and is reviewed as a diff:

- the element classes change from `rf-card__*` to `rf-section__*`;
- the `title` and `description` slots become a real `<header>`, which they were not inside
  `card` (the composed `character` today renders its `<h1>` inside `rf-card__body`);
- the surface disappears, which is the point;
- the portrait zone regains `data-media="portrait"` (D2's `media` attribute), which the
  composition lost when it placed `card`.

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

**Rank stays positional for now.** That matches today's output. An authorable rank (for example
a trailing `{.primary}` annotation or an attribute on `actions`) is left until a rune needs one.

Settled in the 2026-10-26 review ({% ref "WORK-654" /%} carries the detail):

- `hero` and `cta` emit `actions` as a nested rune rather than calling a shared builder, so the
  composed `hero` of D7 produces the same actions region they already do;
- `data-rank` goes on the `<li>`, and primary is the first link of the whole region (today it is
  the first item of each list);
- both skeleton and Lumina get `actions.css`; button size comes from custom properties that
  `hero` and `cta` set, because the two copies differ today, until D7 decides where size comes
  from;
- the primary action's text uses a scheme-following token instead of `white`, which removes
  `hero`'s cover override.

### D7 — `hero` and `cta` become compositions with no rune CSS of their own

With D2 and D6, `hero` is a `section` with a split, `cover`, the header anatomy and `actions`;
`cta` is a `section` with a header and `actions`. Both are {% ref "SPEC-151" /%}'s first
marketing migrations.

**Neither needs CSS of its own.** Every selector in `skeleton/styles/runes/{hero,cta}.css` and
`lumina/styles/runes/{hero,cta}.css` is one of these, and each already has, or gains in this
spec, a home that is not the rune:

| What the rune CSS does | Where it lives instead |
|---|---|
| Display-size headline and blurb | `prominence="display"`, which exists (`quiet` / `normal` / `prominent` / `display`, SPEC-107) |
| The pill eyebrow when it holds a link | the sections dimension ({% ref "WORK-656" /%}); it is copied into nine runes in both skeleton and Lumina today |
| Buttons by list position (`li:first-child a`, …) | `actions` (D6) |
| `data-align` on the header, blurb and actions | `section`'s `align` |
| Media above or below, image fill | the shared split layout (`skeleton/styles/layouts/split.css`) |
| `cover`, the `sm`–`xl` heights, `aspect` | the cover dimension, and `height` / `aspect` moving onto `section` with the split (D2) |
| Full width, flush elevation, bleed | universal `width` and `elevation`, and `guestFit` |
| `cta--in-hero`, `cta--in-pricing` | context tweaks to re-examine, not carry over by default |

So the theme question this decision first posed (how a composed rune keeps its `rf-hero__*`
selectors) mostly dissolves. Lumina deletes `hero.css` and `cta.css`. What remains is a break
for third-party themes that targeted those classes, which ships as a migration note naming the
dimension each rule moved to. A composition keeping its own element classes is not needed for
these two runes, and this spec does not propose it.

**No heading eyebrow.** The eyebrow of a composed `hero` or `cta` is `section`'s: a paragraph
directly before the headline ({% ref "ADR-046" /%}, which resolves its open question here). The
native runes are documented as also reading two leading headings as eyebrow and headline. Only
`cta` does; `hero` drops the second heading and the blurb ({% ref "BUG-047" /%}). So the visible
change is `cta`'s: when it is composed, the first of two leading headings is the headline and the
second is body. The changeset says so. No use of the form is known outside the docs' own
example.

**The real prerequisite is defaults.** A hero is `prominence="display"`, `width="full"` and
`elevation="flush"` unless the author says otherwise. The template can hard-code those on its
`{% section %}`, but then the author cannot override them: a universal attribute written on the
composed rune (`{% hero prominence="prominent" %}`) lands on the composition's empty root, not on
the `section` that carries the header. That is SPEC-145 D14's open question, which element a
composed rune's universal attributes apply to (its "chrome carrier"). `hero` and `cta` move once
D14 is decided, with the `section` as the carrier.

> **Decided in SPEC-145 D31–D34.** The `section` is the carrier by default, being the template's
> single top-level rune (D31). It also owns the header, body and media roles, so every universal
> attribute except `width`, `spacing` and `inset` lands on it (D33). The defaults are a
> definition `defaults` key (D34):
>
> ```yaml
> defaults:
>   width: full
>   elevation: flush
>   prominence: display
> ```
>
> `density` needs nothing: `section` already resolves to `full`, as `hero` and `cta` do.

**Button size follows the section's `prominence`.** `hero` and `cta` size their buttons
differently: `hero` `0.7rem 1.75rem` at `--rf-text`, `cta` `0.625rem 1.5rem` at `--rf-text-sm`.
{% ref "WORK-654" /%} moves each size into custom properties that `hero.css` and `cta.css` set.
Once those files are deleted, the size has to come from something a composition can set. Decided
on 2026-10-26: `actions` takes its size from the enclosing section's `prominence`, not from a
`size` attribute of its own.

- **`display` and `prominent` give the large size**, which is today's `hero` buttons. `normal`
  and `quiet`, and an `actions` with no `prominence` around it, give the default size, which is
  today's `cta` buttons. The composed `hero` declares `prominence: display` (SPEC-145 D34), so it
  needs nothing more. A `cta` written with `prominence="display"` gets hero-sized buttons, which
  is the intent.
- **It needs no new attribute.** The emphasis of a region's header and of its calls to action
  are one choice, and the composition already declares it.
- **It follows the nearest section only.** `density.css` clears `--rf-prominence-size` at every
  rune root, and `actions` is a rune, so the size cannot ride that variable. The `actions.css`
  rules key on the enclosing section's `data-prominence` instead, and must not reach an
  `actions` inside a nested rune: a raised card in a display hero keeps default buttons. The
  same protection is what `density.css` gives titles.
- The custom properties WORK-654 introduces stay as the mechanism. The prominence rules set
  them, in place of `hero.css` and `cta.css`.

**`guestFit` becomes `section`'s `guest-fit` attribute.** The native `hero` hosts a media guest
with `guestFit: 'bleed'`: a rune guest keeps its own chrome and may spill past the zone, rather
than being clipped to a framed well. `card` uses `clip`. `guestFit` is a config field, and the
engine reads it into `data-guest-fit` on the `[data-section="media"]` zone and into `frame`'s
default `frame-displace-mode`. A config field cannot vary between compositions that place the same
`section`, and `hero` needs `bleed` where a card-like composition needs `clip`. So:

- `section` gains `guest-fit="clip | bleed"`, default `clip`, emitted as today's
  `data-guest-fit` on its media zone. It is meaningful only with a media zone, so it lands with
  the split ({% ref "WORK-652" /%}) or immediately after it.
- `frame`'s default displace mode and its `frame-overflow="bleed"` check read the resolved
  attribute, falling back to the config field, which native runes keep.
- The composed `hero` writes `guest-fit="bleed"` on its `section`. It is `section`'s own
  attribute, not a universal axis, so it takes no part in D34's defaults.
- It is named for the data attribute and the existing "clip host" and "bleed host" vocabulary,
  not `media-fit`, so one concept keeps one name.

### D8 — `link` wraps blocks

A whole-region link is useful far beyond `card`: a `figure` that opens the full image, a
`section` that is a teaser for another page, a `testimonial` linking to the case study. Today
only `card` and `bento-cell` can do it, each through its own `href`.

**`link` already exists, and this extends it.** Core registers the Markdown link node as a tag
too (`packages/runes/src/nodes.ts`, exported in `tags`), so templates can write
`{% link href=$item.url %}` inside collection cells. It renders a plain `<a>` with no `data-rune`,
and it accepts inline children only (`strong`, `em`, `s`, `code`, `text`, `tag`). D8 lets it take
block content, and wrap any block to make it a link.

It has two renderings, chosen by what it wraps, because HTML allows an `<a>` around flow content
only when that content contains nothing interactive:

- **Wrap.** When the content has no links, buttons or form controls, the rune renders a real `<a>`
  around it. This is the simple, fully accessible case: the whole block is the link's content.
- **Stretch.** When the content does contain interactive elements, wrapping would nest them, which
  is invalid. The rune instead appends a stretched `<a data-name="link">` inside the wrapped
  rune's root, positioned over it, as `card` does today, so the inner links stay clickable above
  it.

**The choice between the two is made in the identity transform, not in the schema.** Links are
added after a rune's transform has run: storytelling's `postProcess` wraps entity names in
`<a>` (`plugins/storytelling/src/pipeline.ts`), and `{% ref %}` resolves in the cross-page
pipeline. A `link` that chose "wrap" at transform time would end up around an `<a>` added later,
which is invalid HTML. So the schema emits the region with its `href`, and the engine picks wrap
or stretch. The engine runs per page on the renderable the pipeline returns
(`packages/create-refrakt/template/src/routes/[...slug]/+page.server.ts`), so it sees the final
content.

**It fixes an accessibility gap in today's overlay.** `card`'s stretched link is
`aria-hidden="true" tabindex="-1"` (`packages/runes/src/tags/card.ts`), so a keyboard or
screen-reader user cannot reach the whole-card link at all. The stretched form of `link` must be
focusable and labelled: by an `aria-label` attribute when given, else by the wrapped content's
title slot (`aria-labelledby`).

**It must not become a name-resolution boundary.** SPEC-145 D19 records that a placed rune
carrying `data-rune` stops `findAllByName`, so schema properties sourced inside it vanish. A
link around a composed `character` must not hide the character's name from the harvest. The
existing `link` already renders a plain `<a>` with no `data-rune` of its own; the block form
must keep that, and a test pins that a schema property inside a `link` still publishes.

An empty `href` renders the content unchanged, so a composition writes it unconditionally. That
relaxes today's `href: { required: true }`, for the block form at least:

```md
{% link href=$attrs.href %}
{% section materiality="object" media-position=$attrs["media-position"] %}
…
{% /section %}
{% /link %}
```

**Closed: `card`'s and `bento-cell`'s `href` are kept as shorthand that renders through `link`,
and are not deprecated.** About 20 content files use them, and deprecation would churn every one
for no gain. The shorthand is also what a composition writes anyway: once `card` is a
composition (D3), `href` is an attribute its template forwards to `{% link %}`, so it never needs
retiring. Rendering through `link` gives both runes the focusable, labelled overlay above, which
adds one tab stop per linked card. That is the intended fix, and the changeset names it.

**The shorthand always takes the stretched form.** An outer `<a>` around a `bento-cell` takes the
cell out of its grid track (the `grid-column` / `grid-row` span is on the cell), and an `<a>`
inside the root breaks the `> .rf-bento-cell__content` split rules. `card` has the same child
selectors. So `href` on either rune renders the focusable stretched anchor whatever the content,
and the wrap form is for an authored `{% link %}` (2026-10-26 review).

### D9 — `section`'s header grammar is anchored to the headline, and explicit

`section` reads a leading paragraph as an eyebrow even with no heading after it, so a composition
that places prose in it, or a standalone region with media, gets that prose re-roled without a
warning. {% ref "ADR-046" /%} decides:

- eyebrow and blurb exist only relative to a headline; with no heading, all content is body;
- `section` takes `header` (`auto | headline | none`);
- slot content that fills a header role it is not named for raises a build warning.

ADR-046 records the comparison with binding header roles to slot names, which was rejected, and
leaves one question for D7: a heading used as an eyebrow, which `hero`, `cta` and `feature` read
today.

## Order

1. D1, the `body` role, then D9, the header grammar.
2. D2 and D3: the split on `section`, `card` unchanged.
3. D4: the storytelling compositions on `section`.
4. D6: `actions`, with `hero` and `cta` rendering through it while still plugin runes.
5. D8: `link`, with `card`'s and `bento-cell`'s `href` rendering through it.
6. D7: `hero` and `cta` as compositions, once SPEC-145 D14's chrome carrier is decided.
7. `card` as a composition (D3), once `materiality` exists.

Steps 1 to 5 depend on nothing outside this spec and can ship in one milestone. They are
planned for v0.43.0, after {% ref "WORK-650" /%} removes `contentSection`:

- step 1: {% ref "WORK-651" /%} and {% ref "WORK-659" /%};
- step 2: {% ref "WORK-652" /%};
- step 3: {% ref "WORK-653" /%};
- step 4: {% ref "WORK-654" /%};
- step 5: {% ref "WORK-655" /%}.

{% ref "WORK-656" /%} also lands in v0.43.0: the eyebrow becomes a section role, and the
linked-eyebrow pill moves into the sections dimension.

## Not in scope

- Changing `card`'s output, or making it a composition (D3 records the target and its prerequisites).
- `materiality` itself, which is {% ref "SPEC-159" /%}'s.
- `mediatext`, for the reason SPEC-145 D20 records: it floats text around media, it does not
  split a row, and it has no header to place.
- Other marketing runes (`feature`, `pricing`, `testimonial`, `steps`, `bento`). Their fit is
  assessed separately; {% ref "SPEC-151" /%} is the existing audit.

## Acceptance Criteria

- [ ] `section` declares the `body` role, and `reading` / `dropcap` take effect on its body
- [ ] `section` accepts the split attributes and `cover`; with `media-position` it reads media, body and footer zones by `card`'s rule, and without it every existing `section` fixture renders unchanged
- [ ] `section` accepts `media` (`portrait | cover | thumbnail | hero | icon`) and stamps `data-media` on its media zone; the composed `character` renders its portrait with `data-media="portrait"` again
- [ ] `card`'s contract entry and gallery output are unchanged on both contract copies
- [ ] `character`, `realm` and `faction` are composed on `section`; their JSON-LD, RDFa and registry comparisons against the plugin are re-run and any movement explained
- [ ] `{% actions %}` exists as a core rune with rank as a data attribute, Lumina styles it, and `hero` and `cta` render their actions through it with no visual change
- [ ] SPEC-145 D18 and D20 carry a note pointing to ADR-041
- [ ] `{% link %}` wraps a block as a real `<a>` when it holds nothing interactive and as a focusable, labelled stretched link when it does, decided in the identity transform; a schema property inside it still publishes; `card` and `bento-cell` `href` render through it
- [ ] `section`'s header grammar is anchored to the headline, `header` is accepted, and slot content filling a header role it is not named for is reported (D9, ADR-046)
- [ ] SPEC-145 D14's chrome carrier is decided before `hero` or `cta` is composed, and the composed `hero` and `cta` ship with no rune CSS in Lumina
- [ ] `section` takes `guest-fit="clip | bleed"` (default `clip`), emitted as `data-guest-fit` on its media zone, and `frame`'s displace-mode default and bleed check read the resolved value (D7)

## References

- {% ref "ADR-041" /%}: the decision this spec implements.
- {% ref "SPEC-145" /%}: D14 (chrome carrier), D17 (delimiters in templates), D18 and D20 (superseded in part).
- {% ref "SPEC-151" /%}: the marketing audit naming `hero`, `cta` and `steps` first.
- {% ref "SPEC-159" /%}: `materiality`.
- {% ref "SPEC-146" /%}: the reachability gap `recipe`, `howto` and `pricing` wait on.

{% /spec %}
