{% work id="WORK-193" status="ready" priority="medium" complexity="small" tags="branding, logo, favicon" source="SPEC-050" milestone="v0.14.0" %}

# Favicon and app icon set

Generate the favicon and app icon variants from the canonical prism SVG ({% ref "WORK-192" /%}). Includes the standard browser favicon sizes, Apple touch icon, and a web manifest icons entry. Per spec, ships the current 16px design as-is and revisits a thicker-stroke favicon-specific variant only if the 16px output reads as a blob in practice.

## Acceptance Criteria

- [ ] `favicon.ico` generated (with at least 16, 32, 48 px frames) at `site/static/favicon.ico`
- [ ] `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-96x96.png`, `favicon-192x192.png`, `favicon-512x512.png` generated
- [ ] `apple-touch-icon.png` at 180×180 generated
- [ ] `<link rel="icon" …>` and `<link rel="apple-touch-icon" …>` tags emitted in the site `<head>` referencing the generated files
- [ ] `site/static/site.webmanifest` (or equivalent) updated with the new icon set
- [ ] Light-mode and dark-mode favicons: ship the dark-on-light variant by default; use a `<link rel="icon" media="(prefers-color-scheme: dark)" …>` for a light-on-dark variant
- [ ] Old favicon files are removed (no dangling references)
- [ ] At least one visual inspection of how the favicon renders in the OS chrome / browser tab — accept "current 16px design as-is" per author's decision in spec; flag for follow-up only if it reads as a blob in practice

## Approach

The icons can be generated from the canonical SVG at build time or pre-generated and committed. Lean toward pre-generated for simplicity — favicon assets don't change often, and committed PNGs make the build pipeline less brittle.

Use a small Node script (one-off, doesn't need to live in the published packages) that takes the canonical SVG and uses `sharp` or `resvg-js` to render PNGs at each size. The `.ico` file can be assembled from the PNG variants.

Colours: the dark-mode default favicon uses white on the lumina dark navy (today) or warm-near-black (post-WORK-200). The light-mode variant uses the deep ink / deep navy on warm off-white. Both variants use the same SVG geometry — only stroke/fill colours differ.

## Dependencies

- {% ref "WORK-192" /%} — canonical SVG must exist.

## References

- {% ref "SPEC-050" /%} — icon-scale previews, the "ship 16px as-is, revisit if blobby" decision
- `site/static/` — current favicon assets to identify and replace

{% /work %}
