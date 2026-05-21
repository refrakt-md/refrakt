{% work id="WORK-240" status="ready" priority="high" complexity="moderate" source="SPEC-058" tags="adapters, astro, tokens" milestone="v0.14.4" %}

# Wire site-tokens CSS through the Astro adapter

Inject the CSS produced by `composeSiteTokensCss(site, configDir)` into pages rendered by `@refrakt-md/astro`, so that `theme.tokens`, `theme.modes`, `theme.presets`, and `site.tints` configured in `refrakt.config.json` actually take effect on Astro sites. Currently the Astro integration imports the theme package's bare CSS via `injectScript('page-ssr', `import '${themePackage}';`)` and never reads the site-level overrides — silently dropping every preset / token / mode / tint declared in config.

Astro runs on Vite, so the SvelteKit pattern of a Vite virtual module transplants cleanly.

## Acceptance Criteria

- [ ] `@refrakt-md/astro` defines a Vite virtual module `virtual:refrakt/site-tokens.css` whose `load` hook returns the output of `composeSiteTokensCss(activeSite, configDir)` from {% ref "WORK-239" /%}
- [ ] The integration also injects an import of `virtual:refrakt/site-tokens.css` after the existing theme-package CSS import, ensuring cascade order (theme defaults first, site overrides second)
- [ ] The virtual module is generated once at `astro:config:setup` time (or memoised in `astro:config:done`) — the async preset loading must complete before any page renders
- [ ] A test site under `examples/` or `packages/create-refrakt/template-astro` configured with `theme.tokens.color.text = "#ff0000"` and `theme.presets = ["@refrakt-md/lumina/presets/nord"]` renders body text in red and resolves Nord's token values on `:root` — diff-of-zero against the same config rendered through `@refrakt-md/sveltekit`
- [ ] `site.tints.<name> = { extends: "@refrakt-md/lumina/presets/<preset>" }` produces `[data-tint="<name>"]` scoped CSS in the built bundle (matches the validation in {% ref "WORK-221" /%})
- [ ] Astro `BaseLayout.astro` (or the template integration page) does not need any new author-facing changes — the virtual module side-effect import is enough
- [ ] Documentation page `site/content/docs/adapters/astro.md` notes the new automatic preset / tokens / tints support and links to {% ref "SPEC-048" /%} and {% ref "SPEC-056" /%}

## Approach

Astro integrations expose Vite plugin hooks through the `vite` field of the `updateConfig` object. The integration at `packages/astro/src/integration.ts:33` already returns a `vite` object — extend it with a `plugins` array carrying a small refrakt-internal Vite plugin that:

1. Resolves `virtual:refrakt/site-tokens.css` → `\0virtual:refrakt/site-tokens.css` in `resolveId`
2. Returns the cached CSS string in `load`
3. Computes the CSS once in the plugin's `buildStart` hook by awaiting `composeSiteTokensCss(site, configDir)` (the same hook timing the SvelteKit plugin uses)

The injection point shifts: instead of `injectScript('page-ssr', \`import '${themePackage}';\`)` we want two imports in order:

```ts
injectScript('page-ssr', `import '${themePackage}'; import 'virtual:refrakt/site-tokens.css';`);
```

`injectScript('page-ssr', ...)` runs in the SSR pre-render context, so the CSS import side-effect makes Vite include the resolved virtual module content in the page bundle exactly like a real file import.

**Caching:** the integration receives `site` once from `resolveSite`. The Vite plugin captures `site` + `configDir` in a closure and computes CSS lazily in `buildStart`. Astro restarts the integration on `refrakt.config.json` changes (it's in the watched-file set already), so no manual invalidation path is needed.

**SSR boundary:** `composeSiteTokensCss` does dynamic `import` of preset module paths. The integration must add those preset packages to Vite's `ssr.noExternal` so the loaded modules survive the SSR boundary. The existing `CORE_PACKAGES + themePackage + plugins` list at line 26 does not include preset packages — extend it to include `@refrakt-md/lumina` (already there via `themePackage`) and any modules listed in `site.theme.presets` (if `theme` is the object form). Mirror the SvelteKit plugin's no-external assembly.

## Dependencies

- {% ref "WORK-239" /%} — `composeSiteTokensCss` must be importable from `@refrakt-md/transform/node`

## References

- {% ref "SPEC-058" /%} — adapter parity spec, "Wire site-tokens CSS through each non-SvelteKit adapter"
- `packages/astro/src/integration.ts` — file to modify
- `packages/sveltekit/src/virtual-modules.ts:103–117` — reference for the `virtual:refrakt/tokens` module shape (the SvelteKit plugin combines theme CSS + site-tokens CSS into one virtual module; the Astro adapter doesn't need that level of indirection — separate imports work)
- `packages/sveltekit/src/plugin.ts:93–99` — reference timing for the `buildStart` async compose call

{% /work %}
