---
title: Example Plan Data
description: Sample plan entities used to populate aggregation rune showcases
---

# Example Plan Entities

This page contains sample plan entities that populate the [backlog](/runes/plan/backlog), [decision log](/runes/plan/decision-log), [progress](/runes/plan/plan-progress), and [activity](/runes/plan/plan-activity) aggregation rune examples throughout this section.

---

{% work id="WORK-101" status="ready" priority="critical" complexity="moderate" milestone="v0.5.0" tags="core" %}
# Content model validation errors

Improve error messages when content model validation fails during transform. Current errors show internal node types instead of author-facing rune names.

## Acceptance Criteria
- [ ] Error messages include source file and line numbers
- [ ] Validation errors show expected vs actual structure
- [ ] Nested rune errors reference the parent rune context
{% /work %}

{% work id="WORK-102" status="ready" priority="high" complexity="simple" milestone="v0.5.0" tags="css" %}
# Token fallback chain for nested tints

When tint runes are nested, child tints should fall back to the parent tint value rather than the global default.

## Acceptance Criteria
- [ ] Nested tints inherit parent tint custom properties
- [ ] Fallback chain works three levels deep
{% /work %}

{% work id="WORK-103" status="ready" priority="medium" complexity="complex" milestone="v1.0" tags="docs" %}
# Interactive rune playground

Build a live editor where users can write Markdoc with runes and see the rendered output side by side.

## Acceptance Criteria
- [ ] Editor supports syntax highlighting for Markdoc
- [ ] Preview updates on every keystroke with debounce
- [ ] Errors display inline in the editor gutter
- [ ] Shareable URLs encode the editor content
{% /work %}

{% work id="WORK-104" status="in-progress" priority="high" complexity="moderate" milestone="v0.5.0" tags="transform" %}
# Heading level auto-detection for nested runes

When runes are nested, inner headings should auto-increment their level so the document outline remains valid.

## Acceptance Criteria
- [x] Engine tracks current heading depth during transform
- [x] Child rune headings offset by parent depth
- [ ] Inspector warns when manual heading levels conflict with auto-detection
{% /work %}

{% work id="WORK-105" status="in-progress" priority="medium" complexity="simple" tags="testing" %}
# Snapshot tests for identity transform output

Add snapshot tests that capture the full HTML output of the identity transform for each core rune.

## Acceptance Criteria
- [x] Snapshot test harness reads fixture .md files
- [ ] Snapshots cover all core rune variants
- [ ] CI fails on unexpected snapshot changes
{% /work %}

{% work id="WORK-106" status="done" priority="low" complexity="trivial" milestone="v0.4.0" tags="docs" %}
# Add copy button to code fences

Add a click-to-copy button to all code fence blocks in the documentation site.

## Acceptance Criteria
- [x] Copy button appears on hover
- [x] Clicking copies fence content to clipboard
- [x] Visual feedback confirms the copy action
{% /work %}

{% work id="WORK-107" status="draft" priority="medium" complexity="unknown" tags="planning" %}
# Theme marketplace architecture

Design the architecture for a theme marketplace where community themes can be published, discovered, and installed.

## Acceptance Criteria
- [ ] Architecture document covers package format, registry, and discovery
- [ ] Security model for third-party theme code defined
{% /work %}

{% work id="WORK-108" status="review" priority="high" complexity="complex" milestone="v0.5.0" tags="core,css" %}
# Responsive modifier system

Allow runes to accept responsive modifiers that change layout at different breakpoints.

## Acceptance Criteria
- [x] Engine parses responsive modifier syntax
- [x] Identity transform emits breakpoint-specific data attributes
- [x] CSS uses container queries for responsive behaviour
- [ ] Documentation covers responsive modifier usage
{% /work %}

{% bug id="BUG-101" status="confirmed" severity="critical" milestone="v0.5.0" %}
# Pipeline crashes on circular entity references

When two work items reference each other (e.g. WORK-A mentions WORK-B and vice versa), the relationship builder enters an infinite loop.

## Steps to Reproduce
1. Create two work items that reference each other by ID
2. Run the build

## Expected
Circular references produce a bidirectional "related" relationship.

## Actual
Build hangs indefinitely during the aggregate phase.
{% /bug %}

{% bug id="BUG-102" status="reported" severity="minor" %}
# Backlog card wraps awkwardly at narrow widths

At viewport widths below 400px, the backlog card header badges overlap the title text.

## Steps to Reproduce
1. Open a page with a backlog rune
2. Resize the browser below 400px

## Expected
Badges wrap below the title on small screens.

## Actual
Badges overlap the title text.
{% /bug %}

{% bug id="BUG-103" status="in-progress" severity="major" milestone="v0.5.0" %}
# Decision log ignores date filter

Passing `filter="date:2026-03"` to the decision-log rune returns all decisions instead of filtering to March 2026.

## Steps to Reproduce
1. Add decisions with varied dates
2. Use `{% decision-log filter="date:2026-03" /%}`

## Expected
Only decisions from March 2026 appear.

## Actual
All decisions appear regardless of date.
{% /bug %}

{% bug id="BUG-104" status="fixed" severity="cosmetic" milestone="v0.4.0" %}
# Plan progress bar label misaligned in Safari

The status count label in the plan-progress rune shifts 2px down in Safari compared to Chrome.

## Steps to Reproduce
1. Open a page with plan-progress in Safari
2. Compare with Chrome

## Expected
Identical alignment in both browsers.

## Actual
2px vertical offset in Safari.
{% /bug %}

{% spec id="SPEC-101" status="accepted" version="2.0" tags="tokens" %}
# Design Token Architecture

Specification for the two-tier design token system: global tokens and component tokens.

## Overview

Global tokens define the colour palette, spacing scale, and typographic scale. Component tokens map global tokens to specific rune parts. Themes override global tokens; rune configs may override component tokens.

## Token Naming

All tokens use the `--rf-` prefix followed by category and name: `--rf-color-primary`, `--rf-space-md`, `--rf-font-size-lg`.
{% /spec %}

{% spec id="SPEC-102" status="review" tags="pipeline" %}
# Cross-Package Entity References

Allow entities registered by one package to reference entities from another package.

## Problem

Currently, entity references (e.g. WORK-001 mentioning SPEC-002) only resolve within the same package's pipeline hooks. Cross-package references are ignored.

## Proposed Solution

Add a second pass in the pipeline's aggregate phase that resolves references across package boundaries using the shared EntityRegistry.
{% /spec %}

{% spec id="SPEC-103" status="draft" tags="editor" %}
# Block Editor Protocol

Define the protocol for structured editing of rune content in visual editors.

This specification is in early draft. It will define how editors discover rune schemas, present editing UI for rune attributes, and handle content model constraints.
{% /spec %}

{% decision id="ADR-101" status="accepted" date="2026-02-15" tags="architecture" %}
# Use pipeline hooks instead of plugin system

## Context
The content pipeline needs extensibility for community packages. Two approaches were considered: a plugin system with lifecycle events, or declarative pipeline hooks on the RunePackage interface.

## Decision
Pipeline hooks on RunePackage. Each package declares `register`, `aggregate`, and `postProcess` functions.

## Rationale
Hooks are simpler to implement, easier to test in isolation, and enforce a clear execution order. A plugin system would add indirection without meaningful flexibility gains at this stage.

## Consequences
- Packages cannot hook into arbitrary build phases
- Hook execution order is deterministic (package registration order)
- Adding new hook points requires a types package release
{% /decision %}

{% decision id="ADR-102" status="accepted" date="2026-01-20" tags="css" %}
# BEM naming convention for identity transform

## Context
The identity transform needs a consistent class naming strategy for rune output. Options: utility classes, CSS modules, or BEM.

## Decision
BEM with the `rf-` prefix: `.rf-{block}`, `.rf-{block}--{modifier}`, `.rf-{block}__{element}`.

## Rationale
BEM is framework-agnostic, human-readable in browser devtools, and allows themes to target specific rune parts without coupling to internal structure. The `rf-` prefix avoids collisions with user styles.

## Consequences
- Class names are verbose but predictable
- Themes can reliably target any rune element
- No build tooling required for class generation
{% /decision %}

{% decision id="ADR-103" status="proposed" date="2026-03-25" tags="pipeline" %}
# Lazy entity registration for large sites

## Context
Sites with thousands of plan entities experience slow builds because the register phase walks every page's full renderable tree. Most pages have zero plan entities.

## Options Considered
1. Walk all pages (current) — simple, O(pages * tree_depth)
2. Frontmatter hint — pages declare `has-plan-entities: true`, register skips others
3. AST-level index — build an index during parse phase, register reads the index

## Decision
Pending discussion. Leaning toward option 2 for simplicity.
{% /decision %}
