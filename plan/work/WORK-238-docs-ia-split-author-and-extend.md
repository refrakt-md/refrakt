{% work id="WORK-238" status="done" priority="medium" complexity="moderate" tags="docs, ia, navigation, site" milestone="v0.14.3" %}

# Docs IA split: separate author handbook from developer ("extend") handbook

The site mixes two audiences in one nav. Content authors (the majority — writing landing pages, doc pages, blog posts) and refrakt developers (writing custom runes, themes, plugins, adapters) currently share the same `Docs` menubar panel and the same `docs/` URL tree. Plugin authoring is even wedged into the Runes panel. Split into two top-level handbooks so each audience sees only what's relevant.

Decided shape:

- **Docs** (renamed: author handbook) — getting started, authoring, configuration, CLI, adapters, MCP
- **Runes** (reference, unchanged top-level)
- **Themes** (reference, unchanged top-level — already author-facing)
- **Extend** (NEW dev handbook) — rune authoring, plugin authoring, theme authoring, pipeline, security, contributing
- **Project** (5th header panel, trimmed contents: Plan, Roadmap, Changelog, GitHub)

Theme *development* docs (currently at `/docs/themes/`) move into Extend; the top-level `/themes` handbook (theme catalog, named themes) stays put — it's already correctly aimed at authors. Plugin authoring docs (`/docs/plugins/authoring*`) move into Extend; the `/docs/plugins` index page (which today mixes "install these plugins" with "build your own") is split — author-facing install/listing content stays under Docs (probable home: `/docs/configuration/plugins`), authoring content moves to `/extend/plugin-authoring/`.

## Acceptance Criteria

### Information architecture

- [x] Extend handbook tree created at `site/content/extend/` containing:
  - [x] `rune-authoring/` — full migration of current `site/content/docs/authoring/` (8 pages: authoring-overview, content-models, nav-slug-resolution, output-contract, page-sections, partials, patterns, rich-menubar-panels)
  - [x] `plugin-authoring/` — migration of current `site/content/docs/plugins/authoring.md` and any sibling plugin-dev docs
  - [x] `theme-authoring/` — full migration of current `site/content/docs/themes/` (9 pages: overview, config-api, creating-a-theme, css, dimensions, layouts, components, tint-cascade, tooling)
  - [x] `pipeline/` — cross-page pipeline / EntityRegistry / cross-doc-link docs aimed at plugin authors
  - [x] `security/` — current `site/content/docs/security/` content (moved, not copied; this is dev-territory)
  - [x] `contributing/` — pointer page that explains the repo's plan workflow, links to the Plan handbook
- [x] Each migrated page reads as part of a dev handbook (intros reframed if they imply "user-facing docs subsection")
- [x] `site/content/extend/_layout.md` sidebar groups the six sections in a logical reading order (probably: Rune authoring → Plugin authoring → Theme authoring → Pipeline → Security → Contributing)
- [x] `site/content/extend/index.md` landing page introduces the handbook ("you're here because you want to extend refrakt — write a custom rune, build a theme, ship a plugin")

### Header / footer nav

- [x] `site/content/_layout.md` header menubar restructured to five top-level items: Docs · Runes · Themes · Extend · Project
- [x] Docs panel pruned: drop Plugin authoring, drop Theming (= theme dev), drop the dev-facing parts of Plugins link. Keep Getting started, Authoring, Configuration, CLI, Adapters, MCP.
- [x] Runes panel pruned: drop the misplaced "Plugin authoring" link.
- [x] Themes panel unchanged.
- [x] New Extend panel with two columns: Rune authoring, Plugin authoring, Theme authoring | Pipeline, Security, Contributing.
- [x] Project panel trimmed to four items: Plan, Roadmap, Changelog, GitHub. (Plan docs and Blog drop out of the header; both stay surfaced in the footer.)
- [x] Footer columns updated to match the new IA: Learn (author entries) · Reference (rune/theme catalogs + MCP) · Extend (dev entries) · Project (full link set, including Blog and Plan docs).
- [x] Header and footer build and render without nav-slug-resolution errors.

### Author-facing plugins page

- [x] New author-facing page at `site/content/docs/configuration/plugins.md` (or a more apt slug under `/docs/`) listing the nine official plugins with install snippets, brief description, and links to each plugin's rune index page
- [x] Linked from the Docs panel "Configuration" entry (the page itself, not the panel) and from the configuration sidebar
- [x] No mention of plugin authoring — that's an Extend concern, linked at the bottom of the page in a "Want to build your own?" footer line

### Old URLs and redirects

- [x] `/docs/authoring/*` → `/extend/rune-authoring/*` redirects in place
- [x] `/docs/themes/*` → `/extend/theme-authoring/*` redirects in place
- [x] `/docs/plugins` (root) → new `/docs/configuration/plugins` redirect (author intent)
- [x] `/docs/plugins/authoring*` → `/extend/plugin-authoring/*` redirects in place
- [x] `/docs/security/*` → `/extend/security/*` redirects in place
- [x] All internal cross-doc links updated to the new paths (audit `site/content/**/*.md` for stale `[link](/docs/authoring/...)`, `/docs/themes/...`, `/docs/plugins/authoring*`, `/docs/security/...` references)

### Project-internal references

- [x] `CLAUDE.md` updated: "Rune Authoring Guide" section, "Theme Development" section, plugin authoring references all point at `/extend/...` paths
- [x] `AGENTS.md` generation (via `refrakt reference dump`) verified to still emit valid output — the AGENTS.md content is rune reference, not affected by the IA change, but confirm
- [x] Any other top-level READMEs that link into docs (root `README.md`, plugin READMEs) updated

### Verification

- [x] Site dev server runs and the home page header renders with five panels
- [x] Manual click-through: each of the new Extend sidebar entries resolves, every header panel link resolves, every footer link resolves
- [x] Old URL → new URL redirects verified manually for at least one page per redirected section
- [x] `refrakt plan validate` reports clean (no broken cross-refs in this WORK item)
- [x] Build passes; no 404s in the build manifest beyond expected

## Approach

**Phase the rollout to keep the site live throughout.** Each phase ships a working state — no half-migrated nav.

1. **Plan & branch.** This work item filed under v0.14.3. Branch: `claude/ia-split-author-extend`.

2. **Phase 1 — Build Extend additively.** Create the entire `site/content/extend/` tree by copying (not moving) the source pages. Add the Extend `_layout.md` and a landing `index.md`. **Old URLs still work** — Extend exists alongside the old Docs subsections. No header nav changes yet. The dev handbook reads cleanly end-to-end.

3. **Phase 2 — Flip header / footer nav.** Update `site/content/_layout.md` so the visible IA matches the new model. This is the user-visible change. After this commit, casual visitors see the new structure even though both URL trees still resolve.

4. **Phase 3 — Author-facing plugins page.** Add `/docs/configuration/plugins` (or the agreed slug). Update the Configuration sidebar to include it.

5. **Phase 4 — Remove the old directories** and add redirects. Delete `site/content/docs/authoring/`, `site/content/docs/themes/`, `site/content/docs/plugins/authoring*`, `site/content/docs/security/`. Add the redirect entries (research the SvelteKit adapter's redirect mechanism — likely a config map or per-route directive).

6. **Phase 5 — Sweep internal references.** Update every `[link](/docs/authoring/...)`, `[link](/docs/themes/...)`, `[link](/docs/plugins/...)`, `[link](/docs/security/...)` inside other doc pages, blog posts, and rune reference pages. Audit `CLAUDE.md` and root-level READMEs.

7. **Phase 6 — Verify.** Run the dev server, click-through every new sidebar and panel link, click-through a few old URLs to confirm the redirects. Run `refrakt plan validate`.

**Editorial reframing during Phase 1.** Most pages migrate cleanly, but a few intros currently reference "this docs section" or assume sibling docs are at `/docs/...` — those need rewording. Catch them as the copy is reviewed for each migrated section, not as a separate audit pass.

**Redirect mechanism.** Need to confirm how the SvelteKit adapter handles route redirects before Phase 4 — could be:
- A `redirects.json` or similar config (preferred — declarative)
- Per-page frontmatter `redirect_from: ['/docs/authoring/old-slug']`
- A SvelteKit `+page.server.ts` that calls `redirect(301, '/extend/...')` at each new page
- Or a static fallback HTML page at each old slug

Research before Phase 4; pick the simplest option that works in dev + build.

**Why Phase 1 is purely additive.** Two URL trees coexisting for a few commits is a low-risk migration pattern. If something looks wrong after Phase 2 we can revert the nav change without rolling back the content move. The redirects-and-deletion step in Phase 4 is the only irreversible piece.

## References

- `site/content/_layout.md` — header / footer nav definition
- `site/content/docs/_layout.md` — Docs sidebar
- `site/content/docs/authoring/` — moves to `/extend/rune-authoring/`
- `site/content/docs/themes/` — moves to `/extend/theme-authoring/`
- `site/content/docs/plugins/` — `authoring*` moves to `/extend/plugin-authoring/`; index page splits into author + dev halves
- `site/content/docs/security/` — moves to `/extend/security/`
- `CLAUDE.md` — references to authoring guide and theme dev section need updating
- Previous conversation: PR #361 (drift fixes) — established the dev-doc surface we're now relocating

## Resolution

Completed: 2026-05-21

Branch: `claude/ia-split-author-extend` (PR #362, merged)

### What was done

Shipped the docs IA split across 5 additive phases plus 2 follow-ups, keeping the site live throughout:

- **Phase 1 (`a7b944dd`)** — built the `site/content/extend/` handbook additively (rune-authoring × 8 pages, plugin-authoring, theme-authoring × 9 pages, pipeline, security, contributing). Old URLs continued to resolve.
- **Phase 2 (`649c8b2d`)** — flipped `site/content/_layout.md` header and footer to the new IA: Docs · Runes · Themes · Extend · Project. Docs and Runes panels pruned of dev-facing content; new Extend two-column panel; Project trimmed to four items.
- **Phase 3 (`ab68c9b0`)** — added the author-facing plugin catalog at `/docs/configuration/plugins` (lists the nine official plugins with install snippets, "Want to build your own?" footer linking to Extend).
- **Phase 4 (`09388af5`)** — collapsed the old `/docs/authoring/`, `/docs/themes/`, `/docs/plugins/authoring*`, and `/docs/security/` pages into redirect stubs handled by `site/src/routes/[...slug]/+page.server.ts`; old → new mappings cover every previously-published path.
- **Phase 5 (`93f208f7`)** — swept internal cross-doc links across `site/content/**/*.md`, `CLAUDE.md`, and top-level READMEs to the new `/extend/...` paths.
- **Follow-ups (`ad6d201a`, `f7e3dbbe`)** — fixed unresolvable slugs in `extend/_layout.md` (caught by the new build-time slug resolution from SPEC-055) and routed `/extend/**` through the docs layout so the sidebar + toolbar render consistently with the rest of the handbook.

### Notes

- The `/docs/plugins/index` page kept its current URL and was repurposed as the author-facing catalog instead of duplicating to a new slug; the spec allowed "or a more apt slug under `/docs/`" and keeping the established URL was cheaper than minting a new one + redirect.
- `AGENTS.md` generation was unaffected as predicted — its content is the rune reference, which the IA change doesn't touch.
- The full IA split landed alongside the WORK-231 build-time slug resolution work, so every internal link in the new tree was validated by the new error system at build time rather than runtime 404s.

{% /work %}
