{% work id="WORK-268" status="pending" priority="high" complexity="complex" source="SPEC-069" tags="content, routing, registry" milestone="v0.16.0" %}

# entityRoutes config-rules adapter

The built-in adapter (in `@refrakt-md/content`) that turns `site.entityRoutes` into contributed pages: selects entities by `type` + `filter`, substitutes placeholders, renders an inline `render` string or a `render-template` partial per entity with `$item` bound, and back-fills `sourceUrl`.

## Acceptance Criteria
- [ ] `SiteConfig.entityRoutes` accepts `{ type, filter?, url, title?, render | render-template, frontmatter? }` (render / render-template mutually exclusive)
- [ ] `type` (comma-separated) + optional `filter` select entities via the shared parser (WORK-261)
- [ ] `{name}` placeholder substitution from top-level + `data` fields; `url` per-segment encoded and site-root-relative (basePath applied, like a path-derived URL)
- [ ] `$item` bound in render / render-template per the pinned contract; one page per matched entity; URL collisions error
- [ ] Optional `title` feeds the page's frontmatter `title` (omitted → falls back to rendered H1); `render-template` resolved via the partial + file-roots machinery
- [ ] Each matched entity's `sourceUrl` is back-filled with the generated route URL before the postProcess xref pass

## Dependencies
- WORK-267 (contributePages phase)
- WORK-261 (shared field-match parser)
- WORK-262 (deferred-body capture, for render templates)

## References

- {% ref "SPEC-069" /%}

{% /work %}
