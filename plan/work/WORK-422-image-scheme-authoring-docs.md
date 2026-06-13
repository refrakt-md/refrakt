{% work id="WORK-422" status="done" priority="low" complexity="simple" source="SPEC-106" milestone="v0.22.0" tags="image,docs,authoring" %}

# Image-scheme authoring docs

Document the image-src scheme sugar for content authors, and the data:svg caveat.

## Acceptance Criteria

- [x] Authoring docs cover `![alt](icon:<name>)` and `![alt](placeholder:<shape>)` — available schemes, the shape list, and accessibility (`alt`).
- [x] A note documents that raw `data:image/svg+xml` srcs are rejected by the parser (markdown-it `validateLink`) — use `placeholder:`/`icon:` or a non-SVG image.

## Dependencies

- Requires {% ref "WORK-419" /%} + {% ref "WORK-420" /%} (the schemes to document).

## References

- {% ref "SPEC-106" /%} · `site/content/extend/` authoring docs.

## Resolution

Completed: 2026-06-13

Branch: `claude/spec-106-image-src-schemes`

### What was done
- Added `site/content/runes/image-schemes.md` — a content-authoring guide covering both schemes: the `placeholder:<shape>` table of shapes (with aspects + use), determinism/theme-awareness, the `icon:<name>` inline shorthand (cross-linked to the icon rune), accessibility (`alt` → label; empty alt → decorative), and a "note on `data:image/svg+xml`" explaining the parser rejection and the supported alternatives.
- Added an "Inline shorthand (`icon:`)" section to `site/content/runes/icon.md` with a rendered `{% preview %}` example, linking to the new page.
- Registered `image-schemes` in the runes nav (`site/content/runes/_layout.md`, Content group).

### Notes
- Doc examples use icons that exist in Lumina's set (`star`, `mail`, `book-open`) — `github` isn't in the curated ~80, which would have triggered the unknown-name fallback in the live preview.

{% /work %}
