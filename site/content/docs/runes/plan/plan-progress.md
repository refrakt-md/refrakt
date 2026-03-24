---
title: Plan Progress
description: Progress summary showing status counts per entity type
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Plan Progress

Renders a compact progress summary showing status counts per entity type. Each count is color-coded using the plan status palette. Useful at the top of dashboards to give a project health overview at a glance.

This is a self-closing aggregation rune — it produces a sentinel that the pipeline resolves with live entity data from the registry.

## All entity types

Show progress for all tracked entity types (work items, bugs, specs, decisions).

{% preview source=true %}

{% plan-progress /%}

{% /preview %}

## Filtered by type

Show progress for specific entity types only.

{% preview source=true %}

{% plan-progress show="work,bug" /%}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `show` | `string` | `all` | Entity types to include: `all`, or comma-separated list of `work`, `bug`, `spec`, `decision` |

### Output structure

The rune resolves to a series of rows, one per entity type, each containing:

- A label with the total count (e.g. "35 work items")
- Color-coded status count badges using `[data-status]` attribute selectors

The progress summary is generated automatically from the entity registry — no manual counting required.
