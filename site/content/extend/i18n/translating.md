---
title: Translating refrakt
description: Contribute a language — extract the keys, translate the bundle, and get coverage measured
---

# Translating refrakt

Because framework chrome is identical on every site, refrakt ships **first-party
translations** so a site owner just sets `locale` and gets a localized UI with zero
dictionary authoring. Languages are added by demand — contributing one is a
three-step round trip.

## 1. Extract the keys

`refrakt i18n extract` emits every derivable key with its English default as a JSON
dictionary — the exact shape a translation file uses:

```bash
# Print the full key set (core + all installed plugins)
refrakt i18n extract

# Write it to a file to start a new bundle
refrakt i18n extract -o packages/runes/i18n/en.json
```

The same command is exposed over MCP as `refrakt.i18n_extract` for agent-assisted
translation.

## 2. Translate the bundle

Bundles live **in-package, one JSON file per locale** (never a separate per-language
npm package):

- Core strings (`core.*`, `layout.*`, `behavior.*`) → `packages/runes/i18n/<locale>.json`
- Each plugin's strings (`<plugin>.*`) → `plugins/<name>/i18n/<locale>.json`

Copy `en.json` to `<locale>.json` and translate the values. Keys are language-
independent — never translate or reorder them. Values are a `string`, or a CLDR
plural-category map (`{ "one": "…", "other": "…" }`) for count-bearing strings.

```jsonc
// packages/runes/i18n/de.json
{
  "core.hint.warning": "Warnung",
  "core.toc.title": "Auf dieser Seite",
  "behavior.search.noResults": "Keine Ergebnisse gefunden."
}
```

Partial bundles are safe: any key you omit falls back to English **per key**, so you
can ship an incomplete translation and fill it in over time.

## 3. Check coverage

`--check` compares a bundle against the derived key set, printing per-locale coverage
and failing on missing or orphaned keys (a key renamed out from under the bundle):

```bash
refrakt i18n extract --check --locale packages/runes/i18n/de.json
# de: 94% (68/72)
#   missing 4 key(s): …
```

Use it in CI to catch drift when a new labelled field lands without a translation.

## The "supported" bar

Partial coverage is *safe* (English fallback), but a language is only advertised as
**supported** once its bundle has been **reviewed by a native speaker** — a bad
machine translation under the refrakt name is worse than English. Coverage is the
measured signal; native review is the quality gate.

## How bundles are built

The JSON files are the source of truth. A small generate step
(`scripts/generate-translations.mjs` in `packages/runes`) bakes them into a typed TS
module so the runtime never loads JSON at import time; only the active locale is
selected at build time by `assembleThemeConfig`. Plugins embed their bundle the same
way via `Plugin.translations`. `en.json` is the English *reference* (already the
baked-in default), so it is not emitted into the runtime map.
