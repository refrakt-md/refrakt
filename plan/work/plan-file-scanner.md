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
- [ ] Extracts reference IDs from `{% xref %}` / `{% ref %}` tag nodes in the AST (no plain-text ID parsing needed)
- [ ] Returns typed `PlanEntity[]` with all extracted fields and file path
- [ ] Handles all 5 rune types: spec, work, bug, decision, milestone
- [ ] Supports mtime-based caching: skips re-parsing files whose mtime hasn't changed since the last scan, using a `.plan-cache.json` file in the scan directory
- [ ] Cache is invalidated per-file (stale entries for deleted files are pruned on each scan)
- [ ] Tests for scanning, attribute extraction, criteria parsing, caching behaviour, and edge cases (malformed files, nested runes)

## Approach

Create `runes/plan/src/scanner.ts` exporting a `scanPlanFiles(dir: string): PlanEntity[]` function. Use `fs.readdirSync` recursively, read each `.md` file, run `Markdoc.parse()` to get the AST, then walk the AST for tag nodes matching plan rune names (`work`, `spec`, `bug`, `decision`, `milestone`). Extract attributes directly from the parsed tag nodes — no regex needed for tag syntax. Cross-references are extracted by walking the AST for `xref`/`ref` tag nodes (self-closing inline tags with a `primary` attribute containing the target ID) — no text parsing needed for references. For content sections (acceptance criteria checkboxes, H1 title), use lightweight text parsing since these are inline Markdown constructs that Markdoc's AST doesn't decompose further. This approach keeps the scanner coupled to Markdoc's parser (the source of truth for tag syntax) rather than duplicating parsing logic via regex.

Add `PlanEntity` and `ScanCache` types to `runes/plan/src/types.ts`.

The scan function accepts an optional `cache` parameter. When enabled, it reads `.plan-cache.json` from the scan directory on startup, compares each file's `mtime` against the cached entry, and only re-parses files that have changed. After scanning, the updated cache is written back. Deleted files are pruned from the cache automatically. The cache stores the full `PlanEntity` data per file path, keyed by path with `mtime` and `size` for invalidation.

## Dependencies

- WORK-021 (xref migration — so plan files use `{% xref %}`/`{% ref %}` tags that the scanner can extract from the AST)

## References

- SPEC-022 (Plan CLI)

{% /work %}
