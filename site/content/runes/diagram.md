---
title: Diagram
description: Mermaid diagram rendering from code blocks
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# Diagram

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

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:diagram"} /%}

