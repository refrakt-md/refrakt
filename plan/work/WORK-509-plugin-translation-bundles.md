{% work id="WORK-509" status="done" priority="medium" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,plugins,runes,architecture" %}

# Plugin translation bundles + `mergePlugins()` wiring

Give plugins a slot to ship their own translations and wire it into the merge so a configured locale
resolves plugin-scoped keys. This is the mechanism first-party and community plugins both use.

## Scope

- Add `translations?: Record<string, Record<string, LocalizedValue>>` to `Plugin` (`packages/types/src/package.ts`), keyed by BCP 47 locale. Authored as per-locale JSON imported into the field (Decision D3/D8).
- Thread `translations` through `LoadedPlugin` and `MergedPluginResult`, and in `mergePlugins()` (`packages/runes/src/plugins.ts`) select the bundle for the configured locale (with the D5 `de-AT`→`de` tag fallback) and merge into the `LocaleContext.strings`.
- Enforce the D5 precedence at merge/resolve time: site `ThemeConfig.strings` entries win over plugin defaults; no per-plugin "default language" (English is the floor).
- Tests: plugin bundle selected by locale, site override beats plugin bundle, unknown locale → English.

## Acceptance Criteria

- [x] `Plugin.translations` exists and is loaded/merged by `mergePlugins()`.
- [x] A plugin-shipped `de` bundle localizes that plugin's labels under `locale: 'de'`.
- [x] Site-level `strings` override beats the plugin bundle; missing keys fall to English.
- [x] No per-plugin default-language fallback path exists.

## Blocked by

- {% ref "WORK-502" /%}

## References

- {% ref "SPEC-035" /%} — Plugin Translation Bundles, Decisions D3/D5/D8.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- Added `Plugin.translations` (`packages/types/src/package.ts`) + `PluginLocalizedValue`; exported from the types index.
- `mergePlugins()` aggregates per-locale bundles across plugins into `MergedPluginResult.translations` (plugin-scoped keys → no collisions); added `selectPluginStrings(merged, locale)` with the D5 `de-AT`→`de` fallback.
- `assembleThemeConfig` gained `locale` / `pluginTranslations` / `coreTranslations` inputs and builds `config.strings` with Decision-D5 precedence: core bundle → plugin bundles → site `ThemeConfig.strings` (site wins), stamping `config.locale`.
- Added `SiteConfig.locale` + `SiteConfig.strings`; the CLI `loadMergedConfig` threads them + `merged.translations` into `assembleThemeConfig`, so extract/inspect are locale-aware.
- Tests: `packages/runes/test/plugin-translations.test.ts` (6) — aggregation, locale selection + fallback, site-wins, core-lowest, unknown-locale → English.

### Notes
- No per-plugin default language: an untranslated key resolves to English at the call site, never to another locale. 1560 transform+runes tests green.

{% /work %}
