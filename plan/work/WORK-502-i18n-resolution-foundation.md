{% work id="WORK-502" status="ready" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,types,architecture" %}

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

- [ ] `ThemeConfig.locale` + `strings` and the `LocalizedValue` / `PluralMap` types exist and compile across dependents.
- [ ] `LocaleContext` is defined; `resolveLocaleString` / `resolvePluralString` implemented with tests.
- [ ] Per-key precedence + BCP-47 region-strip fallback implemented and tested.
- [ ] Zero-config English is unchanged: with no `locale` / `strings` set, transform output is byte-identical to today.

## References

- {% ref "SPEC-035" /%} — Value Types, Locale Configuration, Resolution Mechanism, Resolution Precedence (D5), Decisions D2/D5/D6.

{% /work %}
