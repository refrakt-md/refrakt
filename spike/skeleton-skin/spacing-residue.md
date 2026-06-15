# Spacing-token residue inventory (WORK-435 → WORK-438)

WORK-435 tokenized the slice (`card`, `hint`, `surfaces.css`) and densified the
spacing scale. This is the **residue** — the hardcoded spacing literals across
the rest of Lumina — for WORK-438 to clear file-by-file as it re-buckets.

## The densified scale (WORK-435)

Added two component-band rungs to fill the `sm`(0.5)→`md`(1.5) hole:

```
xs 0.25 · sm 0.5 · snug 0.75 · cozy 1 · md 1.5 · lg 2 · xl 3 · 2xl 4   (rem)
```

## Rationalization map (apply to the residue)

Hand-tuned values map onto the scale; nudges ≤ 4px (mostly ≤ 2px):

| literal | → token | Δ |
|---------|---------|---|
| 0.25rem | `xs` | 0 |
| 0.375rem | `xs` | −2px |
| 0.5rem | `sm` | 0 |
| 0.625rem | `sm` | −2px |
| 0.75rem | `snug` | 0 |
| 0.875rem | `snug` | −2px |
| 1rem | `cozy` | 0 |
| 1.25rem | `cozy` | −4px |
| 1.5rem | `md` | 0 |
| 2/3/4rem | `lg`/`xl`/`2xl` | 0 |

Values clearly outside the band (e.g. icon glyph sizes like `1.25rem` width,
`font-size`/`line-height`, `0.8125em`) are **not** spacing — leave them
(typography is a separate token concern; sizes stay literal).

> The nudges are intentional rationalization (sub-2px except 1.25→cozy). They
> are not verifiable here (the WORK-409 harness needs a browser); confirm with a
> capture-then-compare run when a browser env is available.

## Residue scope

**~726 hardcoded spacing literals across 93 files** (excluding the slice).
Heaviest offenders (clear early for the biggest win):

| file | literals |
|------|----------|
| runes/nav.css | 50 |
| layouts/blog.css | 33 |
| runes/symbol.css | 20 |
| runes/comparison.css | 19 |
| layouts/plan.css | 19 |
| layouts/docs.css | 18 |
| runes/hero.css · runes/form.css | 17 |
| runes/itinerary.css · runes/budget.css | 16 |
| (… 83 more files, mostly < 12 each) | |

WORK-438 sequences by file group (rune → dimension → layout); fold the spacing
tokenization into each file's pass rather than as a separate sweep.
