{% work id="WORK-680" status="ready" priority="high" complexity="moderate" source="SPEC-181" tags="runes, composition, staging, content, sveltekit" milestone="v0.44.0" %}

# runes.staging loads staged definitions into a separate rune set

A site can name staging directories of composed definitions, each file named after the plugin
rune it will replace ({% ref "SPEC-181" /%} D1). The loader builds a second, staged rune set
next to the live one: schemas, generated theme config and engine. Nothing renders with it yet;
{% ref "WORK-681" /%} adds the mirror pages that use it.

## Acceptance Criteria

- [ ] `SiteConfig.runes.staging` (`{ dirs: string[], mount?: string }`, `mount` defaulting to `/staging`) is typed, in `refrakt.config.schema.json`, and documented on the type
- [ ] The loader builds the staged set from the same merge as the live set, with each staging directory loaded as project runes and `prefer` set to `__project__` for every staged name (SPEC-181 D5)
- [ ] In the staged set a staged rune replaces the plugin rune's schema, generated theme config and aliases; the plugin's hand-written theme entry for that rune is not applied
- [ ] A staged file whose name no loaded plugin provides is an error naming the file; a core rune's name is an error (SPEC-181 D4)
- [ ] With `runes.staging` set, the live tags, theme config and every live page's output are identical to a build without it, asserted by a test
- [ ] The SvelteKit virtual module exposes the staged transform beside `getTransform`, and dev invalidation covers the staging directories (SPEC-153 D10)

## Approach

- `packages/content/src/refract-loader.ts` `assembleSiteContext` already merges project runes through `loadProjectRunes` and `mergePlugins`. Run that merge a second time with the staging directories, keeping the live context unchanged.
- `packages/sveltekit/src/plugin.ts` mirrors the loader's plugin merge. It needs the same second merge, or should switch to the shared helper if one falls out of this work.
- The marketing test harness drops the plugin's hand-written theme entry for each composed rune by hand (`composedMarketing`). The staged merge has to do the same, or the generated config is overridden.

## Blocks

- {% ref "WORK-681" /%}
- {% ref "WORK-682" /%}

## References

- {% ref "SPEC-181" /%}: D1, D3, D4, D5.
- {% ref "SPEC-153" /%}: D8, D10.

{% /work %}
