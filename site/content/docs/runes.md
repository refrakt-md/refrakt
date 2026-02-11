---
title: Runes Reference
description: Complete reference for all refract.md runes
---

# Runes Reference

Runes are the core concept of refract.md. They are Markdoc tags that create interpretation contexts — the Markdown inside a rune takes on different semantic meaning depending on which rune wraps it.

## hint

Callouts and admonitions. Supports four types: `note`, `warning`, `caution`, and `check`.

```markdown
{% hint type="note" %}
This is a note with helpful information.
{% /hint %}
```

{% hint type="note" %}
This is a **note** — useful for supplementary information.
{% /hint %}

{% hint type="warning" %}
This is a **warning** — something to be careful about.
{% /hint %}

{% hint type="caution" %}
This is a **caution** — a serious potential issue.
{% /hint %}

{% hint type="check" %}
This is a **check** — a success or completion message.
{% /hint %}

## cta

Call-to-action sections. Headings become the hero headline, paragraphs become the subtitle, and list items with links become action buttons.

```markdown
{% cta %}
# Your Headline

A compelling description of what you're offering.

- [Primary Action](/signup)
- [Secondary Action](/learn)
{% /cta %}
```

Code fences become copyable command blocks:

```markdown
{% cta %}
# Install refract.md

\`\`\`shell
npm install @refract-md/runes
\`\`\`
{% /cta %}
```

## feature

Feature showcases. List items become feature definitions — bold text is the feature name, the following paragraph is the description.

```markdown
{% feature %}
## Features

- **Fast builds**

  Static generation with incremental rebuilds.

- **Type-safe content**

  Every rune produces typed, validated output.

- **Zero config**

  Convention-based project structure.
{% /feature %}
```

## nav

Navigation structure for the sidebar. Headings become group titles, list items become page links (using slugs that resolve to page titles).

```markdown
{% nav %}
## Getting Started
- getting-started
- runes

## Advanced
- layouts
- theming
{% /nav %}
```

Place inside a `{% region name="nav" %}` in your `_layout.md` to create a site-wide sidebar.

## layout and region

Structural runes that define page layout. `{% layout %}` wraps the entire layout file. `{% region %}` defines named regions (header, nav, sidebar, footer) that render in specific positions.

```markdown
{% layout %}
{% region name="header" %}
# Site Title
{% /region %}

{% region name="nav" %}
{% nav %}
- page-one
- page-two
{% /nav %}
{% /region %}
{% /layout %}
```

Regions support three merge modes via `mode` attribute: `replace` (default), `prepend`, and `append`. Child layouts inherit and can override parent regions.

## steps

Step-by-step instructions with numbered indicators.

```markdown
{% steps %}
1. Install the dependencies

   Run the install command for your package manager.

2. Create your content directory

   Add a `content/` folder with your Markdown files.

3. Start the dev server

   Run `npm run dev` and visit localhost.
{% /steps %}
```

## grid

Generic grid layout. Children are arranged in a responsive CSS grid.

```markdown
{% grid %}
Column one content.

---

Column two content.

---

Column three content.
{% /grid %}
```

## tabs

Tabbed content panels. Headings become tab labels, the content below each heading becomes the tab panel.

```markdown
{% tabs %}
## npm

\`\`\`shell
npm install @refract-md/runes
\`\`\`

## yarn

\`\`\`shell
yarn add @refract-md/runes
\`\`\`

## pnpm

\`\`\`shell
pnpm add @refract-md/runes
\`\`\`
{% /tabs %}
```
