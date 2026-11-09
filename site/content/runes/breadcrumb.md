---
title: Breadcrumb
description: Navigation breadcrumbs showing page hierarchy
category: Site
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:breadcrumb"} /%}

Navigation breadcrumbs from a list of links. Each linked item is a navigable breadcrumb, and the last item (without a link) represents the current page.

## Basic usage

A breadcrumb trail using the default `/` separator.

{% preview source=true %}

	{% breadcrumb %}
	- [Home](/)
	- [Getting started](/docs/getting-started)
	- [Tabs](/runes/tabs)
	- Breadcrumb
	{% /breadcrumb %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A list | The trail, one crumb per item, in order |
| An item that is a link | A crumb that links to that page |
| An item without a link | A plain-text crumb, normally the current page |

## Custom separator

Use the `separator` attribute to change the divider between items.

{% preview source=true %}

	{% breadcrumb separator="›" %}
	- [Home](/)
	- [Getting started](/docs/getting-started)
	- Current page
	{% /breadcrumb %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:breadcrumb"} /%}
