{% work id="WORK-039" status="done" priority="high" complexity="complex" tags="plan, html, architecture" %}

# Refactor plan render pipeline to use `@refrakt-md/html`

The main refactor: replace the bespoke HTML shell template in `@refrakt-md/plan` with calls to `renderFullPage()` from `@refrakt-md/html`. This removes the hand-rolled document structure, inline styles, and direct HTML string concatenation.

## Acceptance Criteria

- [ ] `render-pipeline.ts` calls `renderFullPage()` from `@refrakt-md/html` instead of building HTML strings
- [ ] The bespoke HTML shell template is removed
- [ ] `getLuminaBaseCss()` is removed — `@refrakt-md/lumina` is no longer a dependency
- [ ] `escapeHtml` utility is removed (handled by the HTML adapter)
- [ ] Built-in theme CSS is served at `/__plan-theme.css` (serve) or written to `theme.css` (build)
- [ ] SSE hot reload script is injected via `headExtra` option
- [ ] `planLayout` from WORK-037 is used for structural placement
- [ ] Nav region from WORK-038 is passed as `regions.nav`
- [ ] `plan serve` produces identical visual output as before
- [ ] `plan build` produces identical static output as before
- [ ] `--theme` flag still works for `default`, `minimal`, and custom paths
- [ ] `--base-url` flag still works correctly
- [ ] All existing plan serve/build tests pass

## Approach

1. Add `@refrakt-md/html` as a dependency of `@refrakt-md/plan`
2. Remove `@refrakt-md/lumina` dependency
3. Assemble a minimal `HtmlTheme` with `planLayout`
4. Replace the HTML shell with `renderFullPage()` calls
5. Move theme CSS from inline `<style>` to external stylesheet references
6. Update serve command to serve CSS and behaviors at dedicated routes
7. Update build command to write CSS and behaviors as separate files

## References

- SPEC-014 (Plan Site via HTML Adapter)
- WORK-037 (planLayout definition)
- WORK-038 (nav region builder)

{% /work %}
