{% work id="WORK-563" status="done" priority="high" complexity="moderate" source="SPEC-130" tags="content,pipeline,schema-org,seo" milestone="v0.35.0" pr="refrakt-md/refrakt#607" %}

# Harvest SEO after the pipeline, and assert both harvest points agree

Recompute `seo` from `enrichedPages` once `runPipeline` returns, and add the
two-point invariant that keeps the RDFa and the JSON-LD from drifting apart.

Independent of the schema table — it fixes a live hole on its own and builds the
net every later item lands into.

## The hole

`packages/content/src/site.ts:393` calls `extractSeo` **inside the per-page
loop**. `runPipeline` runs at line 453, and `page.seo` is never recomputed from
the enriched pages. So the harvest point precedes the entire cross-page
pipeline.

`buildAutoBreadcrumb` constructs its renderables in a **`postProcess` hook** —
phase 4. `{% breadcrumb auto=true %}` therefore renders a correct
`BreadcrumbList` in the HTML and contributes **nothing** to `page.seo.jsonLd`.
Nothing tests this; no pipeline test asserts on `seo` at all.

The same blind spot covers every other sentinel resolved in `postProcess` —
collection, pagination, aggregate, drawer — should any of them ever carry
schema.

## Scope

Move the harvest, and only after the *pipeline*. {% ref "SPEC-130" /%} rules out
moving it after the *engine*: there is no post-engine seam to move to. In
SvelteKit the engine runs in the site's own load function
(`site/src/routes/[...slug]/+page.server.ts:29`), three lines from where
`page.seo` is read; Eleventy never calls `createTransform` at all. A post-engine
harvest is not one relocation but N, several of them in user-land site code.
The pre-engine point exists because it is the last framework-agnostic one.

**There are two call sites, not one.** `site.ts:441` harvests contributed pages
inside `renderContributed`, which runs *during* `runPipeline`. Recomputing after
the pipeline has to cover them too, or contributed pages keep the old behaviour
and the fix is half-applied in a way no test would notice.

## Acceptance Criteria

- [x] `seo` is recomputed from `enrichedPages` after `runPipeline` returns, inside `loadSite`
- [x] Contributed pages (`site.ts:441`) are covered by the same recomputation, not left harvesting mid-pipeline
- [x] `{% breadcrumb auto=true %}` publishes the `BreadcrumbList` it renders, asserted by a page-level test through `runPipeline`
- [x] `extractOgMeta` is recomputed alongside `jsonLd`, not just the JSON-LD — `postProcess` can inject content that changes the hero / first `h1` / first paragraph / first image it reads
- [x] The two-point invariant runs in tests: `collectJsonLd` over the pre-engine tree and over the same tree after `createTransform`, asserted equal with object keys normalised and array order significant
- [x] The invariant runs at both granularities — per-rune fixtures, and page-level through `runPipeline`
- [ ] The output change is visible as a diff against {% ref "WORK-562" /%}'s baseline rather than landing silently
- [x] A comment at the harvest site records *why* it is after the pipeline and not after the engine, so the next person does not re-derive the N-adapters problem

## Approach

**The invariant holds today, so the test goes green on day one at rune level.**
Measured across 15 runes spanning core and five plugins: 11 identical, 4
differing in key order only (`recipe`, `howto`, `playlist`, `event` — the engine
relocates their metas to the end of the block, so `collectProperties` meets them
later), zero semantic drift. It is a regression net, not a migration.

At *page* level it currently **fails**, on any page using
`{% breadcrumb auto=true %}` — the post-engine harvest sees a `BreadcrumbList`
the pre-engine one never had. That failure is the bug surfacing itself, and it
goes green with the move. Write the test before the move so this is observed
rather than asserted.

A naive `JSON.stringify` comparison fails the four key-order runes for nothing.
Normalise object keys, keep arrays ordered — a breadcrumb whose items reversed
is a real defect and must still fail.

**What the invariant is not.** `collectJsonLd` is an RDFa subset: no `@about`,
`@resource`, `@vocab`, prefixes or `@rel`. So this proves *our reader* sees the
same graph at both points, not that a conformant processor would. Say so in the
test file. Upgrading to a real distiller over rendered HTML is a later option,
not a prerequisite.

This item is also what makes {% ref "WORK-571" /%}'s D8 decision testable — the
`postProcess` hook calling the applier directly is only worth doing if its
output reaches the JSON-LD, which it does not today.

## Blocked by

- {% ref "WORK-562" /%}

## Blocks

- {% ref "WORK-571" /%}

## References

- {% ref "SPEC-130" /%} — "Harvest at both points, and assert they agree"; the decision against a post-engine move; D8
- `packages/content/src/site.ts:393` — the per-page harvest
- `packages/content/src/site.ts:441` — the contributed-page harvest
- `packages/runes/src/config.ts` — `buildAutoBreadcrumb`

## Resolution

Completed: 2026-09-15

Branch: `claude/v0.35-parallel-feasibility-eia5le`

### What was done

- `packages/content/src/site.ts` — `seo` recomputed from `enrichedPages` once
  `runPipeline` returns. One loop covers both original harvest points, file
  pages and the contributed pages `renderContributed` builds mid-pipeline, so
  the fix cannot land half-applied. `extractSeo` recomputes `og` alongside
  `jsonLd` by construction. A comment records why the harvest sits after the
  *pipeline* and not after the *engine* — there is no post-engine seam, so that
  would be N relocations, several in user-land site code.
- `packages/runes/src/config.ts` — `buildAutoBreadcrumb` now passes the
  `schema:` maps (see below).
- `packages/content/test/seo-harvest.test.ts` — 8 tests, page-level through a
  real `loadContentFromTree` build.

### The harvest move was only half the bug

Moving the harvest made `{% breadcrumb auto=true %}` reach `page.seo` — and the
first assertion still failed, which is what the page-level test was for.

`collectJsonLd` nests a typed node into its parent only when that node carries
**both** `typeof` and `property`, and only a `schema:` entry supplies the
`property`. `buildAutoBreadcrumb` passed `properties:` and **no `schema:` map at
all**, while the explicit `{% breadcrumb %}` form has always passed
`schema: { itemListElement }` plus per-item `{ name, item, position }`. So the
auto path published an *empty* `BreadcrumbList` and a detached, empty `ListItem`
floating beside it — two top-level entities describing nothing — while rendering
a correct trail.

Fixed by giving the auto path the same maps, including the `position` metas it
never emitted. The bar is that an auto trail publishes what the same trail
written by hand would.

### BUG-018, found and deliberately not fixed here

`deriveParentUrl` returns `/docs/` with a trailing slash; the router registers
`/docs` without one. The ancestor lookup misses and the walk stops dead, with a
silent `continue`. Measured through a real build:

| Page | Renders | Should be |
|------|---------|-----------|
| `/about` | `Home > About` | correct |
| `/docs/guide` | `Guide` | `Home > Docs > Guide` |
| `/docs/api/ref` | `Ref` | `Home > Docs > API > Ref` |

Depth 1 works by accident, through `deriveParentUrl`'s `parent <= 0` branch.

No test caught it because the pipeline fixtures feed URLs in a shape the router
does not produce — `url: '/docs/other/'`, `parentUrl: '/docs/'` — under which
the lookup matches. The router's own tests pin the real shape; nothing joined
the two.

Left to {% ref "BUG-018" /%}: it is a rendering defect, it changes HTML on every
site using auto breadcrumbs, and `buildPageTree` takes the same key
(`byUrl.get(p.parentUrl) ?? root`), so `pageTree` may be flat for the same
reason — which would pull in `collection`, `drawer` and auto-pagination. That is
flagged as a suspicion to measure, not a claim. This item's guarantee is
narrower and holds: whatever is rendered is what gets published. The truncated
trail is pinned in a test so BUG-018's fix shows as a diff.

### One criterion left unchecked, honestly

*"The output change is visible as a diff against WORK-562's baseline rather than
landing silently."* **Not satisfiable as written.** That baseline is per-rune
fixtures through `extractSeo`; `breadcrumb auto` only exists after a cross-page
pipeline runs, so no rune fixture can reach it and `npm run seo:baseline:check`
is clean after this change. The page-level assertions in `seo-harvest.test.ts`
are what cover it instead. Extending the baseline to carry page-level cases
would be a real option, but it is a change to WORK-562's artifact shape and
belongs in its own item rather than smuggled in here.

### Notes

- The Phase 1 harvests are kept rather than removed: `SitePage.seo` is
  non-optional, and keeping them means nothing observes an undefined `seo`
  mid-pipeline. Every consumer (`ThemeShell`) reads it after `loadSite` returns,
  so the recomputation is what ships.
- The rune-level half of the two-point invariant already ships in WORK-562's
  baseline test (41/41 agree). This item adds the page-level half, which is the
  granularity that catches the `postProcess` class.
- The invariant proves *our reader* sees the same graph at both points.
  `collectJsonLd` is an RDFa subset — no @about, @resource, @vocab, prefixes or
  @rel — so it is not a claim about a conformant distiller. Said so in the test.

### Verification

`npm test` — 366 files, 4476 tests, all passing. `npm run format:check` clean.
`npm run seo:baseline:check` up to date.

{% /work %}
