{% work id="WORK-246" status="ready" priority="medium" complexity="simple" source="SPEC-058" tags="adapters, dx, logging" milestone="v0.14.4" %}

# Shared pipeline-stats output across adapters

`@refrakt-md/sveltekit` prints a Phase 1/2/3/4 + warnings summary at the end of its content load (`packages/sveltekit/src/plugin.ts:186–200`):

```
  Phase 1: Parse                 162 pages
  Phase 2: Register              847 entities
  Phase 3: Aggregate             14 packages
  Phase 4: Post-process          162 pages

  ⚠  warn  ... message ... /some/url

  ✓  Build complete (0 errors, 1 warning)
```

Other adapters' content loads either go silent (Astro, Eleventy data file) or rely on the host framework's default output (Nuxt build, Next.js build) — the same `pipelineStats` + `pipelineWarnings` data is already on the `Site` object every adapter receives; it just isn't formatted and printed.

Extracting the formatter into shared infrastructure lets every adapter print the same summary with one function call.

## Acceptance Criteria

- [ ] `@refrakt-md/content` exports `formatPipelineSummary(stats: PipelineStats, warnings: PipelineWarning[]): string` returning the multi-line summary block currently inlined in the SvelteKit plugin
- [ ] `formatPipelineSummary` is pure — takes the data, returns the string. Adapters decide where to write it (`process.stderr`, `console.log`, an Eleventy log helper, etc.)
- [ ] `packages/sveltekit/src/plugin.ts` replaces its inline formatter with `formatPipelineSummary` (zero output diff)
- [ ] `packages/astro/src/integration.ts` calls `formatPipelineSummary` in the Vite plugin's `buildStart` after the content load and writes to `process.stderr`
- [ ] `packages/nuxt/src/module.ts` same — calls the formatter after the Vite plugin's content load
- [ ] `packages/eleventy/src/data.ts` `createDataFile` writes the formatted summary to `process.stderr` after `loadContent` completes
- [ ] `@refrakt-md/next` exposes a helper `printPipelineSummary(site: Site): void` that adapter consumers call from their `app/layout.tsx` or a setup script; templates wire it in
- [ ] `@refrakt-md/html` build helper from {% ref "WORK-242" /%} prints the summary by default; option to disable for embedded use
- [ ] All builds across all five non-SvelteKit adapters produce the same multi-line summary as the SvelteKit reference

## Approach

The current SvelteKit implementation at `packages/sveltekit/src/plugin.ts:186–200` is 15 lines of straight string building. Move it whole into `packages/content/src/pipeline.ts` (or a new `packages/content/src/format.ts`) and re-export from `@refrakt-md/content`.

```ts
// packages/content/src/format.ts
export function formatPipelineSummary(
  stats: PipelineStats,
  warnings: PipelineWarning[],
): string {
  // Lines 186–200 lifted verbatim from sveltekit/src/plugin.ts
}
```

Each adapter then becomes a one-liner:

```ts
// Astro / Nuxt / Eleventy / HTML
import { formatPipelineSummary } from '@refrakt-md/content';
process.stderr.write(formatPipelineSummary(site.pipelineStats, site.pipelineWarnings));
```

For Next.js the helper takes a `Site` directly:

```ts
// packages/next/src/index.ts
export function printPipelineSummary(site: Site): void {
  process.stderr.write(formatPipelineSummary(site.pipelineStats, site.pipelineWarnings));
}
```

**Suppressing during tests:** the formatter is pure (returns a string), so writing to stderr only happens at the adapter call site. Tests that don't want the noise simply don't call the writer.

## Dependencies

Independent — can land any time after `formatPipelineSummary` is exported. Pairs naturally with the per-adapter site-tokens wiring items but doesn't block on them.

## References

- {% ref "SPEC-058" /%} — adapter parity spec (this item moves pipeline-stats output out of "Out of scope")
- `packages/sveltekit/src/plugin.ts:186–200` — current implementation to extract
- `packages/content/src/pipeline.ts` — destination for the shared formatter

{% /work %}
