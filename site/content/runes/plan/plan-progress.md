---
title: Plan Progress
description: Per-type completion bars and status breakdowns from the plan registry
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `plugins` array in your `refrakt.config.json`.
{% /hint %}

# Plan Progress

A completion overview built from the plan registry: **one block per entity type** — a heading, a progress bar showing how far that type has reached its done-state, and a row of per-status badges. It's thin sugar over the generic [`aggregate`](/runes/aggregate) rune, so the counting happens at build time against live registry data — no manual tallies.

Each type gets its *own* bar on purpose: a single mixed bar would conflate different done-states (a `work` item is **done**, a `bug` is **fixed**, a `spec` is **accepted**), which tells you nothing useful.

## Default — the actionable set

A bare `{% plan-progress /%}` covers what you act on day to day: **work items and bugs**.

{% preview source=true %}

{% plan-progress /%}

{% /preview %}

## Every type

Widen to the full plan set with `show="all"` — or list exactly the types you want via `type=`:

{% preview source=true %}

{% plan-progress show="all" /%}

{% /preview %}

## Scoping

`milestone=` lowers to a registry filter, so every bar counts only that milestone's items:

```markdoc
{% plan-progress milestone="v1.0.0" /%}
```

Scope to a single type with `type=` — its done-state drives the bar:

```markdoc
{% plan-progress type="spec" /%}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `work,bug` | Entity type(s) to chart, comma-separated: `work`, `bug`, `spec`, `decision`, `milestone`. |
| `show` | `string` | — | Legacy alias for `type`; `all` expands to the full plan set. |
| `milestone` | `string` | — | Scope every bar to a milestone — lowers to `filter="milestone:…"`. |
| `filter` | `string` | — | Raw `field:value` filter clauses ([collection grammar](/runes/collection)); overrides `milestone`. |
| `value` | `string` | per type | Override the achieved-subset clause for every bar (default: each type's terminal-positive status). |

### How it composes

`plan-progress` emits one `{% aggregate %}` per type (`group="status"`, `value="status:<that type's done-state>"`) and lets `aggregate` resolve the counts. The bar is the [`progress`](/runes/progress) rune, labelled with the achieved status — **Done** (work), **Fixed** (bug), **Accepted** (spec / decision), **Complete** (milestone) — with the count shown alongside. The breakdown is one [`badge`](/runes/badge) per status. (Per-status badge colour is on the roadmap — it needs per-group sentiment projection in `aggregate`.)
