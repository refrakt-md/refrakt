{% work id="WORK-374" status="done" priority="medium" complexity="moderate" source="SPEC-089" tags="surfaces, runes, engine, lumina, layout" milestone="v0.20.0" %}

# content-place 2-axis logical overlay anchor + orientation-adaptive auto

Add `content-place`, a 2-axis logical overlay anchor active only in cover mode, with an orientation-adaptive `auto` default.

## Acceptance Criteria
- [x] `content-place` is 2-axis logical (`start|center|end` × `start|center|end`), default `end`, mapping to `justify`/`align`; physical aliases may exist.
- [x] Active only in `cover` mode; a build warning otherwise.
- [x] `content-place="auto"` (the cover default) adapts to the rune's container-query orientation (portrait→block-end, landscape→inline-start); an explicit value pins it.

## Approach
Media zone is a container-query context (WORK-339). SPEC-089 §2.

## References

- {% ref "SPEC-089" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-089-cover-layout`

### What was done
- `packages/transform/src/engine.ts` — `content-place` resolution: a 2-axis logical value (`<block> <inline>`) emits `--cover-place-block` / `--cover-place-inline` custom properties (mapping to `align-self`/`justify-self`). Active only in cover mode; `warnContentPlaceOutsideCover` warns once otherwise and emits no vars.
- `content-place="auto"` emits no place vars, deferring to the container query in CSS.
- `packages/lumina/styles/dimensions/cover.css` — orientation adaptation: an unset content-place behaves the same as explicit `auto` (the cover default) — portrait → block-end, landscape (`@container (min-aspect-ratio: 1/1)`) → inline-start. An explicit value sets the vars and pins regardless of orientation.
- `packages/runes/src/tags/card.ts` + `plugins/learning/src/tags/recipe.ts` — declare the `content-place` attribute and emit it as a meta (the field channel) so the engine reads it; both already declared the modifier but weren't emitting the meta.

### Notes
- The media well is the container-query context; the overlay box adapts to the cover region's own aspect, not the viewport.

{% /work %}
