{% work id="WORK-502" status="done" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,types,architecture" pr="refrakt-md/refrakt#568" %}

# i18n resolution foundation — locale config, LocaleContext, resolvers, fallback

The P0 foundation every other zone builds on: the locale/strings surface on `ThemeConfig`, the
value types, the render-scoped `LocaleContext` slice, the resolver helpers, and the per-key fallback
precedence. Nothing else in {% ref "SPEC-035" /%} can land without this.

## Scope

- Add `locale?: string` (BCP 47, default `'en'`) and `strings?: Record<string, LocalizedValue>` to `ThemeConfig` (`packages/transform/src/types.ts`).
- Define `LocalizedValue = string | PluralMap` and `PluralMap = Partial<Record<Intl.LDMLPluralRule, string>>`.
- Define `LocaleContext { locale: string; strings: Record<string, LocalizedValue> }` — the render-scoped slice threaded into consumers. It must **never** be module-global mutable state (SPEC-035 forward-compatibility constraint for future multi-locale builds).
- Implement `resolveLocaleString(ctx, key, fallback)` and `resolvePluralString(ctx, key, count, fallback)` (via `Intl.PluralRules`, `{n}` interpolation).
- Implement per-key fallback precedence (Decision D5): site `strings` → owning package's shipped locale bundle (with `de-AT`→`de` region-strip) → English literal. First-match, per key — not a deep merge.
- Unit tests for string/plural resolution, region-strip fallback, missing-key → English, and plural categories.

## Acceptance Criteria

- [x] `ThemeConfig.locale` + `strings` and the `LocalizedValue` / `PluralMap` types exist and compile across dependents.
- [x] `LocaleContext` is defined; `resolveLocaleString` / `resolvePluralString` implemented with tests.
- [x] Per-key precedence + BCP-47 region-strip fallback implemented and tested.
- [x] Zero-config English is unchanged: with no `locale` / `strings` set, transform output is byte-identical to today.

## References

- {% ref "SPEC-035" /%} — Value Types, Locale Configuration, Resolution Mechanism, Resolution Precedence (D5), Decisions D2/D5/D6.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- Added `packages/transform/src/i18n.ts`: `LocalizedValue`/`PluralMap` types, render-scoped `LocaleContext`, `resolveLocaleString`/`resolvePluralString` (Intl.PluralRules, `{n}` interpolation), `localeFallbackChain` (BCP-47 region-strip), `selectLocaleBundle`, `mergeLocaleStrings`, `normalizeLocale`, `createLocaleContext`, `EN_LOCALE_CONTEXT`.
- Added `ThemeConfig.locale` + `ThemeConfig.strings` in `packages/transform/src/types.ts`.
- Exported the new surface from `packages/transform/src/index.ts`.
- 23 unit tests in `packages/transform/test/i18n.test.ts` covering scalar/plural resolution, region-strip fallback, per-key precedence, missing-key → English.

### Notes
- Context is a narrow slice per Decision D6; never module-global (forward-compat constraint for multi-locale). Zero-config English is a no-op: all 600 transform tests still pass.

{% /work %}
