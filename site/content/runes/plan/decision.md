---
title: Decision
description: Architecture decision record capturing context, options, rationale, and consequences
category: Plan
plugin: plan
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Decision

Architecture decision record. Captures the context, options considered, the decision made, the rationale, and the consequences. The most important rune in the package for AI-native workflows — without decision records, every AI session starts from zero context.

Also available as `{% adr %}`.

## Accepted decision

A fully documented architecture decision record.

{% preview source=true %}

{% decision id="ADR-007" status="accepted" date="2026-03-11" tags="tint,css" %}
# Use CSS custom properties for tint token injection

## Context
Tint runes need to override colour tokens within a section scope. The solution must work without JavaScript and cascade through nested elements.

## Options Considered
1. **CSS custom properties on the container** — inline styles setting `--tint-*` tokens, theme bridges via `var()` fallbacks.
2. **Generated CSS classes per tint combination** — build step creates per-tint classes. Avoids inline styles but combinatorial explosion.
3. **JavaScript runtime token injection** — behaviour script reads data attributes and sets styles. Most flexible but requires JS.

## Decision
CSS custom properties via inline styles on the container element.

## Rationale
Custom properties cascade naturally through the DOM subtree without JavaScript. Themes opt into tint support by including bridge CSS. The `--tint-*` namespace avoids collisions with theme-internal tokens.

## Consequences
- Themes must include the tint bridge CSS
- Inline styles cannot use media queries — dark mode handled separately
- Inspector must audit tint token contrast ratios
{% /decision %}

{% /preview %}

## Proposed decision

A decision still under review.

{% preview source=true %}

{% decision id="ADR-015" status="proposed" date="2026-03-18" %}
# Adopt content model validation at parse time

## Context
Currently content model violations are only caught during transform. Earlier validation would improve error messages.

## Decision
Move validation to a post-parse AST pass.
{% /decision %}

{% /preview %}

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:decision"} /%}

