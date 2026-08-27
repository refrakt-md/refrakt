{% milestone name="v0.30.1" status="planning" %}

# v0.30.1 — Transform engine facet decomposition

House-cleaning on the most central package in the project. `transformRune` in
`packages/transform/src/engine.ts` resolves every universal rune axis — tint,
density, width, spacing, reading, elevation, prominence, motion, background,
frame, substrate, cover — in one ~800-line function whose steps are numbered
`1, 1b, 1c … 1h, 2 … 9`. This milestone replaces that section with a **facet
registry** ({% ref "SPEC-124" /%}): one module per axis, dependencies declared
rather than implied by statement order, and a driver that merges their
contributions.

No feature work. Every step is behaviour-preserving, and the governing rule is
that the 630 pre-existing transform tests never change — they run through the
public entry point, so an edit to accommodate a migration is a bug report, not
a fix.

## Shape

The engine's own comments already call these axes *facets* ("SPEC-105 motion
facet", "the scrim facet"), and 18 of the ~50 transform test files are already
named after individual axes. The decomposition is being recovered, not invented.

The interface is recorded in {% ref "SPEC-124" /%} as the prototype **corrected**
it — `state` separate from emitted `axes`, ordered style pairs (CSS last-wins is
load-bearing), a required `postAssemble` phase, and a seeded-dependency surface
for un-migrated producers. Each was wrong in the first draft and only surfaced
when tested against cover/scrim, which is why the migration order below front-loads
the hard cases rather than saving them.

Two findings are scoped **out** and filed for later: theme values hard-coded in
the engine (`SCRIM_STRENGTH`, `SUBSTRATE_CELL`, `BLUR_PRESETS`) belong in design
tokens, and `packages/transform` has a separate cohesion problem — it also holds
i18n, token stylesheets, HTML rendering, adapters and a Vite plugin.

## Sequencing

Ordered by dependency, not by size.

- **Foundation:** {% ref "WORK-517" /%} (interface, driver, elevation +
  prominence — deliberately the easy case) → {% ref "WORK-518" /%} (cover/scrim,
  the hardest coupling; expected to correct the interface).
- **Colour and surface:** {% ref "WORK-519" /%} (tint) → {% ref "WORK-520" /%}
  (background — the first facet that builds its own element tree, and the first
  real use of `layers`). Tint goes first because bg's scrim polarity consults
  tint's colour scheme.
- **Breadth:** {% ref "WORK-521" /%} (remaining scalar axes) and
  {% ref "WORK-522" /%} (frame + substrate chrome) run in parallel after 518.
- **Scaffolding removal:** {% ref "WORK-523" /%} (the generic config-modifier
  loop — the riskiest single migration, so it goes last; retires the seeding
  surface) → {% ref "WORK-524" /%} (warn-once consolidation and the deferred
  dedupe-scope decision).
- **Open question:** {% ref "WORK-525" /%} — whether structure contracts can
  derive from facets instead of being re-derived independently. Time-boxed, with
  a cheaper fallback if it doesn't pan out.

{% /milestone %}
