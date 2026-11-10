---
title: Hint
description: Callouts and admonitions for supplementary information
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:hint"} /%}

Callouts and admonitions. Supports four types: `note`, `warning`, `caution`, and `check`. For an aside that sits in the margin or as a footnote rather than in the flow, use [sidenote](/runes/sidenote); to attach notes to particular passages of a longer text, use [annotate](/runes/annotate).

## Basic usage

Display supplementary information with a visual callout.

{% preview source=true %}

	{% hint type="note" %}
	The staging site rebuilds on every push to `main`, so a change can take a few minutes to appear.
	{% /hint %}

{% /preview %}

## All hint types

Use different types to convey different levels of importance.

{% preview source=true %}

	{% hint type="note" %}
	Exports include archived projects unless you clear **Include archived**.
	{% /hint %}

	{% hint type="warning" %}
	Renaming a workspace changes its URL. Update any bookmarks and webhooks that point at the old one.
	{% /hint %}

	{% hint type="caution" %}
	Deleting a workspace removes every project in it. This cannot be undone.
	{% /hint %}

	{% hint type="check" %}
	Your export is ready. The download link stays valid for seven days.
	{% /hint %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:hint"} /%}
