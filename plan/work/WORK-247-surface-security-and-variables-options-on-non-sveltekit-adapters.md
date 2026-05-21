{% work id="WORK-247" status="ready" priority="medium" complexity="simple" source="SPEC-058" tags="adapters, security, markdoc-variables" milestone="v0.14.4" %}

# Surface security and variables options on non-SvelteKit adapters

Two `RefractPluginOptions` fields are only honoured by `@refrakt-md/sveltekit` today, even though the underlying machinery (`createRefraktLoader` + `loadContent`) accepts both:

1. **`security` (`SecurityPolicy`)** — `packages/sveltekit/src/types.ts:22`. Passed to `loadContent` so the content pipeline can sanitise author content for untrusted-input hosting scenarios (the refrakt hosted product surface; site-as-a-service hosts).
2. **`variables` (`Record<string, string>`)** — `packages/sveltekit/src/types.ts:17`. Resolved into the virtual content module as Markdoc variables, available in content via `{% $name %}`. The site uses this for `__REFRAKT_VERSION__` interpolation (`site/vite.config.ts:11`).

Both fields plumb through `createRefraktLoader` (`packages/content/src/refract-loader.ts:15–25`) so non-SvelteKit adapters that already use the loader inherit support — they just don't surface the options in their public API.

## Acceptance Criteria

### Astro

- [ ] `RefraktAstroOptions` extends with `security?: SecurityPolicy` and `variables?: Record<string, string>` (plus `Record<string, unknown>` value type — see Approach)
- [ ] The Astro integration forwards both into `createRefraktLoader` (once {% ref "WORK-244" /%}-style usage of the shared loader lands in the integration or template setup)
- [ ] Documentation page `site/content/docs/adapters/astro.md` covers both options with example usage

### Nuxt

- [ ] `RefraktNuxtOptions` extends with the same two fields
- [ ] Nuxt module forwards them into whatever loader path the module uses for content loading (Vite virtual module + `createRefraktLoader` as the SvelteKit reference does)
- [ ] Documentation page `site/content/docs/adapters/nuxt.md` covers both options

### Next.js

- [ ] `createRefraktLoader` call sites in the template / helper APIs accept and forward `security` and `variables` parameters
- [ ] Documentation page `site/content/docs/adapters/next.md` covers both options

### Eleventy

- [ ] `createDataFile`'s config object extends with `security` and `variables`; both forwarded to the underlying `loadContent` call
- [ ] Documentation page `site/content/docs/adapters/eleventy.md` covers both options

### HTML

- [ ] The HTML adapter's build entry point accepts `security` and `variables` and forwards into `createRefraktLoader`
- [ ] Documentation page `site/content/docs/adapters/html.md` covers both options

### Cross-cutting

- [ ] A test site under each non-SvelteKit template, configured with `variables: { version: '"1.0.0"' }` (note the embedded JSON value) and Markdoc content using `{% $version %}`, renders `1.0.0` in the output
- [ ] A test site configured with `security: { policy: 'strict' }` (or whatever the `SecurityPolicy` shape declares as the locked-down preset) produces sanitised output for an author-provided script tag

## Approach

Both fields are pure passthrough. The Astro integration currently has:

```ts
const refraktConfig = loadRefraktConfig(configPath);
const { site } = resolveSite(refraktConfig, options.site);
```

It will grow into using `createRefraktLoader` (matching the template-astro cleanup in {% ref "WORK-244" /%}, lifted up to the integration layer where it natively belongs):

```ts
const loader = createRefraktLoader({
  configPath,
  site: options.site,
  variables: options.variables,
  // security passed to the underlying loadContent call inside createRefraktLoader
  // — extend the loader's options shape if it doesn't already accept it
});
```

The same shape applies to Nuxt's module, Eleventy's data file, and any Next.js / HTML helper.

**Variable value typing:** the SvelteKit plugin's `variables: Record<string, string>` interprets values as raw JavaScript expressions embedded in the generated virtual module (`packages/sveltekit/src/types.ts:17`). For non-Vite adapters that go through `createRefraktLoader` directly, the value type is `Record<string, unknown>` — actual JavaScript values, not source-text expressions, because there's no generated module to embed into. Document both shapes; type discriminator is the adapter (Vite vs. runtime).

**`createRefraktLoader` security forwarding:** check whether the current loader (`packages/content/src/refract-loader.ts:15–25`) accepts a `security` option. If not, extend the options interface to add it and forward into the underlying `loadContent` call. The SvelteKit plugin currently passes `security` directly to `loadContent` (line 182) without going through the loader — closing that gap is part of this item.

## Dependencies

Pairs naturally with the per-adapter wiring items but doesn't block on them. If {% ref "WORK-244" /%} lands first, the Astro template already wires through `createRefraktLoader` and only needs the option surface added.

## References

- {% ref "SPEC-058" /%} — adapter parity spec (this item moves `security` + `variables` out of "Out of scope")
- {% ref "WORK-177" /%} — `SecurityPolicy` for transform pipeline (the spec that introduced the option)
- `packages/sveltekit/src/types.ts:17,22` — reference shape for both options
- `packages/content/src/refract-loader.ts:15–25` — loader options interface (may need extension for `security`)
- `site/vite.config.ts:11` — example `variables` consumer

{% /work %}
