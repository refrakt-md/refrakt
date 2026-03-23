{% work id="WORK-028" status="ready" priority="high" complexity="moderate" tags="cli, plan" %}

# Plan File Scanner Library

> Ref: SPEC-022 (Plan CLI — Directory Discovery section)

## Summary

Shared library that scans directories for `.md` files containing plan runes, extracts structured data (ID, status, priority, title, tags, acceptance criteria, references), and returns typed objects. Used by `status`, `validate`, `update`, `next`, `serve`, and `build` commands.

The scanner uses Markdoc's parser (`Markdoc.parse()`) to extract tag nodes and their attributes from the AST, ensuring it stays in sync with the actual rune syntax. Lightweight text parsing is used only for content that Markdoc doesn't model — checkbox lists and heading text.

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

Create `runes/plan/src/scanner.ts` exporting a `scanPlanFiles(dir: string): PlanEntity[]` function. Use `fs.readdirSync` recursively, read each `.md` file, run `Markdoc.parse()` to get the AST, then walk the AST for tag nodes matching plan rune names (`work`, `spec`, `bug`, `decision`, `milestone`). Extract attributes directly from the parsed tag nodes — no regex needed for tag syntax. For content sections (acceptance criteria checkboxes, H1 title, reference lists), use lightweight text parsing since these are inline Markdown constructs that Markdoc's AST doesn't decompose further. This approach keeps the scanner coupled to Markdoc's parser (the source of truth for tag syntax) rather than duplicating parsing logic via regex.

Add `PlanEntity` type to `runes/plan/src/types.ts`.

## Dependencies

None — the scanner is a pure library with no CLI integration

## References

- SPEC-022 (Plan CLI)

{% /work %}
