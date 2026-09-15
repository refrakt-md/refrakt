{% work id="WORK-563" status="ready" priority="high" complexity="moderate" source="SPEC-130" tags="content,pipeline,schema-org,seo" milestone="v0.35.0" %}

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

- [ ] `seo` is recomputed from `enrichedPages` after `runPipeline` returns, inside `loadSite`
- [ ] Contributed pages (`site.ts:441`) are covered by the same recomputation, not left harvesting mid-pipeline
- [ ] `{% breadcrumb auto=true %}` publishes the `BreadcrumbList` it renders, asserted by a page-level test through `runPipeline`
- [ ] `extractOgMeta` is recomputed alongside `jsonLd`, not just the JSON-LD — `postProcess` can inject content that changes the hero / first `h1` / first paragraph / first image it reads
- [ ] The two-point invariant runs in tests: `collectJsonLd` over the pre-engine tree and over the same tree after `createTransform`, asserted equal with object keys normalised and array order significant
- [ ] The invariant runs at both granularities — per-rune fixtures, and page-level through `runPipeline`
- [ ] The output change is visible as a diff against {% ref "WORK-562" /%}'s baseline rather than landing silently
- [ ] A comment at the harvest site records *why* it is after the pipeline and not after the engine, so the next person does not re-derive the N-adapters problem

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

{% /work %}
