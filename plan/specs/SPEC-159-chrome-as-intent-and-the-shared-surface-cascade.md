{% spec id="SPEC-159" status="draft" tags="theme, surfaces, facets, vocabulary, intent, dx" %}

# Chrome as intent, and the shared surface cascade

## Summary

Three questions arrived from three directions and turn out to share a root:

1. **Composing `storyboard` appears to lose its chrome** — its `variant` (`comic` / `clean` /
   `polaroid`) is a container attribute whose effect lands on the panels.
2. **A bento and its cells cannot be given one look.** `bento-cell` is documented as sitting
   *"outside the `data-elevation` axis"* and hand-draws its own surface.
3. **{% ref "SPEC-156" /%} D8's parent→child cascade** wanted a justification before becoming
   a mechanism.

The root is that **a container can declare a surface treatment for itself and cannot extend
it to the items it contains.** That is part one of this spec, and it is adoption of plumbing
that already exists.

Part two is the question the first draft of this spec got wrong: **how chrome is expressed.**
The answer is not a richer mechanism but a stricter test — chrome is *intent*, the theme owns
identity, and two of the three vocabulary terms that looked necessary do not survive
examination. That makes this spec considerably smaller than its first revision, and it is why
`storyboard`'s `variant` can simply be removed rather than ported.

---

# Part 1 — the cascade

## What already exists, measured

**The facet registry carries the parent's config to every facet.** `engine.ts:335-360` builds
one `facetInput` and hands it to `runFacets(ORDERED_FACETS, …)`. That input includes
`parentRune` and `parentConfig`, under a comment stating what it is for:

> The parent's resolved config, for the one axis that inherits from it (`density` reads
> `childDensity`).

**Four of the axes a surface treatment needs are already facets** — `elevation`, `inset`,
`frame` and `density` (`packages/transform/src/facets/`). All four receive `parentConfig`.
**Only `density` reads it:**

| Facet | Reads `parentConfig` |
|---|---|
| `density` | **yes** — `ctx.parentConfig?.childDensity ?? …` (`density.ts:26`) |
| `elevation` | no |
| `inset` | no |
| `frame` | no |

**`childDensity` is the declared half**: `RuneConfig.childDensity?: 'compact' | 'minimal'`
(`types.ts:479`) — *"density imposed on child runes when this rune is the parent context…
plugins can declare their own density behavior without modifying the engine."*

Verified by probe — a bento with `elevation="raised"` and one cell:

```html
<div data-elevation="raised" class="rf-bento" data-rune="bento" data-density="full">
  <div class="rf-bento-cell" data-rune="bento-cell" data-density="compact">
```

`data-density` cascaded. `data-elevation` did not reach the cell **at all** — not even a
default.

## Part of this was specified and never built

{% ref "SPEC-107" /%} is **`shipped`**, and says of the surface axes:

> All three default per rune via the theme's `RuneConfig` and are overridable per instance
> and **via region/context cascade**.

The elevation facet is the sole resolver for that axis, and its entire source list is:

```ts
const raw = ctx.tag.attributes?.elevation ?? ctx.config.defaultElevation;
```

An author attribute, or the rune's own default. **No region path and no context path exists.**
So part one of this spec is less a new capability than the unbuilt half of a shipped one — a
status-hygiene finding of the same class as a bug left `confirmed` after its fix landed.

## The measured consumer: `bento-cell` reimplements two elevation rungs by hand

`packages/skeleton/styles/runes/bento.css` states the position — the cell is *"outside the
data-elevation axis, so its padding has no surfaces competitor"* — and
`packages/lumina/styles/runes/bento.css` then draws the surface itself:

```css
/* The cell. `:where()` keeps the background at zero specificity so a per-cell … */
background: var(--rf-color-surface);
border: 1px solid var(--rf-color-border);
border-radius: var(--rf-radius-container);
padding: var(--bento-cell-edge);

/* Media slot shares the cell surface chrome (1px border + recessed well). */
border: 1px solid var(--rf-color-border);
background: oklch(from var(--rf-color-surface) calc(l - var(--rf-surface-inset-shift)) c h);
```

Against `packages/lumina/styles/dimensions/surfaces.css`: the first block is
`[data-elevation="flat"]` (surface fill, border, container radius, padding) and the second is
`[data-elevation="sunken"]`'s **exact** relative-colour expression. So a rune declared outside
the elevation axis reimplements two of its rungs, and the `:where()` zero-specificity trick
exists to recover the per-instance override the axis would have given for free.

That is the strongest evidence in this spec, because it is duplication that already costs
something rather than a capability someone might want.

## The ownership split, which bounds part 1

Four cascade instances exist, and they split on **who decides**:

| Cascade | Form | Decided by |
|---|---|---|
| `childDensity` | declarative, in `RuneConfig` | the **theme** |
| `bento`'s `media-position` → cells | hand-rolled `processChildren` | the **author** |
| `playlist`'s `artist` → tracks | hand-rolled | the author |
| `playlist`'s child `kind` → tracks | hand-rolled, derived from `type` | the author, indirectly |

A theme-owned cascade is presentation and belongs in `RuneConfig`. An author-driven cascade is
an authored value flowing down — a different thing with a different owner, and
{% ref "ADR-028" /%} makes the distinction load-bearing. **One name for both would quietly
cross that line**, so this spec takes the first and leaves the second to
{% ref "SPEC-156" /%} D8.

A smaller tell in the same direction: `childDensity` is typed `'compact' | 'minimal'` — **a
parent may only make its children denser, never fuller.** Whether that is a deliberate guard
or an artefact of the one implementation decides whether a generalised form inherits it.

---

# Part 2 — chrome is intent, and the theme owns identity

## The principle is already written down

{% ref "SPEC-107" /%}, on the surface axes:

> the value names express **intent**; the theme (skin) owns the actual paint and **may
> interpret, clamp, or no-op a value where its house style demands.**

Which means **the author's guarantee is weaker than it looks, and correctly so**: not *"it will
look like X"* but *"the theme has been told X, and will do something coherent about it or
legitimately nothing."* `materiality: object` might be a restrained border and lift on one theme,
a hard offset block on a brutalist one, a tilted taped photo on a whimsical one.

**That is exactly why look-names fail.** `polaroid` promises an appearance a theme cannot
refuse without lying — a theme rendering polaroid differently is not interpreting it, it is
failing to do it. `materiality: object` promises only the signal. The first is a specification
wearing the costume of a name.

## The bound on theme latitude: retune, don't redefine

Latitude cuts both ways — if three themes answer one intent unrecognisably differently, an
author can predict nothing. The bound already exists, in `substrate`'s own doc comment:

> The token-driven gradient recipes that realise each pattern ship here in the always-included
> base layer (not a theme's swappable CSS), so **"dots = dots on every theme" is a
> guarantee**: themes retune the `--substrate-*` token hooks (ink colour, cell size), **they
> don't redefine a pattern's geometry**. The engine emits markers only; CSS does the drawing.

So: **a theme retunes an intent; it does not redefine it.** Geometry guaranteed in the base
layer, tokens as the theme's dials. The same phrasing {% ref "ADR-030" /%} rule 3 uses to lock
markers, applied to chrome — and a third position neither "author CSS" nor "theme CSS" covers.

## Three gates, and the method error that made them necessary

A candidate chrome term must pass all three:

1. **Is it an intent?** Can a theme honour it while disagreeing about the appearance?
2. **Does it vary meaningfully per element?** If the right value is always "whatever the rest
   of the site is", it is a **token**, not an axis.
3. **Does anything want it?** {% ref "ADR-030" /%} rule 5b — a contract statable without
   naming a rune, at least one concrete design, no overlap with an existing axis.

**The method error, recorded because it is the trap:** an earlier pass rejected all three
candidates by *counting existing implementations* and finding one each. That is rule **5a**'s
bar, for consolidating something already hand-rolled, and ADR-030 explicitly warns against
applying it to new capability:

> Existing implementations only exist for shapes the current vocabulary permitted, so counting
> them **can never approve anything new**. `rail` reads as having one consumer not because
> rails are rare, but **because nothing could declare one**.

"`variation` has one implementation" is the same fallacy as "`rail` has one consumer". The
count is evidence for 5a and irrelevant to 5b.

## The candidates

### `materiality` — provisional, first

**Contract:** *whether a surface reads as a region of the page, or as a discrete object placed
on it.* Statable without naming a rune. ✓

| Rune | What the author gets |
|---|---|
| `card` | a flat panel vs a card with edges |
| `figure` | a plate in the flow vs a photographic print |
| `pullquote` | a quoted region vs a torn-out clipping |
| `bento-cell` | tiles as panels vs objects on a surface |
| `swatch` | a flat square vs a paint chip — the rune is *named* after a physical object |
| `testimonial` | its `card` variant |

Six candidates, and the theme overhead is the `substrate` model: implemented once in the base
layer, every rune that opts in gets it.

**Its risk, stated rather than waved past: overlap with `elevation`.** Is "object" the ladder's
upper rungs rebranded? The matrix corners say no — a *sunken* inlaid plate is low-depth and
object-like; a *floating overlay* is high-depth and emphatically not an object, it is a UI
layer. So depth is z-position and materiality is thing-ness. That is the subtlest of the three
distinctions and is where gate 3's no-overlap test would be challenged.

### `variation` — provisional, second

**Contract:** *whether sibling items render identically or with slight per-item
differentiation.* ✓

Candidates: `gallery` (prints laid out vs a precise grid), `storyboard`, `cast` (a team page
that is not a mugshot wall), `testimonial`.

**And `gallery` has already reached for it**: `masonry` is a local layout token, and masonry
*is* a non-uniformity. The want surfaced once already, expressed as an arrangement because no
quality axis existed to carry it — which is precisely rule 5b's "became bespoke and does not
register as an implementation of anything".

### `register` — dropped, on gate 2

**Contract:** *the tone the chrome and type adopt.* Vaguer than the others, and rule 5b says
*"if the definition needs an example to be intelligible, it is not a topology yet."*

It fails gate 2 decisively: **the mood of an element is the mood of the theme.** An informal
callout in a formal site is incoherent; in an informal site it is redundant. So the axis would
carry one value in practice, and the real control is `--rf-font-sans` / `--rf-font-mono` and a
display face. **Register already lives in tokens, correctly.**

Two corroborations: `prominence` already owns the type-register axis for headers and
**`defaultProminence` appears zero times** in any rune config; and of 12 `font-family`
overrides in Lumina's rune CSS, **11 are `var(--rf-font-mono)`** — a content-type signal, not
a register.

### A real axis found where a vague one was proposed — and deliberately out of scope

What `comic`'s cursive face was *doing* was marking the caption as **a voice rather than a
label**. That is a property of the text, not the mood of the frame, and it is a **content
role**: `figure` has a caption, a polaroid panel a label, a comic panel dialogue, `pullquote`
an attribution, `track` lyrics.

Prior art exists twice: `playlist` carries `content: 'auto' | 'lyrics' | 'chapters'`, and
`conversation` is a core rune built on dialogue. It passes all three gates and is worth its own
examination — but it does not rescue `comic` (it gets the voice, not the border or the tilt),
so it is recorded here and specified nowhere.

---

# Part 3 — composite intents

## They are the unit of reuse, not sugar

An earlier revision of this spec called a preset a convenience. That is wrong. If `polaroid`
is `elevation: raised` + `tint: paper` + `inset: caption-band`, then wanting polaroid figures,
cards and bento-cells means writing three intents on three runes — **nine values to keep in
sync, with nothing naming the fact that they are one decision.** The preset *is* the unit of
reuse, and without it the vocabulary is usable one rune at a time.

Two more reasons it is not sugar: a preset is where a **design decision** lives (*"in this
system, keepsakes look like this"* — that is what a design system is), and it is the
**learnable surface**, because an author should not need to know that a look decomposes into
three axes.

## What changed is what a preset *is*

| | As a specification | As a composite intent |
|---|---|---|
| Contents | CSS, or axis values realising one look | a named point in intent-space |
| Can a theme honour it and still look different? | no | **yes** |
| Where can it live? | the theme only | **core, a pack, or a theme** |

The third row is the unlock. A preset expressed purely in intent terms contains nothing
theme-specific, so **it can ship in core** — which means core can publish a starter vocabulary
of composite intents that no theme can fail to understand. Under the old framing every preset
was theme-locked and therefore broke on a theme switch, and structure bought nothing.

| Tier | Holds | Ships in | Portable |
|---|---|---|---|
| intent axes | the vocabulary | core | yes, by definition |
| **composite intents** | named points in that vocabulary | **core, a pack, or a theme** | **yes** |
| theme CSS | how *this* theme renders an intent | the theme | no, and need not be |

## Naming, and governance

**Name the reader's relationship to the content, not the medium being imitated.** `polaroid`
and `comic` name media. `keepsake`, `specimen`, `exhibit`, `note`, `document` name what the
thing is to a reader — the same register as `sections`' semantic roles, and generative rather
than ad hoc.

**Governance is {% ref "ADR-030" /%} rule 6, not rule 5:** *"Vocabulary is cheap; mechanism is
expensive… a wrong name costs nothing (add another) while a wrong mechanism costs
migrations."* So presets may grow freely **because** the axes beneath them are governed
tightly. Rule 2's ban on naming combinations applies to *axis values*; a separate naming layer
is how you avoid polluting the axis rather than a way around the rule.

**And a symmetry worth noting**: a composed rune is a named combination of *primitives*; a
composite intent is a named combination of *intents*. Both are {% ref "ADR-036" /%}'s "name
the pattern", both portable because their parts are, both cheap and codeless. That the two
land on the same shape from opposite ends is the best evidence either is right.

---

# Part 4 — `storyboard` loses `variant`, and `comic` is reassigned

Expressed in today's vocabulary, with no new axes:

| Look | Expressed as | Status |
|---|---|---|
| `clean` | `elevation: flat` + `inset` | available today |
| `polaroid` | `elevation: raised` + `tint: paper` + `inset: caption-band` | available today — and `tint` carries `light`/`dark`, which a raw `background: white` gets wrong |
| `comic` | three qualities, one of which fails gate 2 | **removed** |

So `variant` is removed from `storyboard`, and Lumina's ~20 lines of comic CSS are **deleted**
rather than re-keyed: once the attribute has no source, the selector is unreachable, and
keeping the attribute alive solely for `comic` is the hybrid this resolves.

**`comic` is not lost so much as reassigned.** `materiality: object` + `variation: casual` is the
signal a whimsical theme needs to produce something comic-like, and that theme is *entitled*
to deliver it because it sits inside its own identity. Lumina shipping Comic Sans was Lumina
acting outside its identity, which is why it felt forced. The capability moves from the rune to
the theme, which is where identity lives, and no rune ever names a genre.

**This spec is not a rescue, and must not be read as one.** A composed `storyboard` keeps its
chrome regardless: probed, a block-less rune still emits its modifier's data attribute, so
`[data-rune="storyboard"][data-variant="polaroid"] .rf-figure` resolves today, and
{% ref "SPEC-145" /%} D16's `contextModifiers` supplies a class besides. Part 1 is justified by
bento's duplication, not by storyboard's appearance.

> Noted in passing, from the same probe: a rune with no `block` emits
> `class="rf-undefined rf-undefined--polaroid"`. {% ref "SPEC-145" /%} D2 makes block-less the
> normal case for every composed rune, so that is a defect worth its own report — out of scope
> here.

## Decisions

### D1 — part 1 is adoption of existing plumbing, not new machinery

`parentConfig` is already on the facet input and `elevation`, `inset` and `frame` are already
facets receiving it. What is missing is that three of them do not read it. Stated plainly
because the opposite framing — a new axis, a new pass — would be a far larger change than the
gap warrants.

### D2 — only the theme-owned cascade is in scope

`child<Axis>` on the parent's config, resolved by the facet that owns the axis, exactly as
`density` does it. The author-driven cascade ({% ref "SPEC-156" /%} D8) has a different owner
and is explicitly out.

### D3 — {% ref "SPEC-107" /%}'s cascade claim is reconciled in one direction or the other

Either the cascade lands, or that sentence is corrected to describe what was built — an author
attribute and a per-rune default. Doing neither leaves a reader trusting a false sentence,
which is how {% ref "ADR-035" /%} came to be rejected. Its scope covers *three* axes; this
spec covers `elevation`, `inset` and `frame`, so `prominence` must be checked rather than
assumed.

### D4 — `bento-cell` is the acceptance consumer, and success is deletion

The cell stops hand-drawing `flat` and `sunken`, takes them from the axis, and the `:where()`
workaround goes with them. A consolidation whose consumer keeps its CSS has consolidated
nothing.

### D5 — chrome is intent; the theme may interpret, clamp or no-op it

{% ref "SPEC-107" /%}'s rule, restated as this spec's governing principle. The author's
guarantee is that the theme was told, not that an appearance will result.

### D6 — a theme retunes an intent; it does not redefine it

`substrate`'s guarantee, generalised: the recipe ships in the always-included base layer, the
theme retunes tokens. This is what bounds D5's latitude, and it is a third position distinct
from both author CSS and theme CSS.

### D7 — three gates, all of which must hold

Is it an intent; does it vary per element; does anything want it. `polaroid` fails the first,
`register` the second. Recorded with their failures because the gates are only useful if it is
clear what they exclude.

### D8 — counting implementations is {% ref "ADR-030" /%} rule 5a's bar and must not be applied to 5b candidates

The method error above, recorded as a decision because it is a trap with a flag already
planted beside it, and this spec walked into it anyway.

### D9 — `materiality` and `variation` ship provisional; `register` is dropped

Provisional per rule 5b: recorded as unstable, outside the stability guarantee, changeable
without migration. Promotion needs *"a second independent consumer that adopted it without
needing its shape changed"* — `swatch` or `pullquote` for materiality, `gallery` for variation.
`register` fails gate 2 and its control already exists in tokens.

### D10 — composite intents are a cheap, open, rule-6 layer, shippable from core

Not sugar (they are the unit of reuse) and not theme-locked (every term is interpretable). A
wrong preset name costs nothing; a wrong axis costs migrations, which is why the two layers
are governed differently.

### D11 — a composite intent is named for the reader's relationship to the content

Not for the medium it imitates. `keepsake`, not `polaroid`.

### D12 — `storyboard`'s `variant` is removed and `comic` is a deliberate removal

Not deprecated, not re-keyed, not sheltered as theme CSS. `clean` and `polaroid` become
composite intents expressible today; `comic` ceases to be a supported look and its CSS is
deleted. If the vocabulary later grows, a user can rebuild it — and a whimsical theme can
deliver it now, from the signals in D9's axes.

## Non-goals

- The author-driven cascade (D2) — {% ref "SPEC-156" /%} D8's question, still open
- Specifying the facet registry, whose own comment reads *"Facet pass (SPEC pending)"*
- A raw-CSS tier on a preset. `BgPresetDefinition.style` exists, has **zero** users in Lumina,
  applies as an inline attribute that outranks `@layer skin`, cannot carry a media query, and
  `bg.ts:246` already deprecates its sibling raw passthrough — *"will be removed in a future
  minor"*
- The content-role axis found in Part 2; recorded, not specified
- Project-authored presets. Presets are theme-and-package-authored; a project references a name
  and never defines one, which keeps {% ref "ADR-037" /%}'s "data to validate, not code to
  sandbox" intact
- The arrangement vocabulary ({% ref "SPEC-156" /%}); a surface is not a topology

## Acceptance Criteria

- [ ] `elevation`, `inset` and `frame` read `parentConfig` the way `density` does, via a declared `child<Axis>` on the parent, asserted per axis
- [ ] A bento with `elevation="raised"` produces a cell carrying an elevation; the probe in this spec, which shows the cell carrying none, is the regression test
- [ ] `bento-cell`'s hand-drawn `flat` and `sunken` rules are **deleted**, not supplemented, and the `:where()` zero-specificity workaround goes with them (D4)
- [ ] {% ref "SPEC-107" /%}'s "region/context cascade" sentence is made true or corrected, and `prominence` is checked rather than assumed (D3)
- [ ] `materiality` and `variation` are published as provisional, with their contracts stated without naming a rune, and excluded from the stability guarantee (D9)
- [ ] `materiality`'s distinction from `elevation` is argued in the theme-authoring guide using the matrix corners — a sunken inlaid plate, a floating overlay — not asserted
- [ ] An unknown preset or intent name is **reported**, not silently ignored: `frame.ts:45` and `tint.ts:38` both no-op today and the new registry must not inherit that
- [ ] A composite intent resolves identically whether it ships from core, a pack or a theme, asserted by moving one between tiers (D10)
- [ ] `storyboard`'s `variant` attribute is gone, its `clean` and `polaroid` render from composite intents, and Lumina's comic CSS is deleted with the removal recorded (D12)
- [ ] `npm run seo:baseline:check` shows no diff; `refrakt contracts --check` shows a reviewed diff on both copies, since the cell gains an elevation attribute and storyboard loses a modifier
- [ ] The CSS-coverage test's known-gap sets shrink rather than grow, so a consolidation cannot be recorded as an exemption
- [ ] The theme-authoring guide states D5, D6 and D7 together — intent, the retune bound, and the three gates — since each is misleading without the others

## References

- {% ref "SPEC-107" /%} — the surface axes; `shipped`, and the source of both the unbuilt cascade claim (D3) and the interpret/clamp/no-op rule D5 restates
- {% ref "ADR-030" /%} — rule 2 on naming combinations, rule 3's semantic locking, rule 5a/5b's bars and the `rail` warning D8 records, rule 6's cheap-vocabulary split behind D10
- {% ref "SPEC-156" /%} — the ladder and row arrangements; D8's author-driven cascade, which D2 separates from this one
- {% ref "SPEC-158" /%} — the identity guard's granularity; the sibling question of what a theme may override, at what depth
- {% ref "SPEC-145" /%} — composed runes; D2's no-CSS rule, and D16's `contextModifiers` by which storyboard's chrome survives regardless
- {% ref "SPEC-147" /%} — the storytelling audit; where `storyboard`'s CSS was first costed, and whose D3 relocates it to core
- {% ref "SPEC-151" /%} — the marketing audit; `bento`'s attribute cascade
- {% ref "SPEC-087" /%} — `substrate`, whose "dots = dots on every theme" guarantee is D6
- {% ref "SPEC-088" /%} — the structured bg vocabulary that replaced a raw-CSS passthrough, and the deprecation this spec's non-goals cite
- {% ref "ADR-028" /%} — identity versus presentation; the line D2's ownership split protects
- {% ref "ADR-036" /%} — name the pattern; the symmetry between a composed rune and a composite intent
- {% ref "ADR-037" /%} — users author composed runes only; why presets are not project-authored
- {% ref "SPEC-094" /%} — the `@layer skeleton, skin` contract that separates a surface's geometry from its decoration

{% /spec %}
