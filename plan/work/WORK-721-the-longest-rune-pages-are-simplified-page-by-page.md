{% work id="WORK-721" status="done" priority="low" complexity="complex" source="SPEC-193" tags="docs, runes, simplification" milestone="v0.49.0" pr="refrakt-md/refrakt#794" %}

# The longest rune pages are simplified page by page

SPEC-193's last pass, once the rules above have landed: the pages still too long for their rune
are rewritten to the template, one at a time.

## Acceptance Criteria
- [x] sandbox, snippet, data, xref, expand, drawer, tint, card, bg, mockup, bento, hero, feature, plan-history and backlog are each reviewed against the template and cut to what a content author needs
- [x] Each page's resolution names what moved where, and what was removed

## Blocked by
- {% ref "WORK-713" /%}
- {% ref "WORK-714" /%}
- {% ref "WORK-715" /%}
- {% ref "WORK-716" /%}
- {% ref "WORK-717" /%}

## References
- {% ref "SPEC-193" /%}: D1–D6, the pages most in need of simplification.

## Resolution

Completed: 2026-11-10

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done (lines before → after)
- sandbox 313 → 202: counter, Tailwind and second graph previews folded; "External source files" condensed to one table; source-panel tab claim corrected.
- snippet 312 → 199: presentation, line numbers and highlighting merged; occurrence and until/through essays cut; path rules moved to `extend/plugin-authoring/hosted-builds.md` ("Path rules for file-reading runes").
- data 311 → 206: unbuilt SQLite section, `data-value` detail and inference table removed; template sections merged.
- xref 192 → 112: pipeline hint, URL-encoding essay and duplicate recipes removed; resolution order moved to `docs/authoring/entities.md`; styling hooks moved to `extend/theme-authoring/css.md` ("Styling references"); entity-type table corrected.
- expand 86 → 66: canonical-link CSS detail removed; cycle detection folded in.
- drawer 181 → 132: dialog, inert and progressive-enhancement internals removed; triggers merged.
- tint 173 → 143: template order; three fences became previews.
- bg 145 → 124: task headings; color-mix and merge detail reduced.
- plan-history 76 → 57: internal event-type table removed.
- backlog 81 → 72: light tightening.
- card 201 → 150: "Place the media" explains each media-position value; cover subsections became bullets.
- bento 265 → 195: media and frame merged into one preview; fenced examples removed; noted that bento-cell takes frame.
- feature 236 → 160: three media-position sections merged; header example folded into Basic usage.
- hero 174 → 172: prose tightened, five previews kept; "Animate the backdrop" heading with links updated.
- mockup 130 → 132: task headings; statusBar and color values documented.
- Removed unused `site/examples/tailwind-feature-cards` and `plan-graph-3d`.

### Notes
- No concepts page explains media-position, media-ratio, valign and collapse; a "Media placement" section in `docs/concepts/surfaces.md` would be a better home than card.

{% /work %}
