{% work id="WORK-713" status="ready" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, runes, simplification" milestone="v0.49.0" %}

# Output and implementation sections leave the rune pages

SPEC-193 D2. Fifteen rune pages carry an Output contract (HTML dumps, BEM classes, `data-*`
attributes), and about 40 explain CSS, custom properties or pipeline internals to content authors.
`refrakt inspect` and the structure contract state the structure, generated.

## Acceptance Criteria
- [ ] The Output contract / Output / Output structure sections are removed from actions, aggregate, badge, bar, card, code, collection, deflist, expand, file-ref, link, progress, relationships, snippet and plan/plan-history
- [ ] backlog, decision-log and plan-activity keep their "Output structure" prose as "What it shows", without theming detail
- [ ] CSS, custom-property, engine and pipeline sections (F1) are removed from rune pages, or moved to the theme- or rune-authoring handbook where worth keeping there, each move named in the resolution
- [ ] Adapter "Theme Integration" sections move to `extend/`; the maintainer sections ("Keeping this page honest", "Local-development reference") are removed
- [ ] Example content about the engine (feature, plan/work, plan/spec, plan/milestone) is replaced with real content
- [ ] No page links to a removed section

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D2, F1.

{% /work %}
