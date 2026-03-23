{% work id="WORK-029" status="done" priority="medium" complexity="simple" tags="cli, plan" %}

# `plan init` and `plan create` Commands

> Ref: {% ref "SPEC-022" /%} (Plan CLI — `init` and `create` sections)

## Summary

Scaffolding commands that create plan directories and template files. `init` sets up the full plan structure in a new project. `create` scaffolds individual plan items from templates. Neither command needs the scanner — they only write files.

## Acceptance Criteria

- [x] `plan init` creates `plan/work/`, `plan/spec/`, `plan/decision/` directories
- [x] `plan init` generates example files (work item, decision, spec) and starter `index.md`
- [x] `plan init` appends workflow section to CLAUDE.md (or creates one) including `next`/`update`/`status` commands
- [x] `plan create work --id WORK-XXX --title "..."` scaffolds a work item from template
- [x] `plan create` supports all 5 types: work, bug, decision, spec, milestone
- [x] Templates include all required sections per `plan/CLAUDE.md` structure
- [x] Tests for directory creation, file generation, and template rendering

## Approach

Templates live in `runes/plan/src/templates/` as string constants (not separate files). Each template is a function that accepts attributes and returns a Markdoc string. `init` calls `create` internally for its example files.

## Dependencies

- {% ref "WORK-027" /%} (plugin architecture — so commands can be registered)

## References

- {% ref "SPEC-022" /%} (Plan CLI)
- `plan/CLAUDE.md` (required content structure)

{% /work %}
