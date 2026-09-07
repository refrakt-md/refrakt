{% work id="WORK-538" status="ready" priority="high" complexity="moderate" source="SPEC-107" tags="lumina,css,prominence,dimensions,dx" milestone="v0.32.0" %}

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

- [ ] `prominence` visibly changes the title size on all eight runes, verified by
      measuring computed `font-size` in a browser rather than by reading the CSS
- [ ] Each rune keeps its **current** size at the default (`normal`, or unset) —
      this must not restyle any page that never asked for prominence
- [ ] `Hero`'s raw `3.25rem` becomes a token
- [ ] The 28 runes where the axis already works are unchanged
- [ ] A test locks the mechanism so a future rune stylesheet cannot silently
      re-break it — ideally a check that no `.rf-*__{title-slot}` rule sets
      `font-size` without going through `--rf-title-size`
- [ ] The CSS coverage tests pass and `refrakt contracts --check` is unmoved
      (this changes no emitted attribute)
- [ ] `npm run build` and the full repo suite pass

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

{% /work %}
