{% work id="WORK-704" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, marketing, testimonial, go-live, seo" milestone="v0.48.0" %}

# The composed testimonial goes live in the marketing plugin

The staged testimonial has been approved on staging.refrakt.md. Its final form places a featured
quotation ({% ref "WORK-700" /%}), so it goes live after that lands, on the path
{% ref "WORK-702" /%} opens.

## Gates (SPEC-181 rollout)

1. and 2. Reviewed, differences fixed or accepted: {% ref "WORK-691" /%}, then approved after WORK-700.
3. `author` / `role` attributes accepted by the plugin since v0.44.0, and the codemod applied to this
   repository ({% ref "WORK-685" /%}).
4. It places `pullquote`, so it depends on {% ref "SPEC-185" /%}, which is `accepted`.

## Acceptance Criteria
- [ ] `testimonial.md` moves from `site/staged-runes/` into the marketing `runeDir` unchanged, and the `staging` site's `runes.prefer` entry for `testimonial` is removed
- [ ] The plugin testimonial's schema, theme config entry and `testimonial.css` are removed, and the CSS coverage sets are updated
- [ ] The `Review` / `Person` / `Rating` graph is unchanged by the SEO baseline comparison, and both copies of `contracts/structures.json` are regenerated
- [ ] The `review` alias still resolves
- [ ] The testimonial reference page describes the rune as a composition, and drops the note that the paragraph byline "still works for now" if the composition reports it
- [ ] A breaking changeset and a migration note list what authors and themes lose (`rf-testimonial*` classes) and what changed

## Blocked by
- {% ref "WORK-700" /%}
- {% ref "WORK-702" /%}

## References
- {% ref "SPEC-181" /%}: the rollout gates and D5.
- {% ref "SPEC-182" /%}: the byline reinterpretation.
- {% ref "SPEC-185" /%}: D7, the featured quotation.

{% /work %}
