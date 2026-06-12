{% work id="WORK-402" status="done" priority="medium" complexity="simple" source="SPEC-101" tags="docs,showcase,hero,sandbox,cover" milestone="v0.21.0" %}

# Docs — hero cover reference and animated prism background showcase

The capstone of {% ref "SPEC-101" /%}: document hero-cover and ship the animated
prism background as a live, authored example. There is currently **no** docs example
of `media-position="cover"` on hero at all.

## Acceptance Criteria
- [x] The hero reference page gains a **cover** section: a plain image-cover hero (the one-attribute change from a normal hero), then the animated background — `{% sandbox src="prism-scene" /%}` in the hero's media zone under `media-position="cover"`.
- [x] The mechanism note explains the contract stack: cover layout + SPEC-090 posture demotion (inert backdrop) + guest fill — and the motion/perf authoring contract (eager-only, dim-under-scrim, reduced-motion, capped DPR, boot-frame gradient).
- [x] The sandbox reference documents `height="fill"` in the attributes table and prose.
- [x] `media-guests.md` cross-links the pattern from the "Live program" section.
- [x] Pages render correctly in light + dark and at mobile widths; `vite build` green.

## Dependencies
- {% ref "WORK-398" /%} (hero cover host) · {% ref "WORK-399" /%} (guest fill) · {% ref "WORK-401" /%} (the prism scene). {% ref "WORK-400" /%} informs the eager-only guidance.

## References
- {% ref "SPEC-101" /%} §7 · `site/content/runes/sandbox.md`, `site/content/runes/media-guests.md`, the hero reference page

## Resolution

Completed: 2026-06-11

Branch: `claude/spec-101-hero-cover-prism`

### What was done
- `site/content/runes/marketing/hero.md` — new **Cover** section: the image-cover hero (one-attribute switch, media-text-valley backdrop), the **animated background** example (`{% sandbox src="prism-scene" /%}` in a cover hero with `height="lg"`), the mechanism note (cover + posture demotion + auto-fill), the authoring contract for animated backdrops (eager-only, design-dim, reduced-motion, budget caps), and a cover-attributes table; the layout-attributes table now lists `cover`.
- `site/content/runes/sandbox.md` — **Host-owned height — height="fill"** section + attribute-table update.
- `site/content/runes/media-guests.md` — the Live program section cross-links the animated-hero-backdrop pattern.

### Notes
- Site build green (191 pages indexed); the built hero page verified to carry the full cover markup chain (rf-hero--cover, data-cover-scope, posture demotion, data-height="fill", overlay scheme). Light/dark/mobile rendering of the live page wants a browser eyeball, as with every visual showcase.

{% /work %}
