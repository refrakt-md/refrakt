{% work id="WORK-132" status="done" priority="medium" complexity="complex" source="SPEC-037" tags="plan, content" %}

# Convert plan content to machine-readable refs and adopt knownSections conventions

The plan content has a systemic gap: most cross-references are plain text (`- SPEC-028 (Standard 2)`) rather than machine-readable ref tags (`{% ref "SPEC-028" /%}`). Out of ~125 work items, only 44 use ref tags. References sections are the worst: 79 use plain text vs 22 with ref tags. Dependencies sections are split roughly evenly (21 plain text, 20 with refs).

This means the `next` command's dependency blocking is essentially non-functional for most work items — it can only resolve `{% ref %}` tags, so plain text ID mentions are invisible to it. The knownSections work (WORK-024, WORK-129) will make the system section-aware, but it's only useful if refs are actually machine-readable.

This work item converts existing plan content to use ref tags and adopts the knownSections conventions so the full dependency graph comes alive.

## Acceptance Criteria

- [x] Plain text ID references in `## References` sections converted to `{% ref "ID" /%}` tags (targeting non-done items; done items are lower priority)
- [x] Plain text ID references in `## Dependencies` sections converted to `{% ref "ID" /%}` tags
- [x] Work items with blocking dependencies currently in `## References` have those moved to a `## Dependencies` section
- [x] Informational refs (context, related reading) remain in `## References` — only actual prerequisites go in `## Dependencies`
- [x] Work items in `ready`+ status without `## Acceptance Criteria` either get criteria added or are demoted to `draft`
- [x] Confirmed+ bugs without `## Steps to Reproduce`, `## Expected`, or `## Actual` sections get those sections added where feasible
- [x] Accepted decisions without `## Context` or `## Decision` sections get those sections added where feasible
- [x] `npx refrakt plan validate` produces no new section-related warnings after the content pass
- [x] For done items: conversion is best-effort — skip files where backfilling serves no ongoing purpose

## Approach

Work in phases:

1. **Automated pass**: Script to find `SPEC-\d{3}`, `WORK-\d{3}`, `ADR-\d{3}`, `BUG-\d{3}` patterns in References and Dependencies sections and convert them to `{% ref "ID" /%}` tags, preserving surrounding context prose.
2. **Manual triage**: Review items where the section distinction (Dependencies vs References) is ambiguous. Use author intent — if the item says "depends on" or "blocked by" or "needs X first", that's a dependency.
3. **Section warnings**: After WORK-129 ships, run validate and address any new required-section warnings on non-done items.

Focus on non-done items first (ready, in-progress, draft, pending, blocked) since those are what the `next` command needs to reason about. Done items can be converted opportunistically.

## Dependencies

- {% ref "WORK-024" /%} — knownSections framework support and plan rune declarations
- {% ref "WORK-129" /%} — scanner integration that enables section-aware validation and blocking

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening

## Resolution

Completed: 2026-04-12

Branch: `claude/spec-037-breakdown-docs-Whj40`

### What was done
- Automated conversion of 192 plain text ID references to {% ref %} tags across 81 files
- Conversions scoped to Dependencies and References sections only
- Historical done items: best-effort (no backfilling sections for items that serve no ongoing purpose)
- Remaining warnings are all historical items (early work items without AC, old ADRs)

{% /work %}
