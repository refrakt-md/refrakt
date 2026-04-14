{% work id="WORK-143" status="ready" priority="medium" complexity="simple" source="SPEC-039" tags="plan, cli, conventions" %}

# Rename plan directories to plural form

Change the plan package's directory convention from singular to plural: `spec/` to `specs/`, `decision/` to `decisions/`, `milestone/` to `milestones/`. Keep `work/` unchanged (collective noun).

## Acceptance Criteria

- [ ] `plan init` creates `specs/`, `work/`, `decisions/`, `milestones/` directories
- [ ] `plan create` writes files to the correct plural directories
- [ ] Status filter pages and type index pages use the new directory names
- [ ] `TYPE_DIRS` mapping in `create.ts` updated
- [ ] `STATUS_PAGES` in `templates.ts` updated with new `typeDir` values
- [ ] `TYPE_TITLES` in `templates.ts` updated
- [ ] `init.ts` directory list updated
- [ ] `plan/INSTRUCTIONS.md` (or `plan/CLAUDE.md` until WORK-142 lands) documents the new structure
- [ ] Root `CLAUDE.md` plan section updated to reflect new directory names
- [ ] Our own `plan/` directory renamed manually (`spec/` to `specs/`, `decision/` to `decisions/`, `milestone/` to `milestones/`)
- [ ] All internal links in existing plan content updated (e.g., index.md links to subdirectories)
- [ ] Scanner still finds entities correctly after rename (it scans recursively, but verify)

## Approach

This is a straightforward find-and-replace across a small number of files. The scanner (`scanner.ts`) scans recursively from the plan root so it doesn't care about directory names — no changes needed there.

### Files to modify in `runes/plan/src/`

- `commands/init.ts` — `const dirs = ['work', 'specs', 'decisions', 'milestones']` and example file paths
- `commands/create.ts` — `TYPE_DIRS` mapping: `spec: 'specs'`, `decision: 'decisions'`, `milestone: 'milestones'`
- `commands/templates.ts` — `STATUS_PAGES[].typeDir` entries and `TYPE_TITLES` keys

### Files to update in docs

- `CLAUDE.md` (root) — directory layout section
- `plan/CLAUDE.md` — directory layout section (or `plan/INSTRUCTIONS.md` if WORK-142 lands first)

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

{% /work %}
