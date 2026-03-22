{% work id="WORK-028" status="ready" priority="high" complexity="moderate" tags="cli, plan" %}

# Plan File Scanner Library

> Ref: SPEC-022 (Plan CLI — Directory Discovery section)

## Summary

Shared library that scans directories for `.md` files containing plan runes, extracts structured data (ID, status, priority, title, tags, acceptance criteria, references), and returns typed objects. Used by `status`, `validate`, `update`, `next`, `serve`, and `build` commands.

The scanner doesn't use the full Markdoc pipeline — it does lightweight regex-based extraction of rune opening tags and key content sections. This keeps it fast and dependency-free.

## Acceptance Criteria

- [ ] Scans a directory recursively for `.md` files containing plan rune tags (`{% work`, `{% spec`, `{% bug`, `{% decision`, `{% milestone`)
- [ ] Extracts rune type, ID, and all attributes from the opening tag line
- [ ] Extracts title from the first H1 heading
- [ ] Extracts acceptance criteria checkboxes (`- [ ]` / `- [x]`) with text and checked state
- [ ] Extracts reference IDs from References/Dependencies sections
- [ ] Returns typed `PlanEntity[]` with all extracted fields and file path
- [ ] Handles all 5 rune types: spec, work, bug, decision, milestone
- [ ] Tests for scanning, attribute extraction, criteria parsing, and edge cases (malformed files, nested runes)

## Approach

Create `runes/plan/src/scanner.ts` exporting a `scanPlanFiles(dir: string): PlanEntity[]` function. Use `fs.readdirSync` recursively, read each `.md` file, regex-match `{% (work|spec|bug|decision|milestone) ` for rune detection, then parse the opening tag attributes and key content sections.

Add `PlanEntity` type to `runes/plan/src/types.ts`.

## Dependencies

- WORK-027 (plugin architecture — so scanner has a package to live in)

## References

- SPEC-022 (Plan CLI)

{% /work %}
