---
title: Tabs
description: Tabbed content panels with heading-based tab labels
---

# Tabs

Tabbed content panels. Headings become tab labels, the content below each heading becomes the tab panel.

## Heading-based tabs

Set `headingLevel` to automatically convert headings into tab labels.

```markdoc
{% tabs headingLevel=2 %}
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

{% tabs headingLevel=2 %}
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

## Explicit tab tags

Use `{% tab %}` tags for more control over tab names and content.

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

{% tabs %}
{% tab name="JavaScript" %}
Content for the JavaScript tab.
{% /tab %}

{% tab name="TypeScript" %}
Content for the TypeScript tab.
{% /tab %}
{% /tabs %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to convert into tabs |
