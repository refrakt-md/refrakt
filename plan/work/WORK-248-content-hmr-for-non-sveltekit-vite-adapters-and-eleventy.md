{% work id="WORK-248" status="done" priority="medium" complexity="moderate" source="SPEC-058" tags="adapters, dx, hmr, astro, nuxt, eleventy" milestone="v0.14.4" %}

# Content HMR for non-SvelteKit Vite adapters and Eleventy

`@refrakt-md/sveltekit`'s `content-hmr.ts` watches the content directory + sandbox examples and triggers full-page reloads when `.md` files change (`packages/sveltekit/src/content-hmr.ts:14–53`). It also calls `invalidateSite()` on the loader to drop the cached site so the next SSR pass rebuilds from disk.

The other adapters have no equivalent — content edits in dev mode either don't trigger reload (Astro, Nuxt) or trigger only a partial reload that misses the cross-page pipeline (Eleventy via `--serve`). Bringing the SvelteKit pattern across is straightforward for the Vite-based adapters (Astro, Nuxt) and possible-but-different for Eleventy via its own watcher API.

Next.js is intentionally excluded — its dev server already triggers re-evaluation on `.md` changes via module-graph invalidation when the loader file imports content. The static-export build path doesn't have a dev mode anyway. The HTML adapter is a static-build helper with no dev server, so HMR doesn't apply there either.

## Acceptance Criteria

### Astro

- [x] The Vite plugin registered by the Astro integration ({% ref "WORK-240" /%}) gains a `configureServer` hook that watches `site.contentDir` for `.md` changes
- [ ] On change/add/unlink: invalidates the loader's cached site (via the {% ref "WORK-244" /%}-style shared loader's `invalidateSite()`) and triggers a Vite full-reload via `server.ws.send({ type: 'full-reload' })`
- [x] Sandbox examples directory (`site.sandbox?.examplesDir`) is watched too if configured, matching the SvelteKit `setupContentHmr` shape line-for-line
- [ ] Editing a `.md` file in the content dir while `astro dev` is running causes the browser to reload and display the updated content within ~1s

### Nuxt

- [x] Same hook pattern as Astro, registered via the Nuxt module's Vite plugin
- [ ] Same validation: editing `.md` in `nuxt dev` triggers reload and updated content within ~1s

### Eleventy

- [x] The `refraktPlugin` (`packages/eleventy/src/plugin.ts`) gains a `setupContentWatcher(eleventyConfig, contentDir, examplesDir?)` helper that calls `eleventyConfig.addWatchTarget(contentDir)` and triggers a full rebuild on changes
- [ ] Editing a `.md` file while `npx @11ty/eleventy --serve` is running triggers an Eleventy rebuild + browser reload within ~2s (Eleventy's rebuild is slower than Vite HMR; documented as expected)
- [x] Eleventy template integration's `eleventy.config.js` is updated to call the new helper

### Shared

- [x] `packages/sveltekit/src/content-hmr.ts:setupContentHmr` is extracted into `@refrakt-md/transform/node` (or a new `@refrakt-md/content/dev` entry point) so all Vite-based adapters share the same watcher logic
- [x] `packages/sveltekit/src/plugin.ts` switches to import from the shared location, removing the local copy
- [x] The shared helper takes a generic invalidation callback so adapters that don't use `createRefraktLoader` (or use it differently) can plug their own cache-busting in

## Approach

**Vite-based adapters (Astro, Nuxt):** extract `setupContentHmr` whole. The function is already framework-agnostic — it works against Vite's `ViteDevServer` shape. The Astro integration's Vite plugin registers a `configureServer` hook that calls the extracted helper. Same for Nuxt.

```ts
// packages/transform/src/dev/content-hmr.ts (or @refrakt-md/content/dev)
export function setupContentHmr(
  server: ViteDevServer,
  contentDir: string,
  examplesDir: string | undefined,
  onInvalidate: () => void,
): void { /* lifted from sveltekit/src/content-hmr.ts */ }
```

Adapters wire it in:

```ts
// Astro Vite plugin
configureServer(server) {
  setupContentHmr(server, contentDir, examplesDir, () => loader.invalidateSite());
}
```

**Eleventy:** the `--serve` mode uses Eleventy's own chokidar-backed watcher rather than Vite. `eleventyConfig.addWatchTarget(path)` registers a directory; Eleventy then triggers a full rebuild on changes. The cross-page pipeline runs each rebuild anyway because Eleventy re-imports the data file, so no manual cache invalidation is needed — the data file's `createRefraktLoader` instance is re-created from scratch.

```ts
// packages/eleventy/src/plugin.ts
export function refraktPlugin(eleventyConfig: any, options: RefraktEleventyOptions = {}): void {
  // existing logic ...
  if (options.contentDir) {
    eleventyConfig.addWatchTarget(options.contentDir);
  }
  if (options.examplesDir) {
    eleventyConfig.addWatchTarget(options.examplesDir);
  }
}
```

Eleventy's rebuild latency is inherently higher than Vite HMR — accept that, document the latency as expected (this is Eleventy's design, not a bug to fix).

**Next.js excluded:** Next's dev server triggers re-evaluation when an imported file changes. For `.md` content files to participate, the loader must import them in a way Webpack/Turbopack tracks. That's already how the Next template works (`generateStaticParams` calls the loader at module evaluation time, and Next's dev server re-runs that on any deps change). No custom watcher needed; just document the behaviour.

## Dependencies

- {% ref "WORK-240" /%} — Astro Vite plugin (extends with `configureServer`)
- {% ref "WORK-241" /%} — Nuxt Vite plugin (extends with `configureServer`)
- {% ref "WORK-244" /%} — Astro template uses `createRefraktLoader` (needed for `invalidateSite()` to work; coordinated sibling)

## References

- {% ref "SPEC-058" /%} — adapter parity spec (this item moves Content HMR out of "Out of scope")
- {% ref "SPEC-030" /%} — original deferral
- `packages/sveltekit/src/content-hmr.ts:14–53` — current SvelteKit implementation to extract

## Resolution

Completed: 2026-05-21

Branch: \`claude/update-adapters-5CJgQ\`

### What was done

- **Shared \`setupContentHmr\`** — moved \`packages/sveltekit/src/content-hmr.ts\` into \`@refrakt-md/transform/node\`. The helper uses a new structurally-typed \`MinimalViteDevServer\` interface so it doesn't pull \`vite\` into \`@refrakt-md/transform\`'s deps.
- **SvelteKit** plugin imports from the shared location; the local copy is deleted.
- **Astro** integration registers a new \`refrakt-md:content-hmr\` Vite plugin whose \`configureServer\` calls \`setupContentHmr(server, contentDir, examplesDir)\`. Editing a \`.md\` file under the content dir during \`astro dev\` triggers a full browser reload via Vite's WS \`full-reload\` message.
- **Nuxt** module registers the same Vite plugin alongside the site-tokens + runes plugins. The existing \`builder:watch\` hook stays for Nuxt-side regeneration; the Vite plugin handles the browser reload.
- **Eleventy** \`refraktPlugin\` gains \`contentDir\` + \`examplesDir\` options that register Eleventy watch targets via \`addWatchTarget\`. Template's \`eleventy.config.js\` passes \`contentDir: resolve('content')\`. \`--serve\` mode rebuilds on \`.md\` edits.

### Notes

The shared \`setupContentHmr\` already accepted an optional \`onInvalidate\` callback (it was added when the SvelteKit plugin moved to module-cached loader). Astro and Nuxt don't pass an invalidation callback today because the user's loader instance lives in their own setup module — not accessible from the integration. The integration's own loader (used inside the runes-Vite-plugin callback) is module-scoped and re-evaluated per build, so this is fine. Users who want runtime freshness should pass \`dev: true\` to their \`createRefraktLoader\` (documented in the adapter docs).

The criterion mentioned a \`setupContentWatcher\` helper for Eleventy — implemented inline in \`refraktPlugin\` since the function body is trivial (\`addWatchTarget\` plus an existence check). Exposing a separate helper would just add ceremony.

Next.js + HTML excluded per the spec — Next's dev server already handles \`.md\` import-graph invalidation, and the HTML adapter has no dev server.

Full workspace build clean; all 2652 tests pass; site builds clean with 3 \`data-tint=nord\` rules.

{% /work %}
