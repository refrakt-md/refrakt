---
title: Tabs
description: Tabbed content panels with heading-based tab labels
---

# Tabs

Tabbed content panels. Headings become tab labels, the content below each heading becomes the tab panel.

```markdoc
{% tabs %}
## npm

\`\`\`shell
npm install @refrakt-md/runes
\`\`\`

## yarn

\`\`\`shell
yarn add @refrakt-md/runes
\`\`\`

## pnpm

\`\`\`shell
pnpm add @refrakt-md/runes
\`\`\`
{% /tabs %}
```

### Example

{% tabs %}
## npm

```shell
npm install @refrakt-md/runes
```

## yarn

```shell
yarn add @refrakt-md/runes
```

## pnpm

```shell
pnpm add @refrakt-md/runes
```
{% /tabs %}

You can also use explicit `{% tab %}` tags for more control:

```markdoc
{% tabs %}
{% tab name="JavaScript" %}
Content for the JavaScript tab.
{% /tab %}

{% tab name="TypeScript" %}
Content for the TypeScript tab.
{% /tab %}
{% /tabs %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to convert into tabs |
