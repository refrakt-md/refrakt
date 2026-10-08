{% work id="WORK-625" status="ready" priority="high" complexity="complex" source="SPEC-145,SPEC-147" milestone="v0.40.0" tags="composition,storytelling,seo,spike" %}

# Slice 2 — `character` as a composed rune, against the SEO baseline

{% ref "SPEC-145" /%}'s full worked example and its spike criterion. It is the first
composed rune with a `schema` row: `Person`, which a first-party definition may declare
under D25. It is also the first that uses `sections` with `each` and `$each.heading`, and
a preamble with an image slot.

`character` is the case {% ref "WORK-617" /%} was cancelled for. Its transform failed
SPEC-143's D4 family test, so it is replaced rather than declared. The composed
version drops the `character-section` child rune entirely.

Like {% ref "WORK-624" /%}, it ships beside the plugin ({% ref "SPEC-147" /%} D1). The
reference is the storytelling `character` fixture in `contracts/seo-baseline/`. The gate
is that every difference from it is explained, not that there are none (SPEC-147 D2).
Two differences are already decided:

- body content written alongside sections renders, where the plugin drops it;
- the `data-field="section"` stamp is gone.

Both come from SPEC-147 D6.

If the spike shows a decision in SPEC-145 does not hold, record it in the spec rather than
working around it here.

## Blocked by

- {% ref "WORK-624" /%}

## Acceptance Criteria

- [ ] `character` is defined as a composed rune with a `Person` schema row, a `sections` slot placed with `each`, and the portrait and description preamble slots
- [ ] Its JSON-LD is compared against the `character` fixture's recorded output in `contracts/seo-baseline/baseline.json`, and every difference is explained in writing (SPEC-147 D2)
- [ ] One storytelling rune is reimplemented as a composed rune in a spike, and the emitted tree is compared against today's — not necessarily identical, but every difference explained
- [ ] A composed rune's content-derived `properties` resolve — with `image: portrait` added to the row, the `image` from a slot-placed portrait reaches the entity, asserted against the graph and not just the attributes; the added property is an explained difference from the baseline (D10)
- [ ] A composed `character` with both sections and other body content renders that content, and the plugin's discarding of it is recorded as an explained difference (SPEC-147 Finding 6, D6)
- [ ] The composed `character` emits no `data-field="section"` on its sections (SPEC-147 D6)
- [ ] The composed `character` registers the same entity, id, data and aliases as the plugin's, asserted against the storytelling registry snapshot
- [ ] `plugins/storytelling/` is unchanged and still passing its own tests (SPEC-147 D1)

{% /work %}
