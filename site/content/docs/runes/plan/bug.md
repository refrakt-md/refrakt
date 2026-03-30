---
title: Bug
description: Bug report with structured reproduction steps and severity tracking
---

{% hint type="note" %}
This rune is part of **@refrakt-md/plan**. Install with `npm install @refrakt-md/plan` and add `"@refrakt-md/plan"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Bug

Bug report with structured reproduction steps. Separate from work items because bugs have different required sections (reproduction steps, expected/actual behaviour) and different status values. H2 headings create named sections.

## Confirmed bug

A bug confirmed with reproduction steps and environment details.

{% preview source=true %}

{% bug id="RF-201" status="confirmed" severity="major" %}
# Showcase bleed breaks with overflow:hidden parent

## Steps to Reproduce
1. Create a feature section with a parent that has `overflow: hidden`
2. Add a showcase with `bleed="top"` inside the feature
3. Observe the rendered output

## Expected
Showcase extends above the section boundary with visible displacement.

## Actual
Showcase is clipped at the section edge.

## Environment
- Browser: Chrome 122, Firefox 124
- Theme: default
- refrakt.md: v0.4.2
{% /bug %}

{% /preview %}

## Critical bug

A critical severity bug requiring immediate attention.

{% preview source=true %}

{% bug id="RF-305" status="reported" severity="critical" %}
# Build fails when no rune packages configured

## Steps to Reproduce
1. Create a new refrakt project
2. Remove all entries from packages array
3. Run `npm run build`

## Expected
Build succeeds with only core runes.

## Actual
Build crashes with undefined reference error.
{% /bug %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Unique identifier (required) |
| `status` | `string` | `reported` | Current status: `reported`, `confirmed`, `in-progress`, `fixed`, `wontfix`, `duplicate` |
| `severity` | `string` | `major` | Impact level: `critical`, `major`, `minor`, `cosmetic` |
| `assignee` | `string` | — | Person or agent working on this |
| `milestone` | `string` | — | Milestone for the fix |
| `tags` | `string` | — | Comma-separated labels |
| `created` | `string` | `$file.created` | Creation date (ISO 8601). Auto-populated from git history |
| `modified` | `string` | `$file.modified` | Last modified date (ISO 8601). Auto-populated from git history |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
