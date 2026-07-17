{% work id="WORK-510" status="ready" priority="low" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,runes,plan,knownsections" %}

# knownSections `canonicalSlug` + `i18nAliases` — stable-slug follow-up

`knownSections` shipped ({% ref "WORK-024" /%}, via {% ref "SPEC-037" /%}) but without the
localization shape {% ref "SPEC-035" /%} called for. `slugify()` still derives the section wrapper's
`data-name` from **raw heading text**, so a non-English heading (`## Akzeptanzkriterien`) produces a
different slug than `## Acceptance Criteria`, breaking CSS selectors and cross-locale anchors. This
item closes that gap. The `canonicalSlug` half can proceed independently (the framework already
exists); the `i18nAliases` half layers on locale resolution.

## Scope

- Add `canonicalSlug?: string` and `i18nAliases?: Record<string, string[]>` to `KnownSectionDefinition` (`packages/types/src/content-model.ts`).
- `buildSections()` (`plugins/plan/src/util.ts`): when a section matches a known section, derive the `<section data-name>` from `canonicalSlug` (default `slugify(canonicalName)`), not the heading text; unrecognised sections keep `slugify($heading)`.
- `matchKnownSection()` (`packages/runes/src/lib/resolver.ts`): consult `i18nAliases[locale]` in addition to the base `alias` list when a locale is configured.
- Tests: a non-English heading matched via `i18nAliases` yields the canonical, language-stable `data-name`; unrecognised headings unchanged.

## Acceptance Criteria

- [ ] `KnownSectionDefinition` gains `canonicalSlug` + `i18nAliases`.
- [ ] Matched known sections emit a language-independent `data-name` derived from the canonical key.
- [ ] Locale-specific heading aliases match when `locale` is set; base aliases still match.
- [ ] Unrecognised sections keep heading-derived slugs (no regression).

## References

- {% ref "SPEC-035" /%} — Zone 7, Interaction with knownSections.
- {% ref "WORK-024" /%}, {% ref "SPEC-037" /%} — the shipped knownSections framework this extends.

{% /work %}
