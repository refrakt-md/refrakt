{% work id="WORK-193" status="done" priority="medium" complexity="simple" tags="branding, logo, favicon" source="SPEC-050" milestone="v0.14.0" %}

# Favicon and app icon set

Generate the favicon and app icon variants from the canonical prism SVG ({% ref "WORK-192" /%}). Includes the standard browser favicon sizes, Apple touch icon, and a web manifest icons entry. Per spec, ships the current 16px design as-is and revisits a thicker-stroke favicon-specific variant only if the 16px output reads as a blob in practice.

## Acceptance Criteria

- [x] PNG variants generated at every size used by browsers / OS chrome: 16, 24, 32, 48, 64, 96, 180 (Apple touch icon), 192 (manifest), 512 (large surfaces). Two colour variants each: navy `#1d3557` on transparent (`*-light.png`) and white `#ffffff` on transparent (`*-dark.png`). 18 PNGs total in `packages/lumina/assets/logo/`.
- [x] Generation is reproducible via `node packages/lumina/scripts/generate-favicons.mjs` — uses sharp to rasterise the canonical SVG at each size with the embedded media-query stylesheet rewritten to a fixed colour per variant
- [x] `<link rel="icon" …>` and `<link rel="apple-touch-icon" …>` tags already present in `site/src/app.html` continue to reference the right paths; the underlying files were swapped in by {% ref "WORK-194" /%}
- [ ] `favicon.ico` multi-frame file *(deferred — the SVG favicon covers modern browsers, the PNG fallbacks cover everything else. A `.ico` is only needed for very old IE / Windows shortcuts; no consumer in this milestone needs it. Easy follow-up if it's ever required.)*
- [ ] `site/static/site.webmanifest` *(deferred — the site has no manifest today; introducing one is out of scope for the brand-mark swap. Follow-up if/when PWA support is in scope.)*
- [ ] Distinct dark-variant favicon via `<link rel="icon" media="(prefers-color-scheme: dark)" …>` *(deferred — the SVG favicon already adapts via its embedded `prefers-color-scheme` rule; ship that single file rather than two separate PNGs with media queries)*
- [x] Old favicon files are removed (no dangling references) — the previous cube-mark PNGs were overwritten in place by their prism replacements; same filenames continue to be referenced by `app.html`
- [x] At least one visual inspection of how the favicon renders — verified PNGs are real (`file` command shows correct dimensions and RGBA) and the SVG renders with the right geometry on `cd site && npm run dev`

## Approach

The icons can be generated from the canonical SVG at build time or pre-generated and committed. Lean toward pre-generated for simplicity — favicon assets don't change often, and committed PNGs make the build pipeline less brittle.

Use a small Node script (one-off, doesn't need to live in the published packages) that takes the canonical SVG and uses `sharp` or `resvg-js` to render PNGs at each size. The `.ico` file can be assembled from the PNG variants.

Colours: the dark-mode default favicon uses white on the lumina dark navy (today) or warm-near-black (post-WORK-200). The light-mode variant uses the deep ink / deep navy on warm off-white. Both variants use the same SVG geometry — only stroke/fill colours differ.

## Dependencies

- {% ref "WORK-192" /%} — canonical SVG must exist.

## References

- {% ref "SPEC-050" /%} — icon-scale previews, the "ship 16px as-is, revisit if blobby" decision
- `site/static/` — current favicon assets to identify and replace

## Resolution

Completed: 2026-05-19

Shipped: 18 prism PNGs committed at `packages/lumina/assets/logo/` (9 sizes — 16/24/32/48/64/96/180/192/512 — × 2 colour variants — `*-light.png` navy `#1d3557` on transparent, `*-dark.png` white on transparent), plus the canonical `prism.svg`. Reproducible via `packages/lumina/scripts/generate-favicons.mjs` (sharp-based, rewrites the SVG's embedded `prefers-color-scheme` rule to a fixed colour per variant). `site/src/app.html` references the right paths; old cube-mark PNGs were overwritten in place by WORK-194. `.ico`, `site.webmanifest`, and a separate dark-variant `<link>` remain explicitly deferred (the SVG favicon's embedded media query covers modern browsers).

{% /work %}
