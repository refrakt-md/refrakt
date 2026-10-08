{% work id="WORK-629" status="draft" priority="low" complexity="simple" source="SPEC-145" tags="seo,schema,validation,ci" %}

# Check the SEO baseline's types and properties against schema.org in CI

{% ref "WORK-628" /%} ran `@adobe/structured-data-validator` over
`contracts/seo-baseline/`. Its rich-result layer was mostly noise for refrakt. Its schema.org
layer was the opposite: zero false positives. It checks that a type exists and that every
property is in that type's domain. Over the baseline's history it caught the `NonProfit` type
and the nested `Offer.offers` over-match. On today's baseline it caught three defects nobody
had recorded ({% ref "BUG-033" /%}), on rows whose comments say nothing checks them.

SPEC-145 D25 keeps the ban on user `schema` because this check is too narrow to stand in
for a reviewer. It is still a cheap net under the reviewer for first-party rows. This item
adds it to CI as a maintainer-side check. Nothing ships to users.

## Acceptance Criteria
- [ ] CI fails when any `jsonLd` entity in `contracts/seo-baseline/baseline.json` has a type schema.org does not define, or a property outside its type's domain
- [ ] Google rich-result requirements are not part of the gate (they report eligibility, not correctness, and fire on every Product/Recipe/Review row)
- [ ] The schema.org vocabulary is pinned by release version and sha256, fetched from `schemaorg/schemaorg`'s `data/releases/<version>/` directory and cached, with the bump procedure documented beside the pin
- [ ] The check is not a dependency of any published package (root devDependency or a self-contained script)
- [ ] BUG-033 is fixed first, or its rows are listed as known exceptions that the check names

## Approach

Promote `scripts/sd-validator-spike.mjs`, keeping only the `errorType === 'schemaOrg'`
findings. Wire it next to `seo:baseline:check`. Alternatively, reimplement the ~100 lines of
the type and domain check over the pinned vocabulary and drop the library. That choice is
this item's to make. The library's process-wide vocabulary cache (`SchemaOrgValidator.schemaCache`
is static, so the first vocabulary loaded wins) does not matter in a one-shot CI script.

## References

- {% ref "SPEC-145" /%} D25 (the spike's findings)
- {% ref "SPEC-130" /%} D5

{% /work %}
