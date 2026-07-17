{% work id="WORK-511" status="ready" priority="low" complexity="simple" source="SPEC-035" milestone="v0.29.0" tags="i18n,adapters,transform,intl" %}

# Cross-adapter `lang` attribute (Zone 8) + Intl number/duration/currency formatting

Two small correctness follow-ups that ride on the locale field.

## Scope

- **Zone 8 — document `lang`**: each adapter's page shell (html, astro, nuxt, next, eleventy, sveltekit) sets `lang={config.locale ?? 'en'}`. Audit all six adapters ({% ref "SPEC-030" /%}, {% ref "SPEC-058" /%}); add a shared helper if it reduces drift.
- **Number / duration / currency formatting**: the duration transform consults `Intl.DurationFormat` (or a polyfill) for locale output; budget amounts use `Intl.NumberFormat(config.locale)`; currency uses `Intl.NumberFormat` `style: 'currency'`, replacing the manual `BUDGET_CURRENCY_SYMBOLS` lookup.
- Tests: a non-English locale sets `lang` on every adapter's shell and formats a duration/number/currency per locale.

## Acceptance Criteria

- [ ] All six adapter page shells emit `lang` from `config.locale`, defaulting to `en`.
- [ ] Duration, number, and currency formatting are locale-aware via `Intl`.
- [ ] Zero-config (`en`) output is unchanged.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Zone 8, Number and Duration Formatting.

{% /work %}
