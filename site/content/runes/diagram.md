---
title: Diagram
description: Mermaid diagram rendering from code blocks
category: Code
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:diagram"} /%}

Renders diagrams from code blocks using Mermaid.js. The code block content is rendered as an SVG diagram in the browser.

## Basic usage

Wrap a Mermaid code block with the diagram rune to render it as an SVG.

{% preview source=true %}

	{% diagram language="mermaid" title="User Authentication Flow" %}
	```mermaid
	graph TD
	  A[Visit Site] --> B{Logged In?}
	  B -->|Yes| C[Dashboard]
	  B -->|No| D[Login Page]
	  D --> E[Sign Up]
	  D --> F[Sign In]
	  F --> C
	  E --> C
	```
	{% /diagram %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A code fence | The diagram's source, drawn as an SVG in the browser; its language comes from the `language` attribute, not the fence |
| Anything else in the body | Left out |

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:diagram"} /%}
