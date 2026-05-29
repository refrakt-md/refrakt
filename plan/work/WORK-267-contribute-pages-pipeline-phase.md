{% work id="WORK-267" status="done" priority="high" complexity="complex" source="SPEC-069" tags="pipeline, content, routing" milestone="v0.16.0" %}

# contributePages pipeline phase

Add the `Plugin.contributePages` hook and a contribution phase in the content loader (after file-page registration, before aggregation) that collects `ContributedPage[]` and runs them through the normal pipeline — the underlying primitive both the `entityRoutes` adapter and third-party plugins build on.

## Acceptance Criteria
- [ ] `Plugin.contributePages` interface defined (optional; sync or async; context with registry, projectRoot, site config, pipeline ctx)
- [ ] Contribution phase runs after file-page registration, before aggregation; contributed pages flow through parse + transform + register + aggregate + postProcess identically to file pages
- [ ] `ContributedPage` shape `{ url, title, frontmatter, content }`; output pages carry `source.type === "contributed"` (plugin + ruleIndex)
- [ ] URL collisions: file-backed wins over contributed (with warning); two contributed at one URL fail the build naming both sources
- [ ] Contributed pages appear in sitemap, search index, route enumeration, and nav-auto; resolvable by `{% ref %}`
- [ ] Plugin error in `contributePages` → build warning, build continues with that plugin skipped; empty return is a no-op

## Dependencies
None — core pipeline work; WORK-268 builds the entityRoutes adapter on top.

## References

- {% ref "SPEC-069" /%}

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `packages/types/src/pipeline.ts`: added `Plugin.contributePages` hook (Phase 2.5; sync/async), `ContributedPage` (`{ url, title?, frontmatter?, content, source? }`) and `ContributePagesContext` (`registry`, `projectRoot?`, `siteConfig?`) types; added `'contribute'` to the `PipelineWarning` phase union. Re-exported from the types index.
- `packages/content/src/pipeline.ts`: `runPipeline` gains `RunPipelineOptions` and a contribution phase between register and aggregate — collects contributions from every hookSet, renders each via a loader callback, handles collisions (file-backed wins with a warning; contributed-vs-contributed errors), then runs a **second register pass** over the new pages so their own entities index (one level deep — no recursive contribution). Result/stat assembly switched to the combined `allPages`.
- `packages/content/src/site.ts`: `SitePage.source` (`file | contributed`); a `renderContributed` callback that applies basePath, resolves the layout + tint cascade for the synthetic URL, and runs the same transform (incl. deferBody capture) as a file page; file pages tagged `source.type='file'`; `siteConfig` threaded through to `contributePages`.
- Tests: `packages/content/test/contribute-pages.test.ts` (4) — registry visible to contributePages, contributed page rendered + post-processed + counted, file-wins collision (warn), contributed collision (error), no-op. Full content suite (155) green.

### Notes
- Sitemap/search/nav/`{% ref %}` inclusion is satisfied by construction — contributed pages join the same `pages` array and go through register/aggregate/postProcess indistinguishably from file pages.
- The built-in entityRoutes adapter that uses this is WORK-268.

{% /work %}
