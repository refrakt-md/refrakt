{% work id="WORK-268" status="done" priority="high" complexity="complex" source="SPEC-069" tags="content, routing, registry" milestone="v0.16.0" %}

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

## Resolution

Completed: 2026-05-25

Branch: `claude/v0.16.0`

### What was done
- `packages/types/src/theme.ts`: `EntityRoute` interface (`type`, `filter?`, `url`, `title?`, `render?`, `render-template?`, `frontmatter?`) + `SiteConfig.entityRoutes?`; exported `EntityRoute`. Added `ContributedPage.variables?` (per-contribution bound vars).
- `packages/content/src/entity-routes.ts`: `createEntityRoutesHooks(resolvePartial)` → a `contributePages` hook. Per rule: comma-split `type`, optional `filter` via the shared grammar; `{name}` substitution (per-segment-encode for `url`, plain for title/frontmatter); inline `render` or resolved `render-template` partial as content; binds `$item = {id,type,url,data}` via `ContributedPage.variables`; back-fills each matched entity's `sourceUrl` with the generated route (registry holds live objects, pre-aggregate, so xref sees it). `render`+`render-template` together → error; unresolved template → error.
- `packages/content/src/site.ts`: added the `__entity-routes__` hookset (resolves render-template partials via the partials map); `renderContributed` merges `cp.variables` into the page's transform variables so `$item` resolves in `render`.
- Tests: `packages/content/test/entity-routes.test.ts` (7) — substitution + bound `$item`, filter, sourceUrl back-fill, frontmatter substitution, render-template, render/render-template mutual exclusion, no-op.

### Notes
- basePath is applied to `url` by `renderContributed` (loader), per SPEC-069; title falls back to frontmatter/H1 when the rule omits it.
- `siteConfig` is threaded via `loadContentFromTree` options; adapters/loadContent must pass the per-site config (with `entityRoutes`) for routes to generate — wired for the dogfood in WORK-272.

{% /work %}
