---
"@refrakt-md/types": minor
"@refrakt-md/transform": minor
"@refrakt-md/runes": minor
"@refrakt-md/behaviors": minor
"@refrakt-md/html": minor
"@refrakt-md/sveltekit": minor
"@refrakt-md/cli": minor
"@refrakt-md/mcp": minor
"@refrakt-md/learning": minor
---

Multi-language support (i18n foundation) — SPEC-035

Framework-generated text (labels, navigation chrome, accessibility strings,
structural headings, and client-side behavior strings) is now localizable.
Zero-config English is unchanged — adding a language means providing a strings
dictionary, no structural changes.

- **Locale config**: `locale` + `strings` on `ThemeConfig` and `SiteConfig`; a
  render-scoped `LocaleContext` with `resolveLocaleString` / `resolvePluralString`
  (CLDR plurals via `Intl.PluralRules`) and per-key first-match fallback with
  BCP-47 region stripping (`de-AT`→`de`).
- **Auto-derived keys**: labels resolve through `{scope}.{block}.{ref}` keys
  (optional `i18nKey` override); covers structure/meta-field labels, layout chrome,
  computed navigation, programmatic text (`data-i18n`), and enum-as-text values.
- **`refrakt i18n extract`** (CLI + `refrakt.i18n_extract` MCP tool): emits the full
  key→English dictionary as JSON; `--check` reports per-locale coverage and fails on
  drift.
- **Behavior strings**: delivered inline (`<meta name="rf-locale">` +
  `<script id="rf-strings">`), resolved element→block→English synchronously with no
  fetch and no flash-of-English.
- **Plugin translation bundles**: `Plugin.translations`, merged by `mergePlugins`
  under site overrides (site wins).
- **knownSections**: `canonicalSlug` + `i18nAliases` for language-stable section slugs.
- **Cross-adapter `<html lang>`** + locale-aware `Intl` duration/number/currency.
- **First-party bundles**: in-package per-locale JSON (`i18n/<locale>.json`) with a
  seeded German translation; partial bundles degrade per key to English.
