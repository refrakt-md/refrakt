---
title: Spec
description: Specification document with status tracking, versioning, and cross-referencing
---

{% hint type="note" %}
This rune is part of **@refrakt-md/project**. Install with `npm install @refrakt-md/project` and add `"@refrakt-md/project"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Spec

Wraps a specification document, giving it status tracking, versioning, and entity registry integration. Specs are the source of truth for what the software should do. The body is intentionally freeform — specs vary widely in shape.

## Accepted specification

A spec in accepted status with a version number and scope summary.

{% preview source=true %}

{% spec id="SPEC-008" status="accepted" version="1.2" tags="tint,theming" %}
# Tint Rune

> Section-level colour context override via CSS custom properties.

## Problem

A page has a single colour context. Some sections need a different palette — a dark hero, a branded callout, a seasonal promotion. Currently there is no way to override colour tokens within a section scope.

## Solution

`tint` is a core rune that overrides colour tokens within its parent rune's scope. The identity transform reads tint definitions and injects CSS custom properties as inline styles on the container element.
{% /spec %}

{% /preview %}

## Draft specification

A minimal spec in draft status.

{% preview source=true %}

{% spec id="SPEC-012" status="draft" %}
# Dependency Graph Visualisation

> Render entity relationships as an interactive graph.

This spec is not yet written. It will cover the visual representation of cross-references between specs, work items, and decisions.
{% /spec %}

{% /preview %}

## Superseded specification

A spec that has been replaced by a newer version.

{% preview source=true %}

{% spec id="SPEC-003" status="superseded" version="1.0" supersedes="SPEC-001" %}
# Original Token System

> First-generation design token architecture.

This specification has been superseded. See the current token system specification for the active design.
{% /spec %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | — | Unique identifier, e.g. `SPEC-008` (required) |
| `status` | `string` | `draft` | Current status: `draft`, `review`, `accepted`, `superseded`, `deprecated` |
| `version` | `string` | — | Spec version, e.g. `1.0`, `1.2` |
| `supersedes` | `string` | — | ID of the spec this replaces |
| `tags` | `string` | — | Comma-separated labels |

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
