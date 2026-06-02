{% work id="WORK-329" status="ready" priority="high" complexity="moderate" source="SPEC-082" tags="runes,seo,schema-org,jsonld,data-channel,fields,cleanup" milestone="v0.18.0" %}

# Untangle schema.org SEO metas from the data channel

Resolves SPEC-082 problem #4 (SEO double-booking) — the blocker for `WORK-323`.
Some property metas are **conflated**: they carry both `data-field` (data, now
in the bag via `WORK-321` / `WORK-322` / `WORK-328`) **and** `property=` from
the `schema` map (e.g. recipe's `prepTime` / `cookTime` / `servings`). Split the
two so the data channel (bag) and the schema.org channel (`property=` metas) are
independent — only then can `WORK-323` drop the data metas and remove the kebab
set + meta-strip filter.

## The interaction (for the implementer)

- `extractSeo` (`packages/content/src/site.ts`) runs on the **pre-engine**
  renderable; `collectJsonLd` → `walkForTypeof` → `collectProperties` reads
  `property=` under each `typeof` entity. So conflated metas feed JSON-LD.
- The engine's step-7 strips `<meta data-field>` whose `data-field` matches a
  modifier — which is why the conflated SEO metas are **absent from rendered
  HTML** but **present pre-engine** for JSON-LD.
- Pure-SEO metas (`property=`, no `data-field` — e.g. testimonial's
  `ratingValue`) already survive into rendered HTML today.

## Acceptance Criteria

- [ ] A meta is **either** a data carrier (→ bag, dropped from output) **or** an
  SEO carrier (`property=`, no `data-field`) — never both. `createComponentRenderable`
  emits the schema.org `property=` independently of the `properties` data
  channel.
- [ ] **JSON-LD parity** — `extractSeo` collects the same `property=` values it
  does today (verified on recipe + at least one other schema-rich rune, e.g.
  `symbol` / `event`).
- [ ] **SEO metas' HTML presence is decided + documented** — either kept out of
  rendered HTML to match today (via a signal other than `data-field`) or allowed
  inline as RDFa (an intentional, documented output change). See Approach.
- [ ] No `data-field` remains on SEO-only metas; the data role lives entirely in
  the bag.
- [ ] Tests: JSON-LD parity for the schema-rich runes; HTML output reflects the
  chosen SEO presence.

## Approach

A meta currently in both `properties` + `schema` should keep its value in the
bag (already there) and expose its schema.org `property=` without `data-field`
— ideally on the content element where the value already lives, or as a
dedicated SEO meta. The crux is the **HTML-presence decision**: today the
conflated metas are stripped from HTML (by `data-field` match); once `data-field`
is gone, step-7 no longer catches them. Resolve with the maintainer during
implementation — match-today (keep out of HTML) vs allow-inline-RDFa.

## Dependencies

- {% ref "WORK-328" /%} — every data reader (engine + pipelines) must be on the
  bag before the metas' data role is removed.

## References

- {% ref "SPEC-082" /%} — typed node data channel (problem #4).

{% /work %}
