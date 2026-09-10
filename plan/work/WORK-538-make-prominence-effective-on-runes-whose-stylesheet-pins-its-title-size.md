{% work id="WORK-538" status="done" priority="high" complexity="moderate" source="SPEC-107" tags="lumina,css,prominence,dimensions,dx" milestone="v0.32.0" pr="refrakt-md/refrakt#594" %}

# Make prominence effective on runes whose stylesheet pins its title size

`prominence` works by re-pointing `--rf-title-size`, which
`[data-section="title"]` reads:

```css
[data-prominence="display"] { --rf-title-size: var(--rf-text-4xl); }
[data-section="title"]      { font-size: var(--rf-title-size, var(--rf-text-2xl)); }
```

Eight rune stylesheets set `font-size` on their title element **directly**.
Rune CSS is imported after `dimensions/`, and the two selectors have equal
specificity, so the rune rule wins and `--rf-title-size` never reaches the
element. On those runes the axis is inert.

Measured in a browser against the bundled Lumina stylesheet — the headline
element's computed `font-size` across every `prominence` value:

| Rune | `quiet` → `display` | |
|---|---|---|
| `Section` | 20 → 24 → 30 → 40px | works |
| **`Hero`** | **52px at every value** | **inert** |

`{% hero prominence="display" %}` is a silent no-op today, on the rune an author
is most likely to reach for it on.

## The eight

| Rune | Pinned by |
|---|---|
| `Hero` | `.rf-hero__headline { font-size: 3.25rem }` |
| `CallToAction` | `.rf-cta__headline { font-size: var(--rf-text-4xl) }` |
| `Blog` | `.rf-blog__headline { font-size: var(--rf-text-3xl) }` |
| `BentoCell` | `.rf-bento-cell__title { font-size: var(--rf-text-lg) }` |
| `Palette` | `.rf-palette__title { font-size: var(--rf-text-lg) }` |
| `Typography` | `.rf-typography__title { font-size: var(--rf-text-lg) }` |
| `Spacing` | `.rf-spacing__title { font-size: var(--rf-text-lg) }` |
| `DesignContext` | `.rf-design-context__title { font-size: var(--rf-text-xl) }` |

28 of the 36 runes with a header-ish role are unaffected — the axis works
correctly wherever the rune does not pin its own title size.

`Hero`'s `3.25rem` is also a raw value where a token belongs, the same
discipline {% ref "WORK-340" /%} covers elsewhere.

## Why it matters now rather than whenever

This is a **skin** defect, not an applicability one — {% ref "ADR-028" /%} is
explicit that styling is the theme's business and emission is not. Left alone,
the engine would keep emitting `data-prominence` correctly and Lumina would keep
ignoring it, which is a defensible split.

What changes the calculus is {% ref "WORK-535" /%}. Its entire point is that
`refrakt reference` stops stating something false about a rune. After it lands,
`refrakt reference hero` will list `prominence` as an available attribute —
truthfully, because the schema offers it and the engine emits it — while the
reference theme does nothing with it. We would have replaced "the CLI
over-promises on every rune" with "the CLI over-promises on eight specific
runes, including the flagship one", and called that correct.

The honest options are to fix the skin or to make the CLI say the axis is
theme-dependent. Fixing the skin is better: the axis is meant to work, and
`Section` proves the mechanism is sound.

## Acceptance Criteria

- [x] `prominence` visibly changes the title size on all eight runes, verified by
      measuring computed `font-size` in a browser rather than by reading the CSS
- [x] Each rune keeps its **current** size at the default (`normal`, or unset) —
      this must not restyle any page that never asked for prominence
- [x] `Hero`'s raw `3.25rem` becomes a token
- [x] The 28 runes where the axis already works are unchanged
- [x] A test locks the mechanism so a future rune stylesheet cannot silently
      re-break it — ideally a check that no `.rf-*__{title-slot}` rule sets
      `font-size` without going through `--rf-title-size`
- [x] The CSS coverage tests pass and `refrakt contracts --check` is unmoved
      (this changes no emitted attribute)
- [x] `npm run build` and the full repo suite pass

## Approach

The shape that keeps the default intact is a per-rune fallback rather than a
removal:

```css
.rf-hero__headline { font-size: var(--rf-title-size, 3.25rem); }
```

That does **not** work as written — `--rf-title-size` is set by density on every
rune root, so it would resolve to the density value and change the default. The
options are to give each rune its own default custom property that
`[data-prominence]` overrides, or to scope the rune rule so an explicit
prominence wins. Decide once, apply to all eight; do not solve it eight ways.

Worth checking while in here: whether `[data-section="title"]`'s
`font-size` should carry more weight by construction, so a rune opting into the
`title` role gets the axis without having to remember not to pin its own size.
That would make the failure mode impossible rather than linted — but it changes
how every title-role rune resolves its type, so it is a bigger change than this
item, and worth its own decision if the answer is yes.

## Context

Found while auditing section roles for {% ref "WORK-529" /%}: adding a `title`
role to `BentoCell` granted `prominence` on paper, and measuring showed the axis
had no effect there. Widening the check across the catalogue turned up seven
more, `Hero` and `CallToAction` among them.

## Blocks
- {% ref "WORK-535" /%}

## References

- {% ref "SPEC-107" /%} — the prominence axis
- {% ref "SPEC-125" /%} — the applicability work that surfaced it
- {% ref "WORK-535" /%} — `refrakt reference` stops over-promising
- {% ref "WORK-340" /%} — Lumina token discipline (the `3.25rem`)

## Resolution

Completed: 2026-09-09

Branch: `claude/milestone-v0-31-0-e5ihxr`

### Two problems, not one

The item was written about reach: eight rune stylesheets pin their title `font-size`, so `--rf-title-size` never arrives and the axis is inert. Fixing reach exposed a second problem the first was hiding — **the ramp was an absolute type scale**, and once `prominence` could reach a rune resting outside that scale it moved the title the *wrong way*: `display` shrank a hero (52 → 40px), `quiet` enlarged a bento cell (18 → 20px). Shipping reach alone would have been worse than leaving the axis inert.

Both are fixed. The second was put to the user as a design decision rather than assumed, since SPEC-107 owns the axis; they chose the relative ramp and accepted the density consequence below.

### The mechanism

One variable carried two independent inputs — the density default and the author's override — which is why a rune had nowhere to state its own resting size that did not also clobber `prominence`. Split in two:

```css
[data-prominence="display"] { --rf-prominence-size: calc(var(--rf-title-size, …) * 5 / 3); }
[data-section="title"]      { font-size: var(--rf-prominence-size, var(--rf-title-size, …)); }
```

- `--rf-title-size` is the **resting** size: density sets it, and a rune may override it on its root.
- `--rf-prominence-size` is the **author's override**: only `[data-prominence]` sets it, and it is read first.
- `density.css` clears `--rf-prominence-size` at every `[data-density]` root — every rune root has one — so an ancestor's `prominence` cannot leak into a nested rune's title. It is declared in `density.css` specifically because that file is imported *before* `surfaces.css`, so a rune carrying both attributes still keeps its own.

The eight pinning runes now declare `--rf-title-size` on their root and read `var(--rf-prominence-size, var(--rf-title-size))` on the title element. One pattern, applied identically to all eight, per the Approach's instruction not to solve it eight ways. The title rule (rather than deleting it in favour of `[data-section="title"]`) is kept because `hero` and `cta` group a bare-tag fallback into it — `.rf-hero h1, .rf-hero__headline` — which would otherwise lose the treatment.

### The ramp

The multipliers are the ratios the old fixed steps had to the `2xl` resting size — ×5/6, ×5/4, ×5/3 — expressed as exact fractions so `1.5rem` still yields precisely 20 / 30 / 40px. That makes the change a no-op for every rune resting at the density default while giving runes resting above or below it a ramp that moves in the direction its name implies.

### Measured, not reasoned

Headless Chromium against the bundled stylesheet, **all 36 title-role runes × 4 prominence values × 2 densities**, before and after:

- **No resting size changed anywhere.** Nothing that never asked for `prominence` is restyled.
- **Full density:** the 28 already-working runes are byte-identical (24/20/30/40). The eight changed from flat to a real ramp — `Hero` 52 → 43.3/52/65/86.7, `CallToAction` 40 → 33.3/40/50/66.7, `BentoCell` 18 → 15/18/22.5/30.
- **Compact density:** all 36 changed, 20/20/30/40 → 20/16.7/25/33.3. The ramp now scales with density instead of ignoring it. This is the deliberate, user-approved half of the change and the changeset calls it out.
- **Nesting:** a `bento-cell` inside a `display`-prominence `section` stays at its own size, before and after.
- **Nothing is inert.** Zero runes now show one size across all four values.

### The guard, and the guard's own bug

`packages/lumina/test/prominence-reach.test.ts` derives the `.rf-{block}__{slot}` selectors from config and fails if any rune stylesheet declares a title `font-size` outside the chain — the shape of the mistake, not a list of runes.

Worth recording: **the first version of it silently passed.** Its `font-size` matcher required `^` or `;` before the declaration, and in every real rule the declaration follows a comment, so it matched nothing and reported no offenders. Caught by deliberately re-introducing the pin and checking the test failed. It now uses a lookbehind, and both directions are verified — it fails with the pin restored, passes without it. A guard that cannot fail is worse than no guard, because it is trusted.

### `hero`'s `3.25rem`

Now a named resting size on `.rf-hero` rather than an inline number. Deliberately **not** promoted to a `--rf-text-5xl` token: `packages/types/src/token-contract.ts` enumerates the scale as a typed `xs … 4xl` interface every theme must satisfy, and adding a step to accommodate one rune's one-off would oblige every theme to define it. The criterion asked for "a token"; a named Lumina-local property satisfies the intent — no magic number buried in a rule — without a contract change. Flagging in case you read that criterion more literally.

### Files changed

- `packages/lumina/styles/dimensions/sections.css` — the consumer reads the override first
- `packages/lumina/styles/dimensions/surfaces.css` — the relative ramp, with the reasoning inline
- `packages/lumina/styles/dimensions/density.css` — the nested-rune reset
- 8 rune stylesheets — resting size on the root, chain on the title element; `palette`, `typography`, `spacing` and `design-context` gained a root rule (they had none)
- `packages/lumina/test/prominence-reach.test.ts` (new, 3 cases)
- `site/content/runes/surfaces.md` — the ramp is relative
- `plan/specs/SPEC-107-*.md` — a reference-implementation note. The spec itself is **unchanged and did not need to be**: it already delegates magnitude to the theme ("the theme owns the actual paint and may interpret, clamp, or no-op a value"), which is exactly the latitude used.
- `.changeset/olive-seals-shake.md`

### Notes

- Verified: `npm run build` clean, full suite 4160/4160 across 342 files, `refrakt contracts --check --site main` unmoved (this changes no emitted attribute).
- `packages/proof-skin` is unaffected: it reads `--rf-title-size`, which density still sets, and implements no `prominence` rules at all — its prerogative under ADR-028.
- This unblocks {% ref "WORK-535" /%}, which can now make `refrakt reference` authoritative without the reference theme contradicting it.

{% /work %}
