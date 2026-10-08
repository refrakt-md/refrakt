{% work id="WORK-635" status="in-progress" priority="medium" complexity="simple" source="SPEC-147" milestone="v0.41.0" tags="composition,storytelling,seo" %}

# `lore` as a composed rune

{% ref "SPEC-147" /%} lists `lore` as the simplest storytelling rune. It has a title, a body, an
`Article` schema row (`title` → `headline`, `category` → `articleSection`) and a registered
entity. It follows the pattern {% ref "WORK-624" /%} and {% ref "WORK-625" /%} set:

- it ships beside the plugin as a fixture definition in
  `packages/content/test/fixtures/composed-storytelling/runes/` (SPEC-147 D1);
- it is compared against the plugin's output, the storytelling registry snapshot and the
  `lore` SEO baseline fixture;
- every difference is explained (D2).

If {% ref "WORK-633" /%} has landed, the definition is loaded through a fixture plugin's
`runeDir` rather than as a string.

## Acceptance Criteria

- [ ] `lore` is defined as a composed rune with its `Article` schema row and its `registers.entity` declaration
- [ ] Its JSON-LD is compared against the `lore` fixture's recorded output in `contracts/seo-baseline/baseline.json`, and every difference is explained (SPEC-147 D2)
- [ ] It registers the same entity, id and data as the plugin's `lore`, asserted against the storytelling registry snapshot
- [ ] The rendered tree is compared with the plugin's and every difference is recorded in the resolution
- [ ] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

{% /work %}
