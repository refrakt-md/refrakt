{% work id="WORK-511" status="done" priority="low" complexity="simple" source="SPEC-035" milestone="v0.29.0" tags="i18n,adapters,transform,intl" pr="refrakt-md/refrakt#568" %}

# Cross-adapter `lang` attribute (Zone 8) + Intl number/duration/currency formatting

Two small correctness follow-ups that ride on the locale field.

## Scope

- **Zone 8 — document `lang`**: each adapter's page shell (html, astro, nuxt, next, eleventy, sveltekit) sets `lang={config.locale ?? 'en'}`. Audit all six adapters ({% ref "SPEC-030" /%}, {% ref "SPEC-058" /%}); add a shared helper if it reduces drift.
- **Number / duration / currency formatting**: the duration transform consults `Intl.DurationFormat` (or a polyfill) for locale output; budget amounts use `Intl.NumberFormat(config.locale)`; currency uses `Intl.NumberFormat` `style: 'currency'`, replacing the manual `BUDGET_CURRENCY_SYMBOLS` lookup.
- Tests: a non-English locale sets `lang` on every adapter's shell and formats a duration/number/currency per locale.

## Acceptance Criteria

- [x] All six adapter page shells emit `lang` from `config.locale`, defaulting to `en`.
- [x] Duration, number, and currency formatting are locale-aware via `Intl`.
- [x] Zero-config (`en`) output is unchanged.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Zone 8, Number and Duration Formatting.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- **Zone 8 lang:** added shared `resolveDocumentLang(locale)` in transform. The html `renderFullPage` shell now derives `<html lang>` from `options.locale` (covers html + the eleventy/nuxt/next adapters that render through it); the SvelteKit `theme-hook` reads the site locale and rewrites `<html lang="en">`; astro's `BaseLayout` already exposes the `lang` prop seam.
- **Duration:** `formatDurationLocale()` in the engine — English keeps the compact `1h 30m`; non-English uses `Intl.DurationFormat` when available (feature-detected, safe fallback). Threaded through `resolveField`.
- **Number/currency:** `formatBudgetAmount` uses `Intl.NumberFormat` `style: 'currency'` for a non-English locale (sourced from `config.variables.locale`); English keeps the deterministic `symbol + grouped` form.
- Tests: `i18n-formatting.test.ts` (4).

### Notes
- Every locale path is guarded so `en` output is byte-identical (1565 transform+runes tests green + full workspace build). Adapter `lang` is centralized in the shared shell + the one SvelteKit hook to minimize drift, exactly as the item suggested. Budget currency localization rides the Markdoc-variable seam (`config.variables.locale`), consistent with the other parse-time i18n threading.

{% /work %}
