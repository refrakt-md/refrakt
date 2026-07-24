{% work id="WORK-512" status="done" priority="low" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,plugins,runes,packaging" pr="refrakt-md/refrakt#568" %}

# First-party translation bundles (phased, demand-driven)

Ship refrakt's own translations for the universal chrome so a site owner sets `locale` and gets a
localized UI with zero dictionary authoring. Phased after the mechanism; the initial language tier
is demand-driven (Decision D7/D8).

## Scope

- Establish the in-package per-locale layout (Decision D8): core strings ship `i18n/<locale>.json` in `packages/runes` (alongside `coreConfig`); each plugin ships its own `i18n/<locale>.json`. **Not** per-language npm packages.
- Seed the pipeline with **one** non-English language end-to-end (produced via `refrakt i18n extract` → translate) as proof, and wire the build so only the active locale is selected.
- Establish the quality gate: a language is "supported" only after native-speaker review; partial coverage is safe (English fallback per key) and surfaced by `refrakt i18n extract --check`.
- Document how to contribute a language (extract → translate → PR) and how coverage is reported.

## Acceptance Criteria

- [x] In-package per-locale JSON layout exists for core + plugins; no per-language npm package is introduced.
- [x] At least one seeded non-English language renders the full chrome end-to-end at build time.
- [x] Contribution + coverage-reporting docs exist; the "supported" bar (native-speaker review) is written down.
- [x] Partial bundles degrade per-key to English with no hard failures.

## Blocked by

- {% ref "WORK-506" /%}
- {% ref "WORK-509" /%}

## References

- {% ref "SPEC-035" /%} — First-Party Translations, Decisions D7/D8.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- **In-package per-locale JSON layout:** `packages/runes/i18n/{en,de}.json` (core `core.*`/`layout.*`/`behavior.*`) and `plugins/learning/i18n/{en,de}.json`. No per-language npm package.
- **Build wiring:** `scripts/generate-translations.mjs` bakes `i18n/*.json` → `src/translations.generated.ts` (`coreTranslations`), run before `tsc`; exported from the runes index. Learning plugin ships `translations` (embedded from its JSON). CLI `loadMergedConfig` passes `coreTranslations` into `assembleThemeConfig`.
- **Seed:** full German end-to-end — verified `locale: 'de'` resolves core chrome (`Auf dieser Seite`), enums (`Warnung`), plugin labels (`Vorbereitung`), and behavior strings (`Keine Ergebnisse gefunden.`).
- **Docs:** `site/content/extend/i18n/overview.md` + `translating.md` (extract → translate → PR round trip, coverage `--check`, the native-speaker "supported" bar), added to the extend nav.
- **Tests:** `translations-generation.test.ts` (drift guard + orphan check).

### Notes
- Only the active locale is selected at build time; English is the baked-in default (not emitted into the runtime map). Partial bundles degrade per-key to English (Decision D5) — no hard failures. `en.json` is the canonical reference that `refrakt i18n extract --check` scores against.

{% /work %}
