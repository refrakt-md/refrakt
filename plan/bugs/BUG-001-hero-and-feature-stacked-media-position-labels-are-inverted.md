{% bug id="BUG-001" status="fixed" severity="major" tags="marketing,lumina,layout,hero,feature,steps" milestone="v0.21.0" %}

# Hero, feature, and step stacked media-position labels are inverted

The shared stacked-layout contract (`packages/lumina/styles/layouts/split.css`)
assumes **media-first source order**: `top` is plain DOM order, `bottom` flips
visually via a generic `column-reverse`. But `hero`, `feature`, and `step` emit
**content-first DOM** (text before media — the right reading order for their
classic media-beneath-text presentation). Result: both stacked labels lie —
the default `top` rendered media at the *bottom*, and an explicit `bottom`
hoisted it to the *top*. Found in SPEC-101 review (PR #432); pre-existing.

## Steps to Reproduce
1. Author a `{% hero %}` with a media zone (`media --- content`) and `media-position="bottom"`.
2. Observe the media renders **above** the headline.
3. Omit the attribute (default `top`): the media renders **below**.

## Expected
`top` puts media above the content; `bottom` (and the rune's default look)
puts it beneath.

## Actual
Inverted, both ways, for `hero`, `feature`, and `step` (all three share the
content-first transform shape; verified in `plugins/marketing/src/tags/`).

## Resolution

Completed: 2026-06-12

Branch: `claude/spec-101-hero-cover-prism` (PR refrakt-md/refrakt#432)

### What was done
Fixed by making the labels truthful rather than reordering the DOM — reordering
would silently flip every existing attribute-less hero/feature/step, and
content-first DOM is the better reading order for the default presentation:

- **Default flips to `bottom`** for Hero/Feature/Step (transform-side in
  `hero.ts`/`feature.ts`/`steps.ts` + config modifier defaults) — existing
  content keeps its exact rendering, now correctly labelled.
- **Lumina counters the shared media-first stacked rules** per rune
  (`hero.css`, `feature.css`, `steps.css`): `[data-media-position="bottom"]`
  restores plain block flow (defeating the generic `column-reverse`);
  `[data-media-position="top"]` applies the flip so explicit `top` renders
  media above. Hero's media gap margin swaps sides in `top` mode.
- Feature's `definitions-grid` variant covers both `top` and `bottom`, so the
  default change keeps the grid. `start`/`end` (explicit grid columns) and
  `cover` (grid-area stacking) never depended on DOM order — unaffected.
- Tests: default-is-bottom + explicit top/bottom pass-through (hero); full
  marketing suite green. Docs tables updated (hero/feature/steps); contracts
  regenerated; changeset notes the behaviour fix.

### Notes
- The honest framing: nobody can have been relying on the *labels* (they were
  inverted), but everyone relies on the *default rendering* — so the fix pins
  the default to the rendering and corrects the labels around it.

{% /bug %}
