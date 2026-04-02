{% work id="WORK-101" status="ready" priority="high" complexity="moderate" tags="runes, content-model" milestone="v1.0.0" %}

# Migrate moderate-complexity runes from Model to createContentModelSchema

Migrate runes that have multiple groups, context-dependent group logic, or light custom processing. These need more careful mapping but don't require the `custom` escape hatch.

## Runes

| Rune | Location | Challenge | Content model |
|------|----------|-----------|---------------|
| nav | `packages/runes/src/tags/nav.ts` | Multiple heading-based sections with nested structure | sections |
| pricing | `runes/marketing/src/tags/pricing.ts` | Multi-section layout with header/features/footer split | sections |
| map | `runes/places/src/tags/map.ts` | Sections with location extraction from child content | sections |
| storyboard | `runes/storytelling/src/tags/storyboard.ts` | Image-triggered panel accumulator with caption grouping | custom |

## Acceptance Criteria

- [ ] `nav` rewritten using `createContentModelSchema` with `sections` content model
- [ ] `pricing` rewritten using `createContentModelSchema` with `sections` content model
- [ ] `map` rewritten using `createContentModelSchema` with `sections` content model
- [ ] `storyboard` rewritten using `createContentModelSchema` with `custom` content model
- [ ] `refrakt inspect <rune> --type=all` output is identical before and after for each rune
- [ ] All existing tests pass after each migration
- [ ] No Model class import remains in any of the migrated files

## Approach

- `nav`: Map the heading-level group splits to a `sections` model. Heading content becomes section names; nested content follows naturally.
- `pricing`: Header/body/footer groups map to named sections. Feature list extraction stays in the transform function.
- `map`: Section-based content with location metadata extraction in transform.
- `storyboard`: The image-triggered panel accumulator is genuinely stateful — use `custom` content model with the panel grouping logic in `processChildren`.

## Dependencies

- WORK-099 (core simple runes migrated first)

## References

- SPEC-032 (parent spec)

{% /work %}
