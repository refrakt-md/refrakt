{% work id="WORK-293" status="ready" priority="medium" complexity="moderate" source="SPEC-073" tags="html,scaffold,behaviors,client" milestone="v0.16.0" %}

# Ship the client behaviors bundle in the html scaffold

The `@refrakt-md/html` scaffold (`create-refrakt` `template-html`) emits static HTML with **no client JS** — `build.ts` never bundles or references `initPage()` from `@refrakt-md/html/client`. So no interactive behavior runs in a scaffolded html site: tabs, accordion, search, and (since SPEC-073) the theme-toggle button are all inert. The adapter *ships* the client runtime (`@refrakt-md/html/client` + `@refrakt-md/behaviors`); the scaffold just never bundles and includes it.

Discovered while finishing WORK-292: the html adapter now injects the no-flash pre-paint script (which works without JS), but the toggle can't *cycle* until the behaviors bundle loads. This is broader than the toggle — it's the html scaffold's general interactivity gap.

## Acceptance Criteria
- [ ] `template-html`'s build produces a client bundle that calls `initPage()` from `@refrakt-md/html/client` (e.g. an esbuild/rollup step over a small entry, output to `build/`).
- [ ] `build.ts` references the bundle via `renderFullPage`'s `scripts` option so every page loads it.
- [ ] A scaffolded html site has working interactive runes — verified with at least the theme-toggle (cycles auto→light→dark) and one other behavior (e.g. tabs or search) in a browser.
- [ ] Layout chrome CSS (header/search/theme-toggle) is shipped by the scaffold so the controls are styled, not just present.

## Approach
Add a tiny client entry (`import { initPage } from '@refrakt-md/html/client'; initPage();`) and a bundling step to `template-html` (esbuild is lightest), emit to `build/client.js`, and pass `scripts: ['/client.js']` to `renderFullPage`. Confirm the tree-shaken CSS includes the layout chrome stylesheets (or ship the theme barrel) so `.rf-theme-toggle` / `.rf-search-trigger` are styled.

## References
- {% ref "SPEC-073" /%}
- WORK-292 surfaced this gap (plain reference, not a dependency) — the no-flash injection landed there, but interactive cycling needs this bundle.

{% /work %}
