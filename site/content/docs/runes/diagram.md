---
title: Diagram
description: Mermaid diagram rendering from code blocks
---

# Diagram

Renders diagrams from code blocks using Mermaid.js. The code block content is rendered as an SVG diagram in the browser.

````markdoc
{% diagram language="mermaid" title="Flow" %}
```mermaid
graph TD
  A --> B
  B --> C
```
{% /diagram %}
````

### Example

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
