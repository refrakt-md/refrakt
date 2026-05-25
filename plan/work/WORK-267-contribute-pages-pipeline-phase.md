{% work id="WORK-267" status="ready" priority="high" complexity="complex" source="SPEC-069" tags="pipeline, content, routing" milestone="v0.16.0" %}

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

{% /work %}
