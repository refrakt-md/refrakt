{% work id="WORK-241" status="ready" priority="high" complexity="moderate" source="SPEC-058" tags="adapters, nuxt, tokens" milestone="v0.14.4" %}

# Wire site-tokens CSS through the Nuxt adapter

Inject the CSS produced by `composeSiteTokensCss(site, configDir)` into pages rendered by `@refrakt-md/nuxt`, so that `theme.tokens`, `theme.modes`, `theme.presets`, and `site.tints` configured in `refrakt.config.json` actually take effect on Nuxt sites. Currently the Nuxt module only adds the theme package + plugins to `nuxt.options.build.transpile` and configures Vue's custom-element handling — it never reads the site-level overrides, so preset / tokens / mode / tint declarations in config are silently ignored.

Nuxt runs on Vite via Nitro, so the same virtual-module pattern from {% ref "WORK-240" /%} applies — only the registration path differs (Nuxt module API instead of Astro integration API).

## Acceptance Criteria

- [ ] `@refrakt-md/nuxt` registers a Vite plugin (via `nuxt.hook('vite:extendConfig', ...)` or by pushing into `nuxt.options.vite.plugins`) that exposes the `virtual:refrakt/site-tokens.css` virtual module and computes the CSS in its `buildStart` hook
- [ ] The module imports the virtual stylesheet so it ships with every page, either by appending to `nuxt.options.css` or by emitting an auto-imported plugin file
- [ ] The cascade order matches SvelteKit: theme package CSS first, site-tokens CSS second
- [ ] A test site under `examples/` or `packages/create-refrakt/template-nuxt` configured with `theme.tokens.color.text = "#ff0000"` and `theme.presets = ["@refrakt-md/lumina/presets/nord"]` renders body text in red and resolves Nord's token values on `:root` — diff-of-zero against the same config rendered through `@refrakt-md/sveltekit`
- [ ] `site.tints.<name> = { extends: "@refrakt-md/lumina/presets/<preset>" }` produces `[data-tint="<name>"]` scoped CSS in the Nitro build output
- [ ] Documentation page `site/content/docs/adapters/nuxt.md` notes the new automatic preset / tokens / tints support and links to {% ref "SPEC-048" /%} and {% ref "SPEC-056" /%}

## Approach

Nuxt modules can register Vite plugins through several paths. The cleanest is to define an inline plugin and append it to `nuxt.options.vite.plugins` during `setup()`:

```ts
nuxt.options.vite = nuxt.options.vite ?? {};
nuxt.options.vite.plugins = nuxt.options.vite.plugins ?? [];
nuxt.options.vite.plugins.push(createSiteTokensVitePlugin(site, configDir));
```

`createSiteTokensVitePlugin` mirrors the Astro adapter's small Vite plugin from {% ref "WORK-240" /%}: a `resolveId` that maps `virtual:refrakt/site-tokens.css` to `\0virtual:refrakt/site-tokens.css`, an async `buildStart` that captures the result of `composeSiteTokensCss(site, configDir)`, and a `load` that returns the captured CSS.

For the CSS import order: Nuxt's `nuxt.options.css` array runs imports in order. The current module setup doesn't push the theme package CSS via `nuxt.options.css` — that path was deferred to user code. Two options:

1. **Push both into `nuxt.options.css`**: `nuxt.options.css.push(themePackage, 'virtual:refrakt/site-tokens.css')`. Cleanest, requires no user changes.
2. **Auto-generate a plugin file** with the two side-effect imports. More indirection but lets us control ordering inside one file.

Option 1 is preferred. Verify with a smoke test that Nuxt's CSS bundler accepts virtual module specifiers in the `css` array — if it doesn't, fall back to option 2.

**Preset package resolution:** matching {% ref "WORK-240" /%}, extend `nuxt.options.build.transpile` to include any preset packages referenced by `site.theme.presets` or `site.tints[].extends`, mirroring the SvelteKit plugin's `noExternal` extension. Without this, Nitro will fail to resolve the dynamic preset imports inside `composeSiteTokensCss`.

## Dependencies

- {% ref "WORK-239" /%} — `composeSiteTokensCss` must be importable from `@refrakt-md/transform/node`
- {% ref "WORK-240" /%} — the small Vite plugin factory should be shared between the Astro and Nuxt integrations; consider extracting it into `@refrakt-md/transform/node` (or a new internal helper) once both wirings exist

## References

- {% ref "SPEC-058" /%} — adapter parity spec
- `packages/nuxt/src/module.ts` — file to modify
- {% ref "WORK-240" /%} — companion item; the Vite plugin factory should be shared

{% /work %}
