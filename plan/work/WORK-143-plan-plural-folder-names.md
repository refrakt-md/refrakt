{% work id="WORK-143" status="done" priority="medium" complexity="simple" source="SPEC-039" tags="plan, cli, conventions" %}

# Rename plan directories to plural form

Change the plan package's directory convention from singular to plural: `spec/` to `specs/`, `decision/` to `decisions/`, `milestone/` to `milestones/`. Keep `work/` unchanged (collective noun).

## Acceptance Criteria

- [x] `plan init` creates `specs/`, `work/`, `decisions/`, `milestones/` directories
- [x] `plan create` writes files to the correct plural directories
- [x] Status filter pages and type index pages use the new directory names
- [x] `TYPE_DIRS` mapping in `create.ts` updated
- [x] `STATUS_PAGES` in `templates.ts` updated with new `typeDir` values
- [x] `TYPE_TITLES` in `templates.ts` updated
- [x] `init.ts` directory list updated
- [x] `plan/INSTRUCTIONS.md` (or `plan/CLAUDE.md` until WORK-142 lands) documents the new structure
- [x] Root `CLAUDE.md` plan section updated to reflect new directory names
- [x] Our own `plan/` directory renamed manually (`spec/` to `specs/`, `decision/` to `decisions/`, `milestone/` to `milestones/`)
- [x] All internal links in existing plan content updated (e.g., index.md links to subdirectories)
- [x] Scanner still finds entities correctly after rename (it scans recursively, but verify)

## Approach

This is a straightforward find-and-replace across a small number of files. The scanner (`scanner.ts`) scans recursively from the plan root so it doesn't care about directory names — no changes needed there.

### Files to modify in `runes/plan/src/`

- `commands/init.ts` — `const dirs = ['work', 'specs', 'decisions', 'milestones']` and example file paths
- `commands/create.ts` — `TYPE_DIRS` mapping: `spec: 'specs'`, `decision: 'decisions'`, `milestone: 'milestones'`
- `commands/templates.ts` — `STATUS_PAGES[].typeDir` entries and `TYPE_TITLES` keys

### Files to update in docs

- `CLAUDE.md` (root) — directory layout section
- `plan/CLAUDE.md` — directory layout section (or `plan/INSTRUCTIONS.md` if WORK-142 lands first)
- `site/content/runes/plan/index.md` — directory structure references
- `site/content/runes/plan/cli.md` — directory paths in command examples
- `site/content/runes/plan/workflow.md` — directory layout references

### Manual migration of our own content

Rename directories and update any hardcoded paths in index/status pages:
```bash
cd plan
git mv spec specs
git mv decision decisions
git mv milestone milestones
```

Then update links in `plan/index.md` and any status filter pages that reference sibling directories.

## Dependencies

- Ideally lands after {% ref "WORK-142" /%} so the docs update targets `INSTRUCTIONS.md` rather than `CLAUDE.md`, but not strictly blocking

## References

- {% ref "SPEC-039" /%} — parent spec

## Resolution

Completed: 2026-04-14

Branch: `claude/plan-package-review-Z4sJE`

### What was done
- Updated `init.ts`: directory list, example subDirs, index.md links, INSTRUCTIONS_CONTENT
- Updated `create.ts`: TYPE_DIRS mapping (spec→specs, decision→decisions, milestone→milestones)
- Updated `templates.ts`: STATUS_PAGES typeDir values and TYPE_TITLES keys
- Updated `init.test.ts`: all directory path assertions
- Renamed our own plan directories: spec/→specs/, decision/→decisions/, milestone/→milestones/
- Updated site docs: index.md, cli.md, workflow.md directory references
- Updated root CLAUDE.md and plan/INSTRUCTIONS.md
- Scanner confirmed working (scans recursively, directory names don't matter)
- 51 tests passing (init + create)

### Notes
- work/ stays singular — collective noun, "works" is awkward
- No migration command needed since we're the only users

{% /work %}
