{% work id="WORK-407" status="ready" priority="high" complexity="complex" source="SPEC-094" milestone="v0.22.0" tags="theme,cli,gallery,tooling,html-adapter" %}

# Gallery generator — rune subject

A CLI command that emits a deterministic static **rune gallery**: every rune across its variant
matrix, on one page, rendered through the HTML adapter. This is the AI-iteration surface and the
deterministic subject the harness ({% ref "WORK-409" /%}) photographs.

## Scope

- A `refrakt gallery` command (inspect/contracts family, `packages/cli`) reusing the inspect pipeline (parse → transform → serialize → identity transform → `renderToHtml`), extended from one rune to the whole catalogue (core `defineRune` entries + plugins from `refrakt.config.json`).
- Variant matrix derived from config / `structures.json`.
- Render via the HTML adapter's `renderPage` into a self-contained static file per mode (light/dark), with the theme's CSS and fonts inlined/linked.
- Determinism: fixed sample content + dates, fonts actually loaded (tactically link Lumina's fonts; the full theme-owned-font system is deferred), animations/caret disabled.
- Emit a stable `data-gallery-cell` anchor per variant for per-rune clipping.

## Acceptance Criteria

- [ ] `refrakt gallery` emits a self-contained static HTML artifact covering every catalogue rune across its variants, per mode.
- [ ] Output is deterministic across runs (fixed content/dates, no animation) and theme-agnostic (driven by config + theme CSS).
- [ ] Each variant carries a stable `data-gallery-cell` anchor.
- [ ] The generator lives in the public CLI with **no browser dependency**.

## References

- {% ref "SPEC-094" /%} · `packages/cli/src/commands/inspect.ts` · `packages/html/src/render.ts` (`renderPage`) · `refrakt contracts` / `structures.json`.

{% /work %}
