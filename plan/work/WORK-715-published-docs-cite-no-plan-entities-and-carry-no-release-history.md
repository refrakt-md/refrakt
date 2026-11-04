{% work id="WORK-715" status="ready" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, plan-ids, history, guard, transform" milestone="v0.49.0" %}

# Published docs cite no plan entities and carry no release history

SPEC-193 D4. The generated attribute table carries 724 plan IDs from the universal-axis
descriptions; rune pages, user docs, theme pages and extend cite specs and decision numbers a reader
cannot open, and about 26 pages narrate release history.

## Acceptance Criteria
- [ ] The facet contract descriptions in `packages/transform` cite no plan entities, and the regenerated `_data/rune-attributes.json` carries none
- [ ] Pages under `site/content/runes/`, `docs/` and `themes/` cite no plan entities or decision numbers, except an ID given as sample data
- [ ] `extend/` pages cite plan entities only in a closing `Background:` line of links
- [ ] History and migration narration (F4) is removed; a deprecated value is stated once, in its attribute's description
- [ ] The plan-ID guard covers `site/content/runes/`, `docs/`, `themes/` and `_data/*.json`, and `extend/` outside a closing `Background:` line
- [ ] Sample IDs in the plan rune examples follow one convention

## References
- {% ref "SPEC-193" /%}: D4, F3, F4.

{% /work %}
