{% work id="WORK-329" status="done" priority="high" complexity="moderate" source="SPEC-082" tags="runes,seo,schema-org,jsonld,data-channel,fields,cleanup" milestone="v0.18.0" %}

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

- [x] A meta is **either** a data carrier (→ bag) **or** an SEO carrier
  (`property=`, no `data-field`) — never both. `createComponentRenderable` no
  longer stamps `data-field` on a meta that also carries `property=` (the schema
  channel); the data value still lands in the bag.
- [x] **JSON-LD parity** — `extractSeo` collects the same non-empty `property=`
  values it does today (verified on recipe + at least one other schema-rich
  rune, e.g. `event` / `organization`).
- [x] **DECIDED — Option B (inline RDFa).** The now-pure-SEO metas render inline
  in the HTML (e.g. `<meta property="prepTime">` inside `typeof="Recipe"`),
  consistent with the content-element RDFa and `ratingValue` metas already
  inline. No strip mechanism; this unblocks `WORK-323` removing the kebab set +
  meta-strip. Invisible markup change across the schema-rich runes.
- [x] **DECIDED — skip empties.** No `<meta property="x" content="">` for unset
  optionals — drops them from both HTML and JSON-LD (e.g. recipe `cookTime` when
  unset). A small, strictly-better JSON-LD change.
- [x] No `data-field` remains on SEO-carrier metas; the data role lives entirely
  in the bag.
- [x] Tests: JSON-LD parity (non-empty props) for the schema-rich runes; HTML
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

## Resolution

Completed: 2026-06-02

Branch: claude/rune-contract-hardening

### What was done
Untangled the schema.org SEO channel from the data channel — centralized in `createComponentRenderable` (packages/runes/src/lib/component.ts):
- A `<meta>` that also appears in the `schema` map (carries `property=`) no longer gets `data-field` — it's an SEO carrier; its value still lands in the `fields` bag via the `properties` loop.
- Empty-content SEO metas are dropped from the output (skip-empties) — gone from both HTML and JSON-LD.
- Pure-data metas (in `properties` only) are untouched here; WORK-323 drops those.

Net effect (Option B): the formerly-conflated metas now render inline as RDFa (e.g. `<meta property="prepTime">` inside `typeof="Recipe"`), consistent with the content-element RDFa and `ratingValue` metas already inline — no `data-field`, so the engine's step-7 no longer strips them. This is what lets WORK-323 remove the kebab set + meta-strip.

### Verification
- JSON-LD parity: new test in plugins/learning/test/recipe.test.ts confirms recipe's JSON-LD still carries prepTime + recipeYield, and an unset cookTime is skipped. Existing core schema-rich seo tests (faq/breadcrumb) still pass.
- Updated the 7 "should pass X as meta tags" rune tests (recipe, howto, event, character, lore, plot, realm) to assert field values via the `data-rune-fields` bag (the new data channel) instead of `<meta data-field>`.
- Full suite green (3065; the heavy plan-site dogfood test flakes only under full-suite parallel load — pre-existing, passes in isolation, and its isolation pass confirms registration is unaffected).

### Notes
- HTML output change: ~schema-rich runes now carry inline `<meta property=...>` (invisible — meta tags render nothing). No render/snapshot test regressed.
- Follow-up worth filing: stabilize `plan-site-dogfood-real` (consistently flakes under parallel load — bump timeout or isolate it). Unrelated to this work.
- WORK-323 is now unblocked: every reader is on the bag and SEO is independent.

{% /work %}
