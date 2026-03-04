---
title: Tabs
description: Tabbed content panels with heading-based tab labels
---

# Tabs

Tabbed content panels. Headings become tab labels, the content below each heading becomes the tab panel.

## Heading-based tabs

Set `headingLevel` to automatically convert headings into tab labels.

{% preview source=true %}

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

{% /preview %}

## Explicit tab tags

Use `{% tab %}` tags for more control over tab names and content.

{% preview source=true %}

{% tabs %}
{% tab name="JavaScript" %}
Content for the JavaScript tab.
{% /tab %}

{% tab name="TypeScript" %}
Content for the TypeScript tab.
{% /tab %}
{% /tabs %}

{% /preview %}

## Section header

Tabs supports an optional eyebrow, headline, and blurb above the tab bar. Place a short paragraph or heading before your tab headings to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to convert into tabs |
