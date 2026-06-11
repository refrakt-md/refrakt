{% work id="WORK-293" status="review" priority="medium" complexity="moderate" source="SPEC-073" tags="html,scaffold,behaviors,client" milestone="v0.20.2" %}

# Ship the client behaviors bundle in the html scaffold

The `@refrakt-md/html` scaffold (`create-refrakt` `template-html`) emits static HTML with **no client JS** — `build.ts` never bundles or references `initPage()` from `@refrakt-md/html/client`. So no interactive behavior runs in a scaffolded html site: tabs, accordion, search, and (since SPEC-073) the theme-toggle button are all inert. The adapter *ships* the client runtime (`@refrakt-md/html/client` + `@refrakt-md/behaviors`); the scaffold just never bundles and includes it.

Discovered while finishing WORK-292: the html adapter now injects the no-flash pre-paint script (which works without JS), but the toggle can't *cycle* until the behaviors bundle loads. This is broader than the toggle — it's the html scaffold's general interactivity gap.

## Acceptance Criteria
- [x] `template-html`'s build produces a client bundle that calls `initPage()` from `@refrakt-md/html/client` (e.g. an esbuild/rollup step over a small entry, output to `build/`).
- [x] `build.ts` references the bundle via `renderFullPage`'s `scripts` option so every page loads it.
- [ ] A scaffolded html site has working interactive runes — verified with at least the theme-toggle (cycles auto→light→dark) and one other behavior (e.g. tabs or search) in a browser.
- [x] Layout chrome CSS (header/search/theme-toggle) is shipped by the scaffold so the controls are styled, not just present.

## Approach
Add a tiny client entry (`import { initPage } from '@refrakt-md/html/client'; initPage();`) and a bundling step to `template-html` (esbuild is lightest), emit to `build/client.js`, and pass `scripts: ['/client.js']` to `renderFullPage`. Confirm the tree-shaken CSS includes the layout chrome stylesheets (or ship the theme barrel) so `.rf-theme-toggle` / `.rf-search-trigger` are styled.

## References
- {% ref "SPEC-073" /%}
- WORK-292 surfaced this gap (plain reference, not a dependency) — the no-flash injection landed there, but interactive cycling needs this bundle.

## Resolution

Completed: 2026-06-11

Branch: `claude/work-293-html-scaffold-client`

### What was done
- `template-html/client.ts` (new): the client entry — `import { initPage } from '@refrakt-md/html/client'; initPage();`.
- `template-html/build.ts`: an esbuild step bundles the entry → `build/client.js` (IIFE, minified, browser target — resolves `@refrakt-md/html/client` + `@refrakt-md/behaviors` into one classic script); `renderFullPage` is given `scripts: ['/client.js']`; and the layout-chrome stylesheets (default / theme-toggle / search / mobile / on-this-page) ship alongside the tree-shaken per-rune blocks (they aren't per-rune blocks, so the usage tree-shaking never included them — leaving the controls unstyled).
- `src/scaffold.ts`: the generated `template-html` package.json gains `esbuild` (devDep) and `@refrakt-md/behaviors` (dep).

### Verification (end-to-end, in-repo)
- Ran `build.ts` against the template's own content: 2 pages + `build/client.js` (83 KB, bundled, valid classic script — no top-level import/export), all five chrome stylesheets emitted under `build/styles/layouts/`, and every page links `/client.js` + `/styles/layouts/theme-toggle.css`. `renderFullPage` emits `#rf-context`, so `initPage` gets its page context.

### Why review, not done
- Criterion 3 (working interactive runes verified **in a browser** — theme-toggle cycles + one other) needs the scaffold smoke test (`create-refrakt` a site, `npm install`, build, serve) against the 0.20.2 packages — not reproducible headlessly here. The bundle is present, valid, and carries the behaviours, and the theme-toggle CSS ships, so it should work; flip to done after the browser pass.

### Discovered (out of scope)
- The shipped `template-html` content has a nav-slug bug: `_layout.md` references `getting-started` but the page is at `/docs/getting-started`, so a fresh scaffold logs 2 build errors. Separate from this item — worth a quick follow-up fix.

{% /work %}
