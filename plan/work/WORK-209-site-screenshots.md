{% work id="WORK-209" status="ready" priority="low" complexity="small" tags="docs, screenshots, marketing" source="SPEC-051" milestone="v0.14.0" %}

# Site screenshots refreshed against new appearance

Re-shoot any committed screenshots of refrakt rendering that currently show the cream-and-navy palette. New appearance is neutral chrome + niwaki syntax on most pages. Includes social card assets (og:image), screenshot sections in marketing pages, README inline images, and any docs pages that embed visual examples of "what a refrakt site looks like."

## Acceptance Criteria

- [ ] Inventory of screenshots produced first: grep for committed PNG/JPG/WebP assets and identify which depict rendered refrakt pages
- [ ] Every rendered-page screenshot re-captured against the post-{% ref "WORK-206" /%} site (neutral chrome + niwaki syntax)
- [ ] Social card / og:image regenerated against the new appearance — the file referenced by `site.defaultImage` in config
- [ ] README inline screenshots (if any) updated
- [ ] Marketing pages with screenshot sections updated — the homepage hero shot if there is one
- [ ] No dangling references to deleted screenshot files
- [ ] Screenshots show *both* light and dark mode where applicable — refrakt's docs are auto so visitors will see whichever matches their system

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
