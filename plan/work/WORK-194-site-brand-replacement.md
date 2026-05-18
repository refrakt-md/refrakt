{% work id="WORK-194" status="ready" priority="medium" complexity="small" tags="branding, site, header" source="SPEC-050" milestone="v0.14.0" %}

# Replace brand mark on the refrakt site

Swap the existing brand mark on the refrakt documentation site for the new prism SVG. Updates the site header, any logo references in content, social card / og:image references, and the README (where rendered on GitHub). No new design work — purely production of an asset swap.

## Acceptance Criteria

- [ ] Site header renders the new prism mark instead of the old logo. Verified at all three breakpoints (mobile / tablet / desktop)
- [ ] Sidebar (if it has a smaller logo variant) updated to the new mark
- [ ] Repo `README.md` brand image updated to the new mark
- [ ] `site/static/og-image.png` regenerated with the new mark (or whatever path the og:image references in config)
- [ ] `refrakt.config.json` `logo` field still points to a valid asset; update the path if the file location changed
- [ ] Any hand-written CSS or component code that referenced specific logo dimensions / paths updated to the new asset
- [ ] No dangling references to the old logo asset (grep for the filename to confirm clean removal)
- [ ] Visual check: a fresh `cd site && npm run dev` renders the new mark in the header at full quality

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
