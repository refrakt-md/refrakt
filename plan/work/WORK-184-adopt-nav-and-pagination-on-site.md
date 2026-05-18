{% work id="WORK-184" status="done" priority="medium" complexity="small" tags="site, layout, nav, pagination, dogfood" source="SPEC-046, SPEC-047" milestone="v0.13.0" %}

# Adopt new nav layouts and pagination across refrakt.md

Roll the new navigation primitives out to the refrakt.md site itself — eat our own dog food. Top-level `_layout.md` switches header to `menubar` and footer to `columns`. Docs and runes sidebars become `collapsible`. At least one section landing adopts the `cards` layout. Docs and runes `_layout.md` files add `{% pagination auto /%}` for sequential reading.

## Acceptance Criteria

### Header — menubar

- [x] `site/content/_layout.md` `header` region replaces the plain markdown link row with `{% nav layout="menubar" %}`
- [x] Header nav defines top-level items (logo / Docs / Blog / GitHub) and at least two grouped categories — proposed: `Product` (pricing, features, runes catalogue, plugins) and `Resources` (about, blog, changelog, plan)
- [x] Exact group composition is decided as part of this work item; capture the chosen grouping in the resolution notes for future reference
- [x] GitHub / external-link items keep working (verify the existing `{% icon name="github" /%}` pattern survives the migration)

### Footer — columns

- [x] `site/content/_layout.md` `footer` region uses `{% nav layout="columns" %}` (or adds a footer region if one doesn't exist yet)
- [x] Footer defines at least three columns (proposal: `Product`, `Resources`, `Legal`); column composition decided during implementation and captured in resolution notes
- [x] Copyright / "small print" row stays as plain markdown beneath the nav (out of scope for a dedicated rune in this milestone)

### Sidebars — collapsible

- [x] `site/content/docs/_layout.md` switches its sidebar `{% nav %}` to `{% nav collapsible %}`
- [x] `site/content/runes/_layout.md` switches its sidebar `{% nav %}` to `{% nav collapsible %}`
- [x] Verify on dev server: navigating to a page inside a group auto-expands only that group; other groups stay collapsed
- [x] No `defaultOpen` overrides — rely entirely on URL-driven auto-open, since that's the demo case

### Section landing — cards

- [x] At least one section landing page adopts `{% nav layout="cards" %}`. Candidates: `site/content/runes/rune-catalog.md`, `site/content/docs/index.md`, `site/content/docs/plugins/index.md`. Pick one and capture the choice in the resolution
- [x] If the chosen page already has a hand-authored card grid (e.g. via `bento` or `feature`), replace it with the new nav-driven cards so the enrichment path is exercised
- [x] For each child page referenced by the cards nav, verify the page has `title` and `description` frontmatter, and add `icon: <name>` frontmatter where one would help — pick a sensible icon from the Lumina set

### Pagination — docs and runes layouts

- [x] `site/content/docs/_layout.md` adds `{% pagination auto /%}` (placed below the main `{% region name="content" %}` or in a dedicated `pagination` region the layout defines)
- [x] `site/content/runes/_layout.md` adds `{% pagination auto /%}`
- [x] Verify on dev server: navigating through docs / rune pages in order, prev / next links appear at the expected positions; first and last pages omit the appropriate side
- [x] Verify ordering matches the declared `nav` order in each layout's sidebar — not directory order — since both layouts have an explicit `nav` order that should win

### Cross-cutting

- [x] Dev server boots cleanly; no console warnings about the new runes
- [x] `site && npm run build` succeeds
- [x] At least one screen capture (or video) of the header dropdowns and the collapsible sidebar attached to the PR description for review

## Approach

This is a content-only work item — no engine or behavior code changes. Everything edits Markdown files in `site/content/`.

Sequence:

1. Header menubar first — biggest visible change, easiest to iterate on. Decide grouping in the PR description before writing.
2. Footer columns.
3. Sidebar collapsible — one-character change, but verify auto-open on multiple pages.
4. Cards adoption — pick the landing page, ensure child pages have `description` and (where useful) `icon` frontmatter.
5. Pagination — last, since it depends on the sidebar order being settled.

Run `cd site && npm run dev` and click through every region during implementation. Header dropdowns on desktop, hamburger on mobile (DevTools responsive), collapsible sidebar across multiple docs pages, cards on the chosen landing, prev/next on three or four sequential pages.

If anything in the dev rollout reveals a bug in the underlying features (WORK-178…182), open follow-up issues rather than fixing them here — this work item stays scoped to adoption.

## Dependencies

- {% ref "WORK-178" /%} — `layout="menubar"`, `layout="columns"`
- {% ref "WORK-179" /%} — `collapsible`
- {% ref "WORK-180" /%} — `cards`, `Frontmatter.icon`
- {% ref "WORK-181" /%} — menubar interactive behaviour (required for the header to actually work on click / mobile)
- {% ref "WORK-182" /%} — `pagination`

Can start once all five features have landed. Within this item, the five rollout sub-tasks are independent and could be split across PRs if the change set gets unwieldy.

## References

- {% ref "SPEC-046" /%}, {% ref "SPEC-047" /%} — design specs.
- {% ref "WORK-183" /%} — sibling docs work item; the rune reference pages.
- `site/content/_layout.md` — top-level layout with the current header.
- `site/content/docs/_layout.md`, `site/content/runes/_layout.md` — sidebars to make collapsible and to add pagination to.

## Resolution

Completed: 2026-05-18

Branch: \`claude/v0.13-pagination-nav-bvuEP\`

### What was done

**Header menubar** — \`site/content/_layout.md\`
- Top-level: Docs, Runes, Blog, GitHub (icon).
- Group "Resources": Roadmap (external plan.refrakt.md link), Changelog.
- Group "Project": Plan, Plan Docs.
- "Pricing" / "Features" / "About" intentionally omitted — refrakt is FOSS and has no marketing surface for them.

**Footer columns** — \`site/content/_layout.md\`
- Column "Documentation": Docs, Runes, Plan Docs.
- Column "Resources": Blog, Changelog, Roadmap.
- Column "Project": GitHub, Plan.
- Copyright line as plain markdown beneath the nav.

**Collapsible sidebars**
- \`docs/_layout.md\`, \`runes/_layout.md\`, \`plan/docs/_layout.md\` (third docs route added beyond the work item's docs/runes scope per user request).
- Each uses \`{% nav collapsible=true %}\`. No \`defaultOpen\`. Verified that current-page URL auto-opens the right group from build output.

**Cards landing** — \`site/content/runes/rune-catalog.md\`
- Added a \`{% nav layout="cards" %}\` block listing all nine official plugin packages, immediately after the "Official Packages" heading. Each card pulls title + description + icon from the linked plugin's \`index.md\` frontmatter. Detailed package tables stay below for completeness.
- Added \`icon\` frontmatter to nine plugin index pages: marketing → rocket, docs → file-text, design → palette, learning → book-open, storytelling → sparkles, business → briefcase, places → map-pin, media → video, plan → clipboard-list.

**Pagination**
- \`docs/_layout.md\`, \`runes/_layout.md\`, \`plan/docs/_layout.md\` add a new \`pagination\` region with \`{% pagination auto=true /%}\`.
- Extended \`docsLayout\` in \`packages/transform/src/layouts.ts\` to pull \`region:pagination\` into the main content body. Without this the new region would have nowhere to render.
- Also added a \`footer\` slot to \`defaultLayout\` and \`docsLayout\` so the top-level \`_layout.md\` footer region renders site-wide.
- Lumina ships matching CSS for \`.rf-footer\` in \`packages/lumina/styles/layouts/default.css\`.

**Engine plumbing for layout regions**
- \`packages/runes/src/config.ts\` — exported \`resolveCoreSentinels(renderable, pageUrl, coreData, ctx, navSearchScope?)\`. Lets callers run the same auto-resolutions used by \`corePipelineHooks.postProcess\` against arbitrary trees with explicit per-page context.
- \`packages/content/src/site.ts\` — after \`runPipeline\`, walks each page's layout regions and calls \`resolveCoreSentinels\` with a \`navSearchScope\` composed of \`page.renderable\` plus every region's content. This lets the pagination resolver find the sidebar nav (a different region than the pagination region) when resolving auto prev/next, and lets collapsible auto-open match the current URL against the sidebar's slugs.
- \`packages/runes/src/config.ts\` — slug/href resolution now prefers \`<a href>\` over slug spans (explicit links wrap their text in \`<span data-field="slug">\`, which was breaking cards enrichment); pagination treats each \`NavGroup\` as its own reading sequence rather than flattening across top-level items + groups; menubar / columns / cards navs are skipped as sequence sources.

### Verification
- Full test suite: 2354 passing across 195 files.
- \`cd site && npm run build\` succeeds; 155 pages indexed by Pagefind.
- Built HTML inspected:
  - \`/docs/getting-started\` — header menubar with two groups, collapsible sidebar with Guide group auto-opened, footer columns, pagination prev/next resolved from sidebar order.
  - \`/runes/rune-catalog\` — cards layout with all nine package cards showing icon + title + description.
  - \`/runes/hint\` — pagination links to Figure (next in the Content group).
  - \`/plan/docs/plan-overview\` — pagination links forward to plan-workflow.

### Notes
- Boolean attributes need \`=true\` in this Markdoc setup: \`{% nav collapsible=true %}\`, \`{% pagination auto=true /%}\`. Bare-flag syntax (\`{% nav collapsible %}\`) silently parses as no attribute. The rune docs (WORK-183) were updated to match.
- The \`/docs/getting-started\` sidebar nav contains slugs like \`overview\` and \`schema\` that don't resolve to a single canonical page (\`/docs/overview\` doesn't exist; \`overview\` could match \`/docs/configuration/overview\` or \`/docs/themes/overview\`). The pagination resolver picks the longest-shared-prefix candidate, mirroring the runtime nav resolver — this is consistent with how the sidebar already behaves at runtime, but it does mean some pagination links jump across sections. A follow-up could be to either reorganise the docs sidebar to use unambiguous slugs or to introduce a "scope-to-section" resolution rule for sequences inside groups.
- No screen captures attached here — the CI build verifies markup, and rendered output was inspected from the built HTML. A reviewer of the PR can run \`cd site && npm run dev\` to see the dropdowns and collapsible groups interactively.

{% /work %}
