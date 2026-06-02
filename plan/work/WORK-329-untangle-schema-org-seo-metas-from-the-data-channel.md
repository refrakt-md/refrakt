{% work id="WORK-329" status="in-progress" priority="high" complexity="moderate" source="SPEC-082" tags="runes,seo,schema-org,jsonld,data-channel,fields,cleanup" milestone="v0.18.0" %}

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

- [ ] A meta is **either** a data carrier (→ bag) **or** an SEO carrier
  (`property=`, no `data-field`) — never both. `createComponentRenderable` no
  longer stamps `data-field` on a meta that also carries `property=` (the schema
  channel); the data value still lands in the bag.
- [ ] **JSON-LD parity** — `extractSeo` collects the same non-empty `property=`
  values it does today (verified on recipe + at least one other schema-rich
  rune, e.g. `event` / `organization`).
- [ ] **DECIDED — Option B (inline RDFa).** The now-pure-SEO metas render inline
  in the HTML (e.g. `<meta property="prepTime">` inside `typeof="Recipe"`),
  consistent with the content-element RDFa and `ratingValue` metas already
  inline. No strip mechanism; this unblocks `WORK-323` removing the kebab set +
  meta-strip. Invisible markup change across the schema-rich runes.
- [ ] **DECIDED — skip empties.** No `<meta property="x" content="">` for unset
  optionals — drops them from both HTML and JSON-LD (e.g. recipe `cookTime` when
  unset). A small, strictly-better JSON-LD change.
- [ ] No `data-field` remains on SEO-carrier metas; the data role lives entirely
  in the bag.
- [ ] Tests: JSON-LD parity (non-empty props) for the schema-rich runes; HTML
  output reflects the inline SEO metas; snapshot updates reviewed.

## Approach (decided)

In `createComponentRenderable`, a meta that appears in the `schema` map keeps its
`property=` but is **not** given `data-field` (untangled from data); its value
still goes to the `fields` bag via the `properties` loop. Empty-content SEO
metas are dropped (skip-empties). The metas then render inline as RDFa (Option
B) and no longer rely on the engine's `data-field`-match strip — which is what
lets `WORK-323` delete the kebab set + meta-strip. Pure-data metas (in
`properties` only) are untouched here; `WORK-323` drops those.

## Dependencies

- {% ref "WORK-328" /%} — every data reader (engine + pipelines) must be on the
  bag before the metas' data role is removed.

## References

- {% ref "SPEC-082" /%} — typed node data channel (problem #4).

{% /work %}
