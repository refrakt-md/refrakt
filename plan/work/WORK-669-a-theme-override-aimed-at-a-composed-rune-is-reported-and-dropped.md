{% work id="WORK-669" status="done" priority="high" complexity="simple" source="ADR-042" tags="theme, composition, config, identity, merge" milestone="v0.44.0" pr="refrakt-md/refrakt#729" %}

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

## Resolution

Completed: 2026-10-29

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `RuneConfig.composed` (provenance marker), set by `composedRuneConfig`.
- `mergeThemeConfig` (`packages/transform/src/merge.ts`): an override of a composed rune is reported through the identity sink (once per path, `runes.<Rune>`, naming the theme) and dropped whole; a composed declaration replaces the entry under its key rather than merging over it, and reports a non-composed entry it displaces.
- `mergeThemeConfig` takes `{ themeName }`; `assembleThemeConfig` takes `themeName`; Lumina passes `'lumina'`.
- Tests: `packages/transform/test/identity-fields.test.ts`, `packages/lumina/test/identity-guard.test.ts`.
- Docs: `site/content/extend/theme-authoring/config-api.md` ("Composed runes").

### Notes
- The marker is a plain field rather than a symbol so it survives a JSON boundary; the merge never infers it from the config's shape.

{% /work %}
