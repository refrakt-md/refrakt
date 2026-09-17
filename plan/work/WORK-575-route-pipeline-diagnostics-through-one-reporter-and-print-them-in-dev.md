{% work id="WORK-575" status="ready" priority="high" complexity="moderate" source="SPEC-135" tags="pipeline, dx, diagnostics, dev-server" %}

# Route pipeline diagnostics through one reporter, and print them in dev

Split from {% ref "WORK-573" /%}, which bundled two independent changes: making
an error-severity diagnostic *fail* something, and making one *visible at all*.
This item is the second, and it has none of the first's
downstream-compatibility argument — which is why WORK-573 itself says to do it
regardless of what is decided about exit codes.

{% ref "WORK-554" /%} measured that a developer running the adapter dev server
sees **no pipeline diagnostics of any severity** — not a muted version, none.
That is the more damaging half of its finding, and it is a reporting gap rather
than a missing pipeline.

## The data already exists in dev

Worth stating precisely, because the fix is smaller than "wire up dev
diagnostics" suggests:

- `packages/sveltekit/src/plugin.ts:171` returns early on `if (!isBuild)`, and
  that guard wraps the whole content-loading block — `loadContent` is called
  once, at `:205`, inside it.
- Dev does not use that path. Content comes from `virtual:refrakt/content` →
  `createRefraktLoader` (`packages/content/src/refract-loader.ts`), which calls
  `loadContent` internally and caches the site; the HMR hook calls
  `invalidateSite()` and the next request re-loads.
- So **`site.pipelineWarnings` is fully populated in dev**, sitting on the
  cached site object, and nothing reads it.

The pipeline does the work of producing diagnostics on every content edit and
throws them away.

## One reporter, not six call sites

{% ref "WORK-573" /%}'s AC 5 asks that the other adapters "either get the same
treatment or the divergence is recorded with a reason" — six places to keep in
sync and six places to drift. {% ref "SPEC-135" /%} D5 takes the other route.

`loadContent` is the single function that dev (via `createRefraktLoader`) and
build (via each adapter's plugin) both go through. A `reporter` option there,
defaulting to stderr, serves every adapter and both modes at once, and makes
divergence unrepresentable rather than policed by a checklist.

It is also the seam {% ref "SPEC-135" /%}'s CLI and MCP surfaces need, so
building it here means phases 2 and 3 of that spec are wiring rather than
plumbing.

## Acceptance Criteria

- [ ] `loadContent` accepts an optional reporter and calls it with the pipeline stats and warnings
- [ ] The default reporter preserves today's behaviour exactly — `formatPipelineSummary` to stderr — so no existing consumer changes
- [ ] Every adapter (sveltekit, eleventy, astro, nuxt, next, html) reports through the reporter rather than calling `formatPipelineSummary` itself
- [ ] A dev session prints its pipeline diagnostics on first content load
- [ ] A dev session prints them again after an HMR reload, reflecting the edited content
- [ ] Dev output is not duplicated when a cached site is reused without re-loading
- [ ] No change to exit codes — that is {% ref "WORK-573" /%}'s decision, and this item must not pre-empt it
- [ ] `site/` and `plan-site/` still build green, with unchanged stderr output

## Approach

1. Add the reporter option to `loadContent`, defaulting to the current stderr
   behaviour. Nothing observable changes.
2. Move each adapter's `process.stderr.write(formatPipelineSummary(…))` onto it.
3. Have the dev path report after each load — either from `createRefraktLoader`
   when it populates its cache, or from the Vite plugin's HMR hook after
   `invalidateSite()`. The loader is the better home: it is where both modes
   converge, and it keeps the sveltekit plugin from being the only adapter with
   dev diagnostics.

**Watch the re-load boundary.** The loader caches the site and only re-loads
after `invalidateSite()`. Reporting on cache *hit* would print the same
diagnostics on every navigation; reporting on cache *fill* prints once per
actual content load, which is the behaviour to want.

## Blocks

- {% ref "WORK-573" /%} — with the reporter seam in place, the exit-code change is one place instead of six

## References

- {% ref "SPEC-135" /%} — D5 (the reporter goes at `loadContent`), and the spec this is phase 1 of
- {% ref "WORK-554" /%} — the measurement: nothing printed in dev, `if (!isBuild)` at `plugin.ts:171`
- {% ref "WORK-573" /%} — the item this was split from; keeps the exit-code half
- `packages/content/src/site.ts` — `loadContent`
- `packages/content/src/refract-loader.ts` — `createRefraktLoader`, the dev path
- `packages/content/src/format.ts` — `formatPipelineSummary`
- `packages/sveltekit/src/plugin.ts` — the `isBuild` guard at `:171`

{% /work %}
