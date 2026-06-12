{% work id="WORK-403" status="done" priority="medium" complexity="simple" tags="lumina,density,css,bug" milestone="v0.21.0" %}

# Nested-density title sizing — full-density runes in compact hosts

Long-standing leak in the density dimension, surfaced by the SPEC-101 hero-cover
docs: `sections.css` scaled titles with a descendant selector
(`[data-density="compact"] [data-section="title"] { font-size: 1.25rem }`), which
punches through nested densities — a full-density hero inside a compact `preview`
renders its headline at 1.25rem, wildly unrepresentative of the real rune. The
existing "nested density scoping" resets in `density.css` covered descriptions and
meta ranks but never the title, and a value-based reset can't work for titles
(each rune sets its own size).

## Acceptance Criteria
- [x] `[data-section="title"]` sizes via a custom property (`--rf-title-size`) declared per density root, so a nested rune's own `data-density` re-declares it and the subtree is self-contained.
- [x] A full-density hero inside a compact preview keeps its real headline size; per-rune title CSS (e.g. `.rf-hero__headline`) outranks the base attribute selector.
- [x] Compact and minimal runes keep their existing title scale (1.25rem / 1rem) — no visual change outside the nested case.

## References
- Pattern precedent: the `--rune-padding` density variable; nested-density resets in `packages/lumina/styles/dimensions/density.css`.

## Resolution

Completed: 2026-06-12

Branch: `claude/spec-101-hero-cover-prism`

### What was done
- `packages/lumina/styles/dimensions/sections.css` — `[data-section="title"]` consumes `var(--rf-title-size, 1.5rem)`; the compact/minimal descendant-selector overrides removed.
- `packages/lumina/styles/dimensions/density.css` — `--rf-title-size` declared per density root (full 1.5rem / compact 1.25rem / minimal 1rem), alongside `--rune-padding`.

### Notes
- Self-containment falls out of inheritance: the nested rune's own `data-density` root re-declares the var for its subtree. Per-rune title CSS now also outranks the base `[data-section="title"]` (0,1,0) selector — previously the compact descendant rule (0,2,0) beat e.g. `.rf-hero__headline` (0,1,1), which was the reported bug.

{% /work %}
