{% work id="WORK-129" status="done" priority="medium" complexity="moderate" source="SPEC-037" tags="plan, cli, content-model" %}

# knownSections scanner integration: section-scoped refs and validation

Once knownSections are declared in the plan rune content models (WORK-024), the scanner and validator need to become section-aware. Today, refs are extracted from the entire file without knowing which section they belong to. With knownSections, refs get tagged with their canonical section name, enabling the `next` command to distinguish blocking dependencies from informational references.

## Acceptance Criteria

- [x] Scanner extracts refs with their canonical section name (e.g., refs in "Dependencies" section tagged as dependency refs)
- [x] Alias resolution maps "Deps", "Depends On", "Blocked By", "Requires" to the canonical "Dependencies" section
- [x] Known section presence is reported per entity (which known sections are present/missing, using canonical names)
- [x] `validate` warns when a `ready`+ work item has no Acceptance Criteria section
- [x] `validate` warns when a `confirmed`+ bug has no Steps to Reproduce, Expected, or Actual section
- [x] `validate` warns when an accepted decision has no Context or Decision section
- [x] `next` command only treats refs in the Dependencies section as blockers (refs in References/Approach/etc. are informational)
- [x] Backward compatibility: files without known section headings continue working (all refs treated as potential blockers, same as today)
- [x] Tests for section-scoped ref extraction, alias resolution, and section-aware blocking

## Dependencies

- {% ref "WORK-024" /%} — knownSections framework support and plan rune declarations must ship first

## References

- {% ref "SPEC-037" /%} — Plan Package Hardening (Part 3: scanner integration, dependency resolution)
- {% ref "SPEC-003" /%} — Declarative Content Model (knownSections design)

## Resolution

Completed: 2026-04-12

Branch: `claude/spec-037-breakdown-docs-Whj40`

### What was done
- Added ScopedRef type and extractScopedRefs() to scanner
- Scanner now reports knownSectionsPresent per entity
- Validate checks required sections: AC for ready+ work, Steps/Expected/Actual for confirmed+ bugs, Context/Decision for accepted decisions
- Next command uses section-aware blocking via knownSectionsPresent
- 13 new tests across scanner, validate, and next test files

{% /work %}
