---
title: Tabs
description: Tabbed content panels with heading-based tab labels
category: Disclosure
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:tabs"} /%}

Tabbed content panels. Headings become tab labels, the content below each heading becomes the tab panel. To let several panels stay open at once, use [accordion](/runes/accordion); for one collapsible block, use [details](/runes/details); to uncover content in order, one step at a time, use [reveal](/runes/reveal).

## Heading-based tabs

Headings are automatically converted into tab labels.

{% preview source=true %}

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

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A paragraph before the first tab heading | A blurb above the tab bar |
| A heading (the first heading level you use) | A tab's label; the content up to the next heading of that level is its panel |
| A `{% tab %}` tag | A tab, labelled by its `name` |

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

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:tabs"} /%}
