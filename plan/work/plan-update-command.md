{% work id="WORK-030" status="ready" priority="high" complexity="moderate" tags="cli, plan, ai-workflow" %}

# `plan update` Command

> Ref: SPEC-022 (Plan CLI — `update` section, AI Agent Integration section)

## Summary

In-place editing of plan file attributes and acceptance criteria checkboxes. This is the highest-value command for AI agent workflows — it enables structured status transitions (`refrakt plan update WORK-020 --status in-progress`) and criterion tracking (`refrakt plan update WORK-020 --check "Schema validates"`) without manually editing Markdoc files.

## Acceptance Criteria

- [ ] Finds entity file by ID scan (using scanner from WORK-028)
- [ ] `--status <status>` edits the rune tag's status attribute in place
- [ ] `--check "text"` toggles `- [ ]` to `- [x]` for matching criterion (substring match)
- [ ] `--uncheck "text"` toggles `- [x]` to `- [ ]`
- [ ] Validates attribute values against rune schema (rejects invalid statuses like `--status working`)
- [ ] Multiple flags combine in a single call (`--status in-progress --assignee claude --milestone v0.5.0`)
- [ ] `--format json` outputs structured change summary with old and new values
- [ ] Reports error on ambiguous criterion match (multiple lines match substring)
- [ ] Exit codes: 0 = success, 1 = validation error, 2 = entity not found
- [ ] Tests for attribute editing, checkbox toggling, validation, ambiguity detection, and error cases

## Approach

Use the scanner (WORK-028) to find the file by ID. Read the file content as a string. For attribute changes, regex-replace the opening tag line to update the target attribute. For checkbox toggling, find the matching `- [ ]` or `- [x]` line by substring and flip the bracket. Write the modified string back to the same file.

Validation uses the rune schema's attribute enum values (already defined in `runes/plan/src/tags/`).

## Dependencies

- WORK-027 (plugin architecture)
- WORK-028 (plan file scanner)

## References

- SPEC-022 (Plan CLI)

{% /work %}
