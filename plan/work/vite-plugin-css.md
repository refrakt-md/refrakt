{% work id="WORK-095" status="ready" priority="high" complexity="simple" tags="vite, css, lumina" milestone="v1.0.0" %}

# Vite plugin — virtual CSS module and tree-shaking

Implement `virtual:refrakt/styles` module that imports theme tokens, per-rune CSS, and package CSS. Supports tree-shaking to include only CSS for runes actually used in content.

## Acceptance Criteria

- [ ] `virtual:refrakt/styles` module resolves and loads CSS in correct order: base tokens → per-rune structural CSS → package rune CSS → user overrides
- [ ] When `injectCSS: true` (default), plugin auto-imports the virtual module
- [ ] When `injectCSS: false`, user imports `virtual:refrakt/styles` manually
- [ ] At build time, CSS tree-shaking includes only CSS for runes found in content (via `analyzeRuneUsage`)
- [ ] `tint.css` is always included (universal attribute)
- [ ] Theme base CSS is always included
- [ ] Community package CSS is included when their runes are used
- [ ] Dev server serves full CSS (no tree-shaking) for fast iteration
- [ ] Test: build with subset of runes, verify only their CSS is included

## Approach

1. Implement `src/virtual-css.ts` — generates CSS import list based on theme config and rune usage
2. Hook into `resolveId` / `load` for `virtual:refrakt/styles` module ID
3. Reuse `analyzeRuneUsage()` from `@refrakt-md/content` for tree-shaking at build time
4. Reference `packages/sveltekit/src/virtual-modules.ts` for the existing `virtual:refrakt/tokens` pattern

## Dependencies

- WORK-094 — core plugin must exist first

## References

- SPEC-031 (CSS Strategy section)
- `packages/sveltekit/src/virtual-modules.ts` — existing virtual module pattern
- `packages/lumina/styles/runes/` — per-rune CSS files

{% /work %}
