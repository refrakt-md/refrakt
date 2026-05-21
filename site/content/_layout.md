---
# Marketing default per SPEC-052 — every page on the site renders in dark
# mode, regardless of system preference, unless a deeper `_layout.md`
# (docs, runes, plan docs) opts out. The theme toggle hides on locked
# pages so users aren't presented with a control that does nothing.
tint-mode: dark
tint-lock: true
---
{% layout %}
{% region name="header" %}
[{% icon name="mark" /%} refrakt.md](/)

{% nav layout="menubar" %}
## Docs

{% nav layout="columns" %}
- [Getting started](/docs/getting-started)

  Install refrakt and build your first site.

- [Authoring](/docs/authoring/authoring-overview)

  Write content with Markdoc + runes.

- [Configuration](/docs/configuration/overview)

  Sites, plugins, and themes in `refrakt.config.json`.

- [CLI](/docs/cli/cli-overview)

  `refrakt` commands for inspect, write, and build.

---

- [Plugins](/docs/plugins)

  Extend the rune set with custom packages.

- [Adapters](/docs/adapters/adapters-overview)

  SvelteKit, Astro, Next, Nuxt, Eleventy, HTML.

- [Theming](/docs/themes/overview)

  Build a theme — tokens, CSS, components.

- [MCP](/docs/mcp/overview)

  Model Context Protocol server for AI editors.
{% /nav %}

## Runes

{% nav layout="columns" %}
- [Rune catalog](/runes/rune-catalog)

  Every author-facing rune in one place.

- [Marketing](/runes/marketing)

  Hero, CTA, bento, feature, pricing, steps.

- [Docs](/runes/docs)

  API, symbol, changelog references.

- [Design](/runes/design)

  Swatch, palette, typography, spacing previews.

---

- [Storytelling](/runes/storytelling)

  Character, realm, faction, lore, plot, bond.

- [Learning](/runes/learning)

  How-to and recipe runes.

- [Plan](/runes/plan)

  Specs, work, decisions, milestones.

- [Plugin authoring](/docs/plugins/authoring)

  Build your own runes in a plugin package.
{% /nav %}

## Themes
- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)
- [Neutral default](/themes/neutral-default)
- [Niwaki](/themes/niwaki)
- [Tideline](/themes/tideline)
- [Code-editor presets](/themes/themes-catalog)

## Project
- [Plan](/plan)
- [Plan docs](/plan/docs/plan-overview)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [Changelog](/releases)
- [Blog](/blog)
- [GitHub](https://github.com/refrakt-md/refrakt)
{% /nav %}
{% /region %}

{% region name="footer" %}
{% nav layout="columns" %}
## Learn
- [Getting started](/docs/getting-started)
- [Authoring](/docs/authoring/authoring-overview)
- [Configuration](/docs/configuration/overview)
- [CLI](/docs/cli/cli-overview)

---

## Reference
- [Rune catalog](/runes/rune-catalog)
- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)
- [MCP](/docs/mcp/overview)

---

## Extend
- [Plugins](/docs/plugins)
- [Plugin authoring](/docs/plugins/authoring)
- [Adapters](/docs/adapters/adapters-overview)
- [Theming](/docs/themes/overview)

---

## Project
- [Plan](/plan)
- [Plan docs](/plan/docs/plan-overview)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [Changelog](/releases)
- [Blog](/blog)
- [GitHub](https://github.com/refrakt-md/refrakt)
{% /nav %}

© 2026 refrakt.md — MIT licensed.
{% /region %}

{% /layout %}
