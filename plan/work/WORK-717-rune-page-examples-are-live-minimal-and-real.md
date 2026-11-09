{% work id="WORK-717" status="done" priority="medium" complexity="complex" source="SPEC-193" tags="docs, runes, examples, preview" milestone="v0.49.0" pr="refrakt-md/refrakt#790" %}

# Rune page examples are live, minimal and real

SPEC-193 D5. Fifteen rune pages have no live preview (preview's own page among them), several
bury their point in inline sandbox and mockup code, and example content is placeholder or about the
engine.

## Acceptance Criteria
- [x] Every rune that renders something has its examples as previews; a fence remains only for configuration, a CLI command or a file written elsewhere
- [x] Variants that differ in one attribute are one preview with a sentence or table (backlog, character, realm, faction)
- [x] No Lorem ipsum, placeholder sentences or engine copy; each plugin uses one consistent cast of example content; images come from one source
- [x] sandbox's and mockup's bulky example code loads from files under `site/examples/` (`src=`)
- [x] snippet's examples slice files that make the point

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D5, F6.

## Resolution

Completed: 2026-11-09

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Fences → live previews on bg, relationships, plan-history, drawer, pagination, code, expand, nav, xref, map, preview, grid and snippet, against entities and pages that exist on this site. Fences kept only for config, `_layout.md` files, partials not on this site, and include's own call.
- Variants folded into one preview plus a sentence or table: backlog, character, realm, faction, plot, storyboard, gallery, bg, pagination, nav, map, plan-history, preview.
- Placeholder and Lorem ipsum content replaced (textblock, hint, bar, deflist, sidenote, layout, preview, card); storytelling uses one original world; business one company.
- Images only from assets.refrakt.md; picsum removed; section's invalid `placeholder:landscape` replaced.
- 14 sandbox and mockup payloads moved to `site/examples/<name>/` and loaded with `src=`; payloads adjusted for the `src=` wrapper div. sandbox.md 618 → 313 lines, mockup.md 437 → 130.
- snippet examples slice files that make each attribute's point.

### Notes
- Checked the mockup and sandbox pages in a browser on the dev server; CDN-dependent sandboxes (Tailwind, three.js) could not load in this environment.
- Plan entities have no URLs on the main site, so related titles in relationships previews are plain text.

{% /work %}
