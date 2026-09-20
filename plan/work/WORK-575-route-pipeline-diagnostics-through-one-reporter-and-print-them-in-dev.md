{% work id="WORK-575" status="done" priority="high" complexity="moderate" source="SPEC-135" tags="pipeline, dx, diagnostics, dev-server" milestone="v0.36.0" %}

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

- [x] `reporter` is added to `LoadContentFromTreeOptions`, and `loadContent` gains an options-bag overload beside its fourteen-positional form — no fifteenth positional
- [x] The five `loadContent` callers that pass options move onto the bag: sveltekit `plugin.ts:205`, eleventy `data.ts:71`, editor `server.ts:217`, `loader.ts:58`, and `create-refrakt/template-html/build.ts:124`. The sixth — `create-refrakt/template/src/routes/+layout.server.ts:10` — passes *no* options, so there is nothing to convert; it gets a comment recording why it stays silent instead of `{}` added to satisfy a checklist
- [x] The positional `loadContent` still works and is still exported, so no external consumer breaks
- [x] The default reporter preserves today's behaviour exactly — `formatPipelineSummary` to stderr — so no existing consumer changes
- [x] Every current `formatPipelineSummary` caller reports through the reporter instead: sveltekit `plugin.ts:222`, eleventy `data.ts:86`, astro `integration.ts:75`, nuxt `module.ts:70`, next `tokens.ts:86`, and `create-refrakt/template-html/build.ts:130`
- [x] Astro and nuxt do not double-print: both reach content through `createRefraktLoader`, so their own `formatPipelineSummary` calls (and the `summaryPrinted` latches guarding them) are removed in the same commit as the loader gaining its default reporter
- [ ] **Not verified by an end-to-end astro / nuxt build** — this repo contains no astro or nuxt site, and neither package has a test that builds one (`packages/astro/test` is a registry unit test; `packages/nuxt/test` does not exist). What *is* verified: the packages typecheck, the once-per-cache-fill behaviour they now inherit is covered by `packages/content/test/reporter.test.ts`, and no `formatPipelineSummary` call survives outside `stderrReporter`. Closing this properly needs a fixture site per adapter, which is its own item — see the note below
- [x] A dev session prints its pipeline diagnostics on first content load
- [x] A dev session prints them again after an HMR reload, reflecting the edited content
- [x] Dev output is not duplicated when a cached site is reused without re-loading
- [x] No change to exit codes — that is {% ref "WORK-573" /%}'s decision, and this item must not pre-empt it
- [x] `site/` and `plan-site/` still build green, with unchanged stderr output

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

## Follow-up found while doing this

**Four adapters have no buildable site anywhere in the repo.** `site/` and
`plan-site/` exercise sveltekit and nothing else, so astro, nuxt, next and
eleventy changes are verified by typecheck and reasoning only. That is how this
item ends with one criterion honestly unmet, and it is the same shape as
everything else in {% ref "SPEC-135" /%}: the check that would catch a
regression does not exist, so nobody notices it is missing.

It also has teeth for {% ref "WORK-580" /%}: a PR job that builds and validates
still would not have caught an astro double-print. Worth its own item — a
minimal fixture site per adapter, built in CI — rather than widening this one.

**Also observed, pre-existing and out of scope:** a single `site/` build emits
the summary **four** times (client pass, server pass, and the CSS-analysis
load). Confirmed identical on the base commit, so this change neither caused
nor worsened it — but "once per build" is not what it looks like today, and the
reporter seam is the natural place to fix it.

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

## Resolution

Completed: 2026-09-20

Branch: `claude/milestone-v0-36-0-planning-yraw54`

### What was done

- `packages/content/src/format.ts` — added `PipelineReporter` (a
  `(stats, warnings) => void` sink) and `stderrReporter`, the default that
  writes `formatPipelineSummary` to stderr. Receives raw stats and warnings
  rather than a rendered string, so SPEC-135's CLI and MCP surfaces can act on
  individual findings without parsing text (D6).
- `packages/content/src/site.ts` — `reporter` added to
  `LoadContentFromTreeOptions` and `ProcessContentTreeOptions`, invoked once at
  the single return point of `processContentTree` after all four phases. Added
  a `LoadContentOptions` interface and an options-bag overload for
  `loadContent`; the fourteen-positional form is untouched and still exported.
- `packages/content/src/loader.ts` — `createSiteLoader` and
  `createVirtualSiteLoader` default to `stderrReporter` and report on cache
  *fill*, not cache *hit*.
- `packages/content/src/refract-loader.ts` — `reporter` threaded through
  `RefraktLoaderOptions`. This is the dev path.
- Adapters: sveltekit, eleventy, astro, nuxt, next and the HTML scaffold
  template no longer format their own summary. Astro and nuxt also lose the
  `summaryPrinted` latches, which the loader's cache subsumes.
- `packages/content/test/reporter.test.ts` — 10 tests covering the seam, both
  call signatures, and the cache boundary.

### Verified

- Dev server, end to end: first request prints the summary; three further
  navigations print nothing; a `.md` edit prints again; an edit introducing
  `{% definitelynotarealrune %}` prints
  `✗  Build complete (1 error, 35 warnings)` naming `tag-undefined` and its
  line. That is WORK-554's "nothing at all" row closed.
- `site/` and `plan-site/` build green with byte-identical stderr.
- 4,584 tests pass; `format:check` clean.

### Notes

- **SPEC-135 D5b** records the one deviation. D5 said the reporter defaults to
  stderr at `loadContent`; taken literally that makes ~40 tests and both
  scaffold templates start printing, contradicting this item's own "no existing
  consumer changes". The option is where D5 put it; the *default* moved one
  layer out to the loaders, which is where "a site is being built for somebody
  to look at" is actually true. The editor passes no reporter deliberately —
  it re-loads per save to refresh a preview cache.
- **One criterion is left unmet on purpose.** Astro and nuxt are not verified
  by an end-to-end build because this repo has no astro or nuxt site and
  neither package tests one. Recorded in the item as a follow-up: four adapters
  have no buildable site anywhere, which is the same disease SPEC-135 is about.
- Pre-existing and out of scope: one `site/` build emits the summary four
  times. Confirmed identical on the base commit.

{% /work %}
