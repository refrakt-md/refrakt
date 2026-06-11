{% work id="WORK-402" status="ready" priority="medium" complexity="simple" source="SPEC-101" tags="docs,showcase,hero,sandbox,cover" milestone="v0.21.0" %}

# Docs — hero cover reference and animated prism background showcase

The capstone of {% ref "SPEC-101" /%}: document hero-cover and ship the animated
prism background as a live, authored example. There is currently **no** docs example
of `media-position="cover"` on hero at all.

## Acceptance Criteria
- [ ] The hero reference page gains a **cover** section: a plain image-cover hero (the one-attribute change from a normal hero), then the animated background — `{% sandbox src="prism-scene" /%}` in the hero's media zone under `media-position="cover"`.
- [ ] The mechanism note explains the contract stack: cover layout + SPEC-090 posture demotion (inert backdrop) + guest fill — and the motion/perf authoring contract (eager-only, dim-under-scrim, reduced-motion, capped DPR, boot-frame gradient).
- [ ] The sandbox reference documents `height="fill"` in the attributes table and prose.
- [ ] `media-guests.md` cross-links the pattern from the "Live program" section.
- [ ] Pages render correctly in light + dark and at mobile widths; `vite build` green.

## Dependencies
- {% ref "WORK-398" /%} (hero cover host) · {% ref "WORK-399" /%} (guest fill) · {% ref "WORK-401" /%} (the prism scene). {% ref "WORK-400" /%} informs the eager-only guidance.

## References
- {% ref "SPEC-101" /%} §7 · `site/content/runes/sandbox.md`, `site/content/runes/media-guests.md`, the hero reference page

{% /work %}
