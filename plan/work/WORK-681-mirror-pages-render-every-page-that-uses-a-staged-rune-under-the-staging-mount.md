{% work id="WORK-681" status="ready" priority="high" complexity="complex" source="SPEC-181" tags="runes, composition, staging, content, site, seo" milestone="v0.44.0" %}

# Mirror pages render every page that uses a staged rune under the staging mount

Every page whose source uses a staged rune is rendered a second time, at the same path under
the staging mount, with the staged rune set ({% ref "SPEC-181" /%} D2). This page is what gets
reviewed: open `/runes/marketing/hero` and `/staging/runes/marketing/hero` in two tabs and
switch between them.

## Acceptance Criteria

- [ ] A page whose AST uses a staged rune by name or alias gets a mirror route at `<mount><url>`; a page that uses none gets no mirror
- [ ] The mirror renders the same source and frontmatter through the staged tags and the staged engine, with the layout cascade resolved from the original path, so nav and sidebar match the live page
- [ ] The site route (`site/src/routes/[...slug]/+page.server.ts`) transforms a mirror page and its layout regions with the staged transform, and every other page with the live one
- [ ] Mirror pages are prerendered (in `entries()`) and absent from `sitemap.xml`, `llms.txt`, `llms-full.txt`, the search index and the page tree
- [ ] Mirror pages do not take part in register or aggregate, so no entity is registered twice, and they post-process against the live aggregates
- [ ] A mirror page emits `robots: noindex` and a canonical link to the live page
- [ ] A mirror page shows a banner naming the staged runes it uses, with a link to the live page
- [ ] The mount root is a generated index listing each staged rune, its plugin and its mirror pages
- [ ] With no staged runes, no mirror or mount page exists

## Approach

- Route generation and the draft flag live in `packages/content/src/router.ts` and `site.ts`. A route gains a `staged` field (`{ of: string, runes: string[] }`) that the indexes filter on, the same way they filter `draft`.
- Finding the staged runes a page uses means walking the AST for tag names in the staged set, aliases included.
- Mirrors are generated from the live pages, so they are added after the live routes are built and do not affect live ordering or the page tree.

## Blocked by

- {% ref "WORK-680" /%}

## References

- {% ref "SPEC-181" /%}: D2, D3.

{% /work %}
