{% work id="WORK-687" status="in-progress" priority="high" complexity="simple" source="SPEC-182" tags="runes, composition, marketing, testimonial, staging, seo" milestone="v0.44.0" %}

# testimonial reads its byline from the paragraph again, and the attribute migration is reversed

The staged `testimonial` reads `**Name** — Role` through WORK-686's paragraph item model, and
keeps `author` and `role` as the alternative form ({% ref "SPEC-182" /%} D6). The content
migration and the codemod that pointed the other way are reversed before v0.44.0 is released
(D7).

## Acceptance Criteria

- [x] `site/staged-runes/testimonial.md` declares the `attribution` field with an item model and `fills: { author: $name, role: $role }`, and still declares `author` and `role`
- [x] Both forms render identically and publish the same `Review` / `Person` / `Rating` graph, asserted against the plugin by the comparison tests
- [x] A comma attribution fills the role without the comma (BUG-019 fixed in the composition), and the comparison test records it as an explained difference
- [x] `site/content` and the two SEO fixtures return to the paragraph form, and `seo:baseline:check` passes without regenerating
- [x] `refrakt marketing migrate-testimonial`, the marketing `./cli-plugin` export and their changeset entries are removed; the plugin keeps `author` / `role` and `parseAttribution`
- [x] The testimonial reference page, the plugin snippet and the editor snippet teach the paragraph form, with `author` / `role` documented as the alternative
- [x] `refrakt validate --site staging` reports nothing that `--site main` does not

## Blocked by

- {% ref "WORK-686" /%}

## References

- {% ref "SPEC-182" /%}: D6, D7.
- {% ref "WORK-668" /%}, {% ref "WORK-685" /%}: what is reversed.
- {% ref "BUG-019" /%}: the comma attribution.

{% /work %}
