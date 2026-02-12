---
title: Diagram
description: Mermaid diagram rendering from code blocks
---

# Diagram

Renders diagrams from code blocks using Mermaid.js. The code block content is rendered as an SVG diagram in the browser.

## Basic usage

Wrap a Mermaid code block with the diagram rune to render it as an SVG.

````markdoc
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
````

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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | `string` | `mermaid` | Diagram language: `mermaid`, `plantuml`, or `ascii` |
| `title` | `string` | — | Accessible title for the diagram |
