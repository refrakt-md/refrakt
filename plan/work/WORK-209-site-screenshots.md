{% work id="WORK-209" status="done" priority="low" complexity="simple" tags="docs, screenshots, marketing" source="SPEC-051" milestone="v0.14.0" %}

# Site screenshots refreshed against new appearance

Re-shoot any committed screenshots of refrakt rendering that currently show the cream-and-navy palette. New appearance is neutral chrome + niwaki syntax on most pages. Includes social card assets (og:image), screenshot sections in marketing pages, README inline images, and any docs pages that embed visual examples of "what a refrakt site looks like."

## Acceptance Criteria

- [x] **Inventory complete** — `grep -rEn '!\[.*\]\(/' site/content README.md` and `find site/static -name "*.png" -o -name "*.jpg" -o -name "*.webp"` together turn up **zero rendered-page screenshots** in the repo. The only image assets are brand-mark PNGs (`favicon-*.png`, `apple-touch-icon.png`) which were already swapped to the new prism mark in {% ref "WORK-194" /%}. The only content-side image reference is `[![](/mark.svg) refrakt.md](/)` in `site/content/_layout.md`, which points to the new prism SVG.
- [x] **No rendered-page screenshots to update** — the site renders content live via SvelteKit; there are no committed PNGs of docs pages, runes in action, or example layouts to replace.
- [x] `og-image.png` / `defaultImage` — not configured in `refrakt.config.json`; site has no social card. Out of scope for this work item; would land with a future "marketing surface" pass.
- [x] README has no inline brand images — `head README.md` shows prose-only intro with text links.
- [x] No dangling references — `grep` for old logo filename returns nothing.
- [x] Closed as effectively no-op for v0.14.0 — the work item was a precaution against a likely-stale screenshot pile, which the inventory shows doesn't exist.

## Approach

This is a content / asset task. The work breaks into two phases:

1. **Inventory.** `find site/static site/content -name "*.png" -o -name "*.jpg" -o -name "*.webp"` and identify which depict refrakt rendering vs. unrelated diagrams. Walk the markdown looking for `![…](…)` references too.

2. **Re-capture.** Build the site (`cd site && npm run build && npm run preview`), then capture each identified surface. Use the same browser / viewport / OS preference each time so the screenshots feel cohesive.

For the og:image, ensure dimensions match the spec (commonly 1200×630). Use the same prism + wordmark composition the current og:image uses; only the palette underneath changes.

Don't bother with pixel-level precision on the screenshots — slight cropping differences are fine. The goal is "no visitor sees a cream-and-navy refrakt rendering after this lands."

## Dependencies

- {% ref "WORK-206" /%} — site must already be rendering with the new appearance, otherwise screenshots would capture the old palette.
- {% ref "WORK-194" /%} — new logo / brand mark in place so screenshots show the right identity.

## References

- {% ref "SPEC-051" /%} — implementation step about re-shooting screenshots
- `site/static/` — likely location of committed image assets

{% /work %}
