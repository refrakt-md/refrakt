{% spec id="SPEC-159" status="draft" tags="theme, surfaces, facets, composition, vocabulary, dx" %}

# A surface treatment a container and its items share

## Summary

Three questions arrived from three directions and turn out to be one:

1. **Composing `storyboard` appears to lose its chrome.** Its `variant` — `comic`,
   `clean`, `polaroid` — is a container attribute whose effect lands on the panels.
2. **A bento and its cells cannot be given one look.** `bento-cell` is documented as
   sitting *"outside the `data-elevation` axis"* and hand-draws its own surface.
3. **{% ref "SPEC-156" /%} D8's parent→child attribute cascade** wanted a justification
   before becoming a mechanism.

All three are the same gap: **a container can declare a surface treatment for itself, and
cannot extend it to the items it contains.**

The useful finding is that this is **adoption plus one decision, not new machinery**. The
plumbing is already generic, already threaded through the facet registry, and already used
— by exactly one axis.

**And part of it was specified three specs ago and never built.**
{% ref "SPEC-107" /%} is `shipped`, and says of `elevation`, `prominence` and their sibling:

> All three default **per rune via the theme's `RuneConfig`** and are overridable per
> instance and **via region/context cascade**.

The elevation facet is the sole resolver for that axis, and its entire source list is:

```ts
const raw = ctx.tag.attributes?.elevation ?? ctx.config.defaultElevation;
```

An author attribute, or the rune's own default. **No region path and no context path
exists**, which the probe below confirms from the other end: a cell inside an elevated
bento carries no elevation attribute at all. So this spec is less a new capability than the
unbuilt half of a shipped one — which also makes it a status-hygiene finding, of the same
class as a bug left `confirmed` after its fix landed.

## What already exists, measured

**The facet registry carries the parent's config to every facet.** `engine.ts:335-360`
builds one `facetInput` and passes it to `runFacets(ORDERED_FACETS, …)`. That input
includes `parentRune` and `parentConfig`, under a comment that says what it is for:

> The parent's resolved config, for the one axis that inherits from it (`density` reads
> `childDensity`).

**Four of the axes a surface treatment needs are already facets** — `elevation`, `inset`,
`frame` and `density` (`packages/transform/src/facets/`). All four receive
`parentConfig`. **Only `density` reads it:**

| Facet | Reads `parentConfig` |
|---|---|
| `density` | **yes** — `ctx.parentConfig?.childDensity ?? …` (`density.ts:26`) |
| `elevation` | no |
| `inset` | no |
| `frame` | no |

**And `childDensity` is the declared half**: `RuneConfig.childDensity?: 'compact' |
'minimal'` (`types.ts:479`), *"density imposed on child runes when this rune is the parent
context… plugins can declare their own density behavior without modifying the engine."*

So one axis has a parent-side declaration and a child-side read, on infrastructure the
other three already sit on.

Verified by probe — a bento with `elevation="raised"` and one cell:

```html
<div data-elevation="raised" class="rf-bento" data-rune="bento" data-density="full">
  <div class="rf-bento-cell" data-rune="bento-cell" data-density="compact">
```

`data-density` cascaded. `data-elevation` did not reach the cell **at all** — not even a
default.

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

Compare `packages/lumina/styles/dimensions/surfaces.css`: the first block is
`[data-elevation="flat"]` (surface fill, border, container radius, padding) and the second
is `[data-elevation="sunken"]`'s *exact* relative-colour expression. **So a rune declared
to be outside the elevation axis reimplements two of its rungs**, and the `:where()`
zero-specificity trick exists to recover the per-instance override the axis would have
given for free.

That is the strongest evidence here, because it is duplication that already costs
something rather than a capability someone might want.

## `storyboard` is the stress case, and it is where an axis alone fails

Measured across both layers (79 lines: 48 skin, 31 skeleton):

| Variant | What it is | Nearest existing axis |
|---|---|---|
| `clean` | 1px border, container radius, body padding, clip | ≈ `elevation="flat"` + `inset` |
| `polaroid` | white fill, bottom-weighted padding `0.75/0.75/2.5rem`, shadow, radius 2px | the `frame` family |
| `comic` | 3px border, **alternating `:nth-child(even)` tilt**, cursive caption face | **none** |

`comic` is the one that decides the design. Its tilt is the *container styling its children
by position*, which no per-item attribute can express — so a surface **axis** captures two
of three, and the interesting one escapes.

{% ref "ADR-030" /%} rule 2 independently forbids the axis reading anyway: `comic` is a
*combination* (border + tilt + typeface), and *"promoting a combination to a name produces
a combinatorial explosion"* — naming it immediately owes `comic-tight`, `comic-untilted`,
`comic-horizontal`.

**A preset is not subject to that rule, because a preset is allowed to be a combination and
is expressed in CSS.** That is what admits `comic`, and it is why the preset reading of this
problem is the one that survives contact with all three variants rather than two.

### The chrome is not actually at risk

Worth stating so this spec is not justified on a false premise. A composed `storyboard`
keeps its chrome today, measured: a block-less rune still emits its modifier's data
attribute, so `[data-rune="storyboard"][data-variant="polaroid"] .rf-figure { … }` works
with no new mechanism, and {% ref "SPEC-145" /%} D16's `contextModifiers` gives the
primitive a class besides. So this spec is **not** a rescue for storyboard. It is about the
duplication bento pays and the capability neither rune has.

## The decision this actually turns on

The four cascade instances split on **who decides**, and {% ref "ADR-028" /%} makes that
split load-bearing:

| Cascade | Form | Decided by |
|---|---|---|
| `childDensity` | declarative, in `RuneConfig` | the **theme** |
| `bento`'s `media-position` → cells | hand-rolled `processChildren` | the **author** |
| `playlist`'s `artist` → tracks | hand-rolled | the author |
| `playlist`'s child `kind` → tracks | hand-rolled, derived from `type` | the author, indirectly |

A theme-owned cascade is presentation and belongs in `RuneConfig`. An author-driven cascade
is an authored value flowing down, which is a different thing with a different owner. **One
name for both would be a mechanism that quietly crosses ADR-028's line**, so this spec
takes only the first and leaves the second to its own.

A smaller tell in the same direction: `childDensity` is typed `'compact' | 'minimal'` —
**a parent may only make its children denser, never fuller.** Whether that asymmetry is a
deliberate guard or an accident of the one implementation decides whether a generalised
form inherits it.

## Decisions

### D1 — the three questions are one feature, and it is named from the container end

*A surface treatment a container extends to the items it contains.* Recorded as one thing
so storyboard's chrome, bento's duplication and D8's cascade stop being filed separately
and solved twice.

### D2 — this is adoption of existing plumbing, not new machinery

`parentConfig` is already on the facet input; `elevation`, `inset` and `frame` are already
facets receiving it. What is missing is that three of them do not read it, and that nothing
names the bundle. Stated plainly because the opposite framing — a new axis, a new pass —
would be a much larger change than the gap warrants.

### D3 — only the theme-owned cascade is in scope

`child<Axis>` on the parent's config, resolved by the facet that owns the axis, exactly as
`density` does it. The author-driven cascade ({% ref "SPEC-156" /%} D8's `childDefaults`)
is a separate mechanism with a separate owner and is explicitly out.

### D4 — a surface treatment is a **preset**: a named bundle of existing axis values

Not a new axis. {% ref "ADR-030" /%} rule 2 forbids promoting a combination to an axis
name; a preset is a combination by definition, so it is the right container for one. The
repo has the naming precedent — `packages/lumina/src/presets/` ships nine — though those
are `ThemeTokensConfig` colour families, so the mechanism is new even where the word is not.

### D5 — a preset may carry positional rules; an axis may not

This is the line that keeps D4 honest. `comic`'s `:nth-child(even)` tilt is legitimate in a
preset and inexpressible as an axis value, and that asymmetry is the reason the two are
different kinds of thing rather than two spellings.

### D6 — `bento-cell` is the acceptance consumer, and success is deletion

The cell stops hand-drawing `flat` and `sunken` and takes them from the axis, and the
`:where()` zero-specificity workaround goes with them. A consolidation whose consumer keeps
its CSS has not consolidated anything.

### D7 — `storyboard`'s three variants are the stress case, not the motivation

They are what a proposal has to express — all three, `comic` included — before it ships.
But the chrome survives composition regardless (measured above), so no part of this spec may
be justified by rescuing it.

### D8 — {% ref "SPEC-107" /%}'s cascade claim is reconciled, in one direction or the other

A `shipped` spec should not promise a mechanism the code does not have. Either the cascade
lands (this spec), or SPEC-107's sentence is corrected to describe what was actually built —
an author attribute and a per-rune default. Doing neither leaves a reader trusting a
sentence that is false, which is how {% ref "ADR-035" /%} came to be rejected and how
{% ref "BUG-013" /%} came to sit `confirmed` after its fix shipped.

Note the scope: the claim covers *three* axes. This spec covers `elevation`, `inset` and
`frame`; `prominence` is named in SPEC-107's sentence too and is not examined here, so the
reconciliation has to check it rather than assume it.

### D9 — `childDensity`'s one-way asymmetry is decided, not inherited by accident

Either a parent may only increase density (and a generalised form states why), or the
restriction was an artefact and the general form is symmetric. Cheap to settle now and
awkward to change once three axes share it.

## Non-goals

- The author-driven cascade (D3) — {% ref "SPEC-156" /%} D8's question, still open
- Specifying the facet registry itself, whose own comment reads *"Facet pass (SPEC
  pending)"* — this spec consumes it and does not define it
- Adding axes. `elevation`, `inset`, `frame` and `density` are the four in play and all
  four exist
- The arrangement vocabulary ({% ref "SPEC-156" /%}); a surface is not a topology
- Composing `storyboard` or `bento-cell`, which are audit questions
  ({% ref "SPEC-147" /%}, {% ref "SPEC-151" /%})

## Acceptance Criteria

- [ ] `elevation`, `inset` and `frame` read `parentConfig` the way `density` does, with a declared `child<Axis>` on the parent, asserted per axis
- [ ] A bento with `elevation="raised"` produces a cell that carries an elevation, and the probe in this spec — which shows the cell carrying none — is the regression test
- [ ] `bento-cell`'s hand-drawn `flat` and `sunken` rules are **deleted**, not supplemented, and the `:where()` zero-specificity workaround is gone with them (D6)
- [ ] A surface preset resolves to axis values on the container and to the declared child axes on its items, with no new engine pass
- [ ] A preset can express all three storyboard variants including `comic`'s positional tilt, asserted on rendered output rather than on config (D5, D7)
- [ ] An attempt to add a *combination* as an axis value is rejected, so {% ref "ADR-030" /%} rule 2 is enforced rather than documented
- [ ] {% ref "SPEC-107" /%}'s "region/context cascade" sentence is either made true or corrected, and `prominence` is checked rather than assumed (D8)
- [ ] `childDensity`'s `'compact' | 'minimal'` restriction is either stated with its reason or lifted, and the generalised form matches that choice (D9)
- [ ] `npm run seo:baseline:check` shows no diff; `refrakt contracts --check` shows a reviewed diff on both copies, since the cell gains an elevation attribute
- [ ] The CSS-coverage test's known-gap sets shrink, so a consolidation cannot be recorded as an exemption
- [ ] The theme-authoring guide distinguishes a preset from an axis, with `comic` as the worked example of why the distinction exists

## References

- {% ref "ADR-030" /%} — rule 2 forbids promoting a combination to an axis name, which is why D4 reaches for a preset
- {% ref "SPEC-156" /%} — the ladder and row arrangements; D8's author-driven cascade, which D3 separates from this one
- {% ref "SPEC-145" /%} — composed runes; D2's no-CSS rule, and D16's `contextModifiers` by which storyboard's chrome survives
- {% ref "SPEC-147" /%} — the storytelling audit; where `storyboard`'s CSS was first costed, and D16's worked migration
- {% ref "SPEC-151" /%} — the marketing audit; `bento`'s attribute cascade, and why composing the cell does not unblock the parent
- {% ref "SPEC-158" /%} — the identity guard's granularity; the sibling question of what a theme may override, at what depth
- {% ref "ADR-028" /%} — identity versus presentation; the line D3's ownership split protects
- {% ref "SPEC-094" /%} — the `@layer skeleton, skin` contract that separates the geometry of a surface from its decoration
- {% ref "SPEC-107" /%} — the surface axes; `shipped`, and the source of both the unbuilt cascade claim (D8) and the `frame-shadow` distinction a preset must preserve
- {% ref "ADR-035" /%} — `rejected` for an obligation owed to a document that was never written; D8's cautionary precedent

{% /spec %}
