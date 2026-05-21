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

- [Configuration](/docs/configuration/overview)

  Sites, plugins, and themes in `refrakt.config.json`.

- [Content](/docs/content)

  Pages, layouts, regions, and frontmatter.

---

- [CLI](/docs/cli/cli-overview)

  `refrakt` commands for inspect, write, and build.

- [Adapters](/docs/adapters/adapters-overview)

  SvelteKit, Astro, Next, Nuxt, Eleventy, HTML.

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

- [Business](/runes/business)

  Cast, organization, timeline.
{% /nav %}

## Themes
- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)
- [Neutral default](/themes/neutral-default)
- [Niwaki](/themes/niwaki)
- [Tideline](/themes/tideline)
- [Code-editor presets](/themes/themes-catalog)

## Extend

{% nav layout="columns" %}
- [Rune authoring](/extend/rune-authoring/authoring-overview)

  Write custom runes — content models, output contract, patterns.

- [Plugin authoring](/extend/plugin-authoring/authoring)

  Package runes, theme, behaviors, and CLI as a plugin.

- [Theme authoring](/extend/theme-authoring/overview)

  Build a theme — tokens, CSS, identity-transform config.

---

- [Pipeline](/extend/plugin-authoring/pipeline)

  Cross-page register, aggregate, and post-process hooks.

- [Security](/extend/security)

  Threat model and the `ResolvedSecurityPolicy` contract.

- [Contributing](/extend/contributing)

  Branches, the plan workflow, releases, and reporting issues.
{% /nav %}

## Project
- [Plan](/plan)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [Changelog](/releases)
- [GitHub](https://github.com/refrakt-md/refrakt)
{% /nav %}
{% /region %}

{% region name="footer" %}
{% nav layout="columns" %}
## Learn
- [Getting started](/docs/getting-started)
- [Configuration](/docs/configuration/overview)
- [Content](/docs/content)
- [CLI](/docs/cli/cli-overview)
- [Adapters](/docs/adapters/adapters-overview)
- [MCP](/docs/mcp/overview)

---

## Reference
- [Rune catalog](/runes/rune-catalog)
- [Themes catalog](/themes/themes-catalog)
- [Lumina](/themes/lumina)
- [Plan runes](/runes/plan)

---

## Extend
- [Rune authoring](/extend/rune-authoring/authoring-overview)
- [Plugin authoring](/extend/plugin-authoring/authoring)
- [Theme authoring](/extend/theme-authoring/overview)
- [Pipeline](/extend/plugin-authoring/pipeline)
- [Security](/extend/security)
- [Contributing](/extend/contributing)

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
