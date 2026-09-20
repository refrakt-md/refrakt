{% work id="WORK-575" status="ready" priority="high" complexity="moderate" source="SPEC-135" tags="pipeline, dx, diagnostics, dev-server" milestone="v0.36.0" %}

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

- [ ] `reporter` is added to `LoadContentFromTreeOptions`, and `loadContent` gains an options-bag overload beside its fourteen-positional form — no fifteenth positional
- [ ] All six `loadContent` callers move onto the options-bag form: sveltekit `plugin.ts:205`, eleventy `data.ts:71`, editor `server.ts:217`, `loader.ts:58`, and the two scaffold templates — `create-refrakt/template-html/build.ts:124` and `create-refrakt/template/src/routes/+layout.server.ts:10`
- [ ] The positional `loadContent` still works and is still exported, so no external consumer breaks
- [ ] The default reporter preserves today's behaviour exactly — `formatPipelineSummary` to stderr — so no existing consumer changes
- [ ] Every current `formatPipelineSummary` caller reports through the reporter instead: sveltekit `plugin.ts:222`, eleventy `data.ts:86`, astro `integration.ts:75`, nuxt `module.ts:70`, next `tokens.ts:86`, and `create-refrakt/template-html/build.ts:130`
- [ ] Astro and nuxt do not double-print: they reach content through `createRefraktLoader`, so if the loader reports, their own `formatPipelineSummary` calls must be removed in the same commit — verified by building a site under each
- [ ] A dev session prints its pipeline diagnostics on first content load
- [ ] A dev session prints them again after an HMR reload, reflecting the edited content
- [ ] Dev output is not duplicated when a cached site is reused without re-loading
- [ ] No change to exit codes — that is {% ref "WORK-573" /%}'s decision, and this item must not pre-empt it
- [ ] `site/` and `plan-site/` still build green, with unchanged stderr output

## Approach

1. Add `reporter` to `LoadContentFromTreeOptions` and an options-bag overload to
   `loadContent`, defaulting to the current stderr behaviour. Nothing observable
   changes. **Not a fifteenth positional** — the signature is already at
   fourteen, and the bag exists one function over precisely because of that.
   Whether 1.0 keeps this shape is {% ref "WORK-576" /%}.
2. Move each adapter's `process.stderr.write(formatPipelineSummary(…))` onto it,
   migrating the four callers to the bag as you go.
3. Have the dev path report after each load — either from `createRefraktLoader`
   when it populates its cache, or from the Vite plugin's HMR hook after
   `invalidateSite()`. The loader is the better home: it is where both modes
   converge, and it keeps the sveltekit plugin from being the only adapter with
   dev diagnostics.

**Watch the re-load boundary.** The loader caches the site and only re-loads
after `invalidateSite()`. Reporting on cache *hit* would print the same
diagnostics on every navigation; reporting on cache *fill* prints once per
actual content load, which is the behaviour to want.

**Two call graphs, not one — and putting the reporter in the loader creates a
double-print before it fixes anything.** The six adapters do not all reach
content the same way:

| Adapter | Reaches content via | Prints today |
|---|---|---|
| sveltekit | `loadContent` directly (`plugin.ts:205`) | `plugin.ts:222` |
| eleventy | `loadContent` directly (`data.ts:71`) | `data.ts:86` |
| editor | `loadContent` directly (`server.ts:217`) | — |
| **astro** | **`createRefraktLoader`** (`integration.ts:60`) | `integration.ts:75` |
| **nuxt** | **`createRefraktLoader`** (`module.ts:55`) | `module.ts:70` |
| next | — | `tokens.ts:86` |
| html template | `loadContent` directly (`build.ts:124`) | `build.ts:130` |

Astro and nuxt already go through the loader. So step 3's "have the loader
report after each load" makes them print **twice** — once from the loader, once
from their own call — until those calls are deleted. Delete them in the same
commit, and build a site under each to confirm; a duplicated summary is the kind
of regression that reads as cosmetic and gets shipped.

Note also that `packages/html` is not one of the printers despite AC 5's
original wording — the html summary lives in the **scaffold template**
(`create-refrakt/template-html/build.ts`), which is copied into user projects.
Both scaffold templates call `loadContent`, which is why the caller count is six
rather than four.

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
