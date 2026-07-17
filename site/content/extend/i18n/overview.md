---
title: Internationalization (i18n)
description: How refrakt localizes framework-generated UI text — labels, chrome, behaviors — and how to configure a non-English locale
---

# Internationalization

Refrakt localizes the **framework-generated text** it injects around your content:
structural labels, navigation chrome, accessibility strings, structural headings,
and client-side behavior strings. Your content stays in the language you author it;
i18n makes the *UI chrome* around it match.

The design (SPEC-035) has one guiding rule: **zero-config English**. With no locale
configured, output is byte-identical to a pre-i18n build. Adding a language is purely
additive — you provide a strings dictionary; nothing structural changes.

## Configuring a locale

Set `locale` (BCP 47) on your site config. First-party and plugin translation bundles
for that locale are selected automatically:

```jsonc
// refrakt.config.json
{
  "sites": {
    "main": {
      "contentDir": "content",
      "theme": "@refrakt-md/lumina",
      "plugins": ["@refrakt-md/learning"],
      "locale": "de"
    }
  }
}
```

That's it — `<html lang="de">`, translated labels, localized navigation chrome, and
German behavior strings all follow. `de-AT` transparently falls back to the `de`
bundle (BCP-47 region stripping) for any key it doesn't override.

## String keys

Every localizable string resolves through one path: a locale-selected `strings`
dictionary keyed by an **auto-derived** dotted path. You never invent keys by hand —
they follow the shape `{scope}.{block}.{ref}`:

- **`scope`** — `core` for built-in runes, `layout` for chrome, `behavior` for
  client strings, or a **plugin name** (`learning`, `docs`, …) for plugin runes.
- **`block`** — the rune's BEM block (`recipe`, `hint`, …).
- **`ref`** — the field / element name (`prepTime`, `warning`, …).

Examples: `core.hint.warning`, `learning.recipe.prepTime`, `layout.openMenu`,
`core.toc.title`, `behavior.search.noResults`.

Discover the full key set with the `refrakt i18n extract` command (below) — it's the
authoritative, generated list, so you never have to guess.

## Overriding a single string

Site-level `strings` always win — use them to fix a shipped translation, adjust tone,
or match brand terminology:

```jsonc
{
  "sites": {
    "main": {
      "locale": "de",
      "strings": {
        "core.toc.title": "Inhalt dieser Seite"
      }
    }
  }
}
```

Resolution is **first-match, per key** (Decision D5):

1. **Site `strings`** — always wins.
2. **The owning package's shipped bundle** for the locale (plugin bundle for
   plugin keys; core's bundle for `core.*` / `layout.*` / `behavior.*`), with
   `de-AT`→`de` fallback.
3. **The hardcoded English literal** — the universal floor.

Degradation is **per key**: a missing `de` key shows English while the rest of the
page stays German. That's what makes shipping partial translations safe.

## Plurals

Count-bearing strings use a CLDR plural-category map resolved via `Intl.PluralRules` —
no `n === 1` ternaries, no ICU parser:

```jsonc
{
  "strings": {
    "plan.progress.criteria": { "one": "{n} Kriterium", "other": "{n} Kriterien" }
  }
}
```

English supplies `{ one, other }`; Polish/Russian/Arabic add `few` / `many` / etc.
Framework chrome prefers count-neutral phrasing (`Progress 3/10`), so plurals are rare.

## Behavior strings (client-side)

Behaviors run in the browser with no server config, so translations are delivered
**inline** — never fetched. Each page emits `<meta name="rf-locale">` plus a
`<script type="application/json" id="rf-strings">` block carrying the active locale's
`behavior.*` strings. Behaviors resolve each string as
**element `data-i18n-*` attribute → inline block → hardcoded English**, synchronously
at init, so there's no flash-of-English and no-JS pages render the server English.

## What is not localized

- **Your content** — authoring language is your domain.
- **RTL layout** — a CSS concern, orthogonal to string translation.
- **CLI/developer tooling strings** — English-only (distinct from `refrakt i18n
  extract`, which *supports* i18n).

## Multi-locale sites

Serving the same site in multiple languages (route trees, a switcher, auto-detect)
is a separate, demand-driven feature — but this foundation is deliberately built so
it can be added later without breaking changes: locale is render-scoped context (never
a global), keys are locale-independent, per-page locale markers are already emitted,
and `canonicalSlug` keeps section anchors identical across languages.

See [Translating refrakt](/extend/i18n/translating) to contribute a language.
