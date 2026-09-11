---
title: Details
description: Collapsible disclosure blocks for supplementary content
category: Layout
plugin: core
status: stable
type: rune
---

# Details

Collapsible disclosure block for supplementary content. Renders as a native `<details>` element.

## Basic usage

Content is hidden by default and revealed when the user clicks the summary.

{% preview source=true %}

{% details summary="Click to reveal more information" %}
This content is hidden by default. The details rune wraps content in a native disclosure element that the user can toggle open and closed.
{% /details %}

{% /preview %}

## Open by default

Use `open=true` to have the block expanded when the page loads.

{% preview source=true %}

{% details summary="This one starts open" open=true %}
Since `open=true` is set, this block is expanded when the page loads.
{% /details %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:details"} /%}

