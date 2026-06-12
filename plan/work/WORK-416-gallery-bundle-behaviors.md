{% work id="WORK-416" status="done" priority="medium" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="gallery,behaviors,cli,tooling" %}

# Gallery: bundle behaviors so interactive/lifecycle runes render

The WORK-407 gallery renders the static pre-enhancement HTML, so **custom-element /
lifecycle runes render empty**: `diagram` → `<rf-diagram>`, `chart` → `<rf-chart>`,
`nav` → `<rf-nav>`, `sandbox` → `<rf-sandbox>`, `map` → ~nothing. Progressive-enhancement
runes (accordion, details, tabs, …) render their no-JS fallback (all-expanded) rather than
their real state. Including the behaviors client makes the lifecycle runes draw and the PE
runes show their enhanced (representative) state.

## Scope

- Bundle `@refrakt-md/html/client`'s `initPage` to a browser IIFE via esbuild (the same
  pattern `create-refrakt`'s `template-html` already uses) and **inline** it as a `<script>`
  in the gallery, with a minimal `rf-context` JSON script. Self-contained; the generator
  stays browser-free (esbuild bundles; the browser runs it on open / under Playwright).
- **Always-on** (per decision), with a **graceful fallback**: if esbuild or the client can't
  bundle, warn and emit the static gallery (current behaviour) rather than failing.
- Animation/transition stays disabled, so enhanced state renders instantly (stable for
  screenshots).

## Acceptance Criteria

- [x] The gallery inlines a bundled behaviors script (+ `rf-context`); the generator has no browser dependency.
- [x] Bundling failures degrade gracefully to the static gallery with a warning.
- [x] Verified: the bundle is produced and inlined; `<rf-diagram>`/`<rf-chart>`/`<rf-nav>` cells carry the init script. (Visual confirmation that they draw is the WORK-409 harness's job.)

## Implications for {% ref "WORK-409" /%}

Including JS reshapes the harness's determinism: it must **wait for behaviors to settle**
before screenshotting, and **exclude the network-dependent runes** (`map` tiles, `sandbox`
external iframe/CDN) from deterministic baselines (stub or skip). The deterministic
synchronous runes (PE runes, `diagram`, `chart`, `nav`) baseline fine after settle.

## References

- {% ref "SPEC-094" /%} · `packages/cli/src/commands/gallery.ts` · `@refrakt-md/html/client` (`initPage`) · precedent: `create-refrakt` `template-html` esbuild client bundle.

## Resolution

Completed: 2026-06-12

Branch: `claude/work-416-gallery-behaviors` (atop WORK-412).

### What was done
- **`bundleBehaviors()`** in `commands/gallery.ts` — esbuild-bundles a tiny entry that imports `@refrakt-md/html/client`'s `initPage` and runs it on `DOMContentLoaded`, as a minified browser **IIFE** (mirrors `create-refrakt` `template-html`'s client bundle). Returns `undefined` with a warning on failure → graceful static fallback. The generator stays browser-free (esbuild bundles; the browser runs it on open / under Playwright).
- **`renderGalleryDocument`** gained a `behaviorScript` option — inlines the IIFE + a minimal `<script id="rf-context">{"pages":[],"currentUrl":"/"}</script>` before `</body>`.
- **`packages/cli/package.json`** — added `@refrakt-md/html` + `esbuild` deps.

### Impact
- The 86 KB bundle registers the rune web components (`customElements`, `rf-diagram`×31, `registerElements`), so the previously-empty custom-element / lifecycle runes (`diagram`, `chart`, `nav`, `sandbox`, `map`) enhance/render when the gallery is opened or screenshotted, and the PE runes (accordion, tabs, …) show their real enhanced state.
- Output stays **byte-identical across runs** (esbuild is deterministic) — preserved for the harness. Animation/transition stays disabled so enhanced state paints instantly.
- 126 CLI tests green (incl. the 8 gallery tests, unchanged — `behaviorScript` is optional).

### Notes
- Visual confirmation that the lifecycle runes draw is the {% ref "WORK-409" /%} harness's job (it runs a real browser). WORK-409's determinism note updated: wait for settle + exclude network runes (`map`, `sandbox`).
- Always-on per decision; `esbuild`/`@refrakt-md/html` are now CLI deps so it's reliably available, with a graceful static fallback if bundling ever fails.

{% /work %}
