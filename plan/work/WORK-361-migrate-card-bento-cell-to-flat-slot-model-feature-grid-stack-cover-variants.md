{% work id="WORK-361" status="done" priority="high" complexity="complex" source="SPEC-091" tags="engine, runes, marketing, refactor" milestone="v0.20.0" %}

# Migrate card/bento-cell to flat-slot model; feature grid/stack + cover variants

Migrate `card`/`bento-cell` to the SPEC-081 flat-slot + base-`layout` model (prerequisite for the cover variant), migrate `feature`'s grid/stack conditional out of its transform into a `media-position` variant, and document the variants primitive.

## Acceptance Criteria
- [x] `card` and `bento-cell` emit flat `data-name` slots and carry a base `layout` (grouping moved out of the transform), mirroring `recipe`.
- [x] `feature`'s grid/stack conditional is migrated from its transform to a `media-position` variant (removing a flat-transform violation).
- [x] `compoundVariants` is documented as a reserved future extension, not implemented.
- [x] A theme-authoring "variants" section documents the primitive.

## Approach
Strip `contentDiv`/`mediaDiv` assembly in `card.ts`/`bento.ts`. SPEC-091 §5, §7; `plugins/marketing/src/tags/feature.ts`.

## References

- {% ref "SPEC-091" /%}

## Resolution

Completed: 2026-06-09

Branch: `claude/spec-091-engine-variants`

### What was done
- Migrated `card` (`packages/runes/src/tags/card.ts` + config) and `bento-cell` (`plugins/marketing/src/tags/bento.ts` + config) to the SPEC-081 flat-slot model: transforms emit flat `data-name` slots; a base `layout` groups them into the `content` wrapper — the prerequisite for the cover variant (SPEC-089).
- Migrated `feature`'s grid/stack out of its transform to a `media-position` engine variant toggling the `--definitions-grid` modifier; `feature.css` drives the grid off it.
- Documented variants in `site/content/extend/theme-authoring/blocks-and-layout.md`.

### Notes
- All 3134 workspace tests pass.
- Regenerating contracts also resolved pre-existing drift that was stale on main (e.g. card's `data-layout="stacked"`).
- Feature's grid/stack was already CSS-driven off `data-media-position`; the migration makes the toggle a config variant per the chosen approach.

{% /work %}
