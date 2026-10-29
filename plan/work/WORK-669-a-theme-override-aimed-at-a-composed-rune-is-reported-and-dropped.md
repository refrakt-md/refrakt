{% work id="WORK-669" status="ready" priority="high" complexity="simple" source="ADR-042" tags="theme, composition, config, identity, merge" milestone="v0.44.0" %}

# A theme override aimed at a composed rune is reported and dropped

{% ref "ADR-042" /%} makes a composed rune's config its definition's: a theme cannot know which
definition it faces, so an override of a composed rune's `blocks` or `metaFields` is a guess
that silently resolves to nothing. Nothing enforces this yet. `mergeThemeConfig` and
`mergeRuneConfig` (`packages/transform/src/merge.ts`) guard the identity fields on every rune,
and nothing else, so a theme's `runes:` entry keyed to a composed rune's type name applies.

v0.44.0 adds the first composed runes a theme could try to override (`hero`, `cta`,
`testimonial`), so the guard lands with them.

## Acceptance Criteria

- [x] A theme override keyed to a rune whose config came from `composedRuneConfig` is reported, naming the theme, the rune and the path, and dropped whole
- [x] It is reported through the same sink and once-per-path rule as identity violations
- [x] Native runes' overrides are unaffected: identity fields stay guarded and the rest stays overridable
- [x] A test pins that an override of a composed rune's `blocks` is reported and dropped, and that Lumina's config trips nothing
- [x] The theme-authoring docs say a composed rune's config cannot be overridden, and point to ADR-042 and to template replacement ({% ref "ADR-045" /%}) as the route a theme has

## Approach

`assembleThemeConfig` already carries provenance for plugin runes (`packages/transform/src/assemble.ts`).
Composed runes need the same marker, so the merge can tell a composed config from a native one
without inspecting its shape.

## References

- {% ref "ADR-042" /%}: Decision 1, and Implementation.

{% /work %}
