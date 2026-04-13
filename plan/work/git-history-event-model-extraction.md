{% work id="WORK-134" status="ready" priority="high" complexity="moderate" source="SPEC-038" tags="plan, cli, git, history" %}

# Event model types and per-entity git history extraction

Define the core TypeScript types for the git-native entity history system and implement the per-entity extraction algorithm that derives structured lifecycle events from git commits.

This is the foundational piece that all other SPEC-038 work items depend on. The extraction algorithm walks a file's git history, parses each version's attributes/criteria/resolution, and diffs consecutive snapshots to emit typed `HistoryEvent` objects.

## Acceptance Criteria

- [ ] `HistoryEvent` type defined with `kind` field: `created`, `attributes`, `criteria`, `resolution`, `content`
- [ ] `AttributeChange` type with `field`, `from`, `to` (nullable for add/remove)
- [ ] `CriteriaChange` type with `text` and `action` (`checked`, `unchecked`, `added`, `removed`)
- [ ] Per-entity extraction: runs `git log --follow` to get commit list for a file
- [ ] Per-entity extraction: runs `git show <hash>:<path>` to get file contents at each commit
- [ ] Attribute parsing: extracts opening Markdoc tag attributes from line 1 via regex
- [ ] Criteria parsing: collects `- [ ]` and `- [x]` checkbox lines from file content
- [ ] Resolution detection: detects `## Resolution` section appearance/modification
- [ ] Diff engine: walks commits oldest-to-newest, diffs consecutive snapshots, emits typed events
- [ ] Content fallback: emits `content` event when file changed but no structured diff detected
- [ ] Each event carries commit hash, date, author, and commit message
- [ ] Tests for attribute diffing (add, remove, change attributes)
- [ ] Tests for criteria diffing (check, uncheck, add, remove criteria)
- [ ] Tests for resolution detection
- [ ] Tests for content-only fallback events

## Approach

Create a new module `runes/plan/src/history.ts` with the extraction logic. The attribute parser is a simple regex on line 1 (`{% <type> key="value" ... %}`). The criteria parser collects checkbox lines. The diff engine walks pairs of consecutive versions.

Use `child_process.execSync` for git commands (matching existing patterns in `packages/content/src/timestamps.ts`). Parse git log output for commit metadata. For each commit, retrieve file contents via `git show`.

Export a `extractEntityHistory(filePath: string, planDir: string): HistoryEvent[]` function that other work items will consume.

## Dependencies

None — this is the foundational work item.

## References

- {% ref "SPEC-038" /%} — Git-Native Entity History (Event Model + Data Extraction sections)

{% /work %}
