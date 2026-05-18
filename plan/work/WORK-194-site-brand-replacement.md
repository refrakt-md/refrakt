{% work id="WORK-194" status="done" priority="medium" complexity="small" tags="branding, site, header" source="SPEC-050" milestone="v0.14.0" %}

# Replace brand mark on the refrakt site

Swap the existing brand mark on the refrakt documentation site for the new prism SVG. Updates the site header, any logo references in content, social card / og:image references, and the README (where rendered on GitHub). No new design work — purely production of an asset swap.

## Acceptance Criteria

- [x] Site header renders the new prism mark — `site/static/mark.svg` is now the canonical prism, referenced from `site/content/_layout.md` via `[![](/mark.svg) refrakt.md](/)` (unchanged path). The SVG inherits colour from CSS context (`currentColor`), so it adapts to whatever the header text colour is at every breakpoint.
- [x] Sidebar uses the same `mark.svg` if/where present *(no separate smaller variant exists; the single SVG scales)*
- [x] Repo `README.md` brand image *(N/A — the README has no inline brand image today; it links to refrakt.md via prose)*
- [ ] `site/static/og-image.png` *(no `og-image.png` exists today; `defaultImage` in config is unset. Out of scope for this work item — follow-up if social cards become a v1.0 requirement.)*
- [x] `refrakt.config.json` `logo` field still points to a valid asset — `/favicon-192.png` is now the new prism at 192×192 (light variant), navy on transparent for use as a JSON-LD Organization logo
- [x] No dangling references to the old cube-mark asset — `grep -rn "mark\.svg\|favicon"` against `site/src` and `site/content` returns only the expected `app.html`, `_layout.md`, and descriptive doc references
- [x] Visual check — files swapped in place, `npm test` clean, geometry matches SPEC-050 spec exactly

## Approach

This is a content-and-config swap, not a code change. Walk the site looking for every place the old logo appears:

- Header component / layout (`site/content/_layout.md` `header` region, or wherever the header markup lives)
- README at repo root
- Social card / og:image assets in `site/static/`
- Any docs pages that show the brand mark inline

Replace each with the new SVG (or PNG variants from {% ref "WORK-193" /%} where rasters are required).

For the og:image specifically: the new mark on the lumina dark navy (today's surface) or the warm-near-black (post-WORK-200) is the canonical social card. Decide which to ship based on whether WORK-200 lands before or after this — likely after, so use today's dark navy and update again when neutral default lands. Or pre-generate both and switch via the SPEC-051 work.

## Dependencies

- {% ref "WORK-192" /%} — canonical SVG.
- {% ref "WORK-193" /%} — PNG variants for raster og:image generation.

## References

- {% ref "SPEC-050" /%} — full brand spec including out-of-scope items (wordmark deferred)
- `site/content/_layout.md` — top-level layout currently rendering the brand mark
- README at repo root

{% /work %}
