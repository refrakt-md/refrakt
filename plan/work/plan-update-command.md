{% work id="WORK-030" status="done" priority="high" complexity="moderate" tags="cli, plan, ai-workflow" source="SPEC-022" %}

# `plan update` Command

> Ref: {% ref "SPEC-022" /%} (Plan CLI — `update` section, AI Agent Integration section)

## Summary

In-place editing of plan file attributes and acceptance criteria checkboxes. This is the highest-value command for AI agent workflows — it enables structured status transitions (`refrakt plan update {% ref "WORK-020" /%} --status in-progress`) and criterion tracking (`refrakt plan update {% ref "WORK-020" /%} --check "Schema validates"`) without manually editing Markdoc files.

## Acceptance Criteria

- [x] Finds entity file by ID scan (using scanner from {% ref "WORK-028" /%})
- [x] `--status <status>` edits the rune tag's status attribute in place
- [x] `--check "text"` toggles `- [ ]` to `- [x]` for matching criterion (substring match)
- [x] `--uncheck "text"` toggles `- [x]` to `- [ ]`
- [x] Validates attribute values against rune schema (rejects invalid statuses like `--status working`)
- [x] Multiple flags combine in a single call (`--status in-progress --assignee claude --milestone v0.5.0`)
- [x] `--format json` outputs structured change summary with old and new values
- [x] Reports error on ambiguous criterion match (multiple lines match substring)
- [x] Exit codes: 0 = success, 1 = validation error, 2 = entity not found
- [x] Tests for attribute editing, checkbox toggling, validation, ambiguity detection, and error cases

## Approach

Use the scanner ({% ref "WORK-028" /%}) to find the file by ID. Read the file content as a string. For attribute changes, regex-replace the opening tag line to update the target attribute. For checkbox toggling, find the matching `- [ ]` or `- [x]` line by substring and flip the bracket. Write the modified string back to the same file.

Validation uses the rune schema's attribute enum values (already defined in `runes/plan/src/tags/`).

## Dependencies

- {% ref "WORK-027" /%} (plugin architecture)
- {% ref "WORK-028" /%} (plan file scanner)

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}
