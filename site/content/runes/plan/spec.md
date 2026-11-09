---
title: Spec
description: Specification document with status tracking, versioning, and cross-referencing
category: Plan
plugin: plan
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:spec"} /%}

Wraps a specification document, giving it status tracking, versioning, and entity registry integration. Specs are the source of truth for what the software should do. The body is intentionally freeform — specs vary widely in shape.

## Accepted specification

A spec in accepted status with a version number and scope summary.

{% preview source=true %}

	{% spec id="SPEC-9008" status="accepted" version="1.2" tags="tint,theming" %}
	# Tint Rune

	Section-level colour context override via CSS custom properties.

	## Problem

	A page has a single colour context. Some sections need a different palette — a dark hero, a branded callout, a seasonal promotion. Currently there is no way to override colour tokens within a section scope.

	## Solution

	`tint` sets the colours of the rune it is placed in. An author names one of the theme's tints, or gives colours inline, and everything inside the rune uses them.
	{% /spec %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | The spec's title |
| The paragraphs right after it | The spec's summary |
| Everything after them | The body, in the order written |

## Draft specification

A minimal spec in draft status.

{% preview source=true %}

	{% spec id="SPEC-9012" status="draft" %}
	# Dependency Graph Visualisation

	Render entity relationships as an interactive graph.

	This spec is not yet written. It will cover the visual representation of cross-references between specs, work items, and decisions.
	{% /spec %}

{% /preview %}

## Superseded specification

A spec that has been replaced by a newer version.

{% preview source=true %}

	{% spec id="SPEC-9003" status="superseded" version="1.0" supersedes="SPEC-9001" %}
	# Original Token System

	First-generation design token architecture.

	This specification has been superseded. See the current token system specification for the active design.
	{% /spec %}

{% /preview %}

### Lifecycle: accepted → implemented → shipped

`accepted` means the team agreed to build the spec. Two further states close the loop between agreement and availability:

- **`implemented`** — every work item that `source`s this spec is `done` and the code is in `main`. `refrakt plan status` suggests this flip once all linked work is done.
- **`shipped`** — released to users in an npm version. Pair it with `released-in="vX.Y.Z"`; `plan validate` errors on a shipped spec that lacks it.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:spec"} /%}
