{% work id="WORK-715" status="done" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, plan-ids, history, guard, transform" milestone="v0.49.0" pr="refrakt-md/refrakt#783" %}

# Published docs cite no plan entities and carry no release history

SPEC-193 D4. The generated attribute table carries 724 plan IDs from the universal-axis
descriptions; rune pages, user docs, theme pages and extend cite specs and decision numbers a reader
cannot open, and about 26 pages narrate release history.

## Acceptance Criteria
- [x] The facet contract descriptions in `packages/transform` cite no plan entities, and the regenerated `_data/rune-attributes.json` carries none
- [x] Pages under `site/content/runes/`, `docs/` and `themes/` cite no plan entities or decision numbers, except an ID given as sample data
- [x] `extend/` pages cite plan entities only in a closing `Background:` line of links
- [x] History and migration narration (F4) is removed; a deprecated value is stated once, in its attribute's description
- [x] The plan-ID guard covers `site/content/runes/`, `docs/`, `themes/` and `_data/*.json`, and `extend/` outside a closing `Background:` line
- [x] Sample IDs in the plan rune examples follow one convention

## References
- {% ref "SPEC-193" /%}: D4, F3, F4.

## Resolution

Completed: 2026-11-09

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Facet contract descriptions (`packages/transform/src/facets/*`) and `universal-attribute-defs.ts` rewritten without plan IDs; config and theme-token schema descriptions likewise. `_data/rune-attributes.json` and `config-fields.json` regenerated; contracts regenerated (both copies).
- Deprecations stated once in attribute descriptions (showcase aliases, bg overlay, elevation); page hints and history notes removed from showcase, pullquote, bg, surfaces, data, hero.
- Plan citations removed from runes/, docs/ and themes/ prose; extend/ keeps them only in closing `Background:` lines (8 pages). History sections removed from extend (Legacy StructureEntry fields, structure (legacy), deprecated `property` row) and docs (flat-shape history, v0.14/v0.36 notes). Migration guides keep version narration.
- Sample IDs unified to type prefix + 9000 range (RF-142 → WORK-9142, RF-201 → BUG-9201, xref samples).
- Guard: `scripts/docs-plan-ids.test.mjs` over runes/, docs/, themes/, extend/ (minus Background line) and `_data/*.json`.

### Notes
- Live examples that need real entities keep them (expand, drawer, plan-history, the xref preview demo); the guard ignores tag attributes, previews, code, "e.g." and ≥9000.

{% /work %}
