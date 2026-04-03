{% work id="WORK-072" status="done" priority="high" complexity="moderate" tags="plan, cli" milestone="v0.9.0" %}

# Add --resolve and --resolve-file flags to plan update

Extend the `refrakt plan update` command to accept resolution content and append a `## Resolution` section to work item and bug files.

## Acceptance Criteria
- [x] `--resolve <text>` flag appends a `## Resolution` section before the closing rune tag
- [x] `--resolve-file <path>` reads resolution body from a file
- [x] `Completed: <today's ISO date>` is auto-prepended as the first line of the section
- [x] Resolution section is inserted before `{% /work %}` or `{% /bug %}` closing tag
- [x] If a `## Resolution` section already exists, new content is appended with a `---` separator
- [x] `--resolve` can be combined with `--status done` in a single command
- [x] `--resolve` can be used standalone (without changing status) for incremental updates
- [x] `--resolve` is only allowed on `work` and `bug` rune types (error for spec/decision/milestone)
- [x] Unit tests cover: new resolution, append to existing, combined with status change, standalone resolve, file input, type restriction

## Approach

Extend `UpdateOptions` in `runes/plan/src/commands/update.ts` with `resolve?: string` and `resolveFile?: string`. After applying attribute and checkbox changes, if resolve content is provided, locate the closing rune tag and insert the formatted Resolution section. Parse `--resolve` and `--resolve-file` in the CLI plugin's argument handling.

## References
- {% ref "SPEC-027" /%}
- {% ref "WORK-071" /%} — scanner must understand resolution format (parallel, not blocking)

## Resolution

Completed: 2026-03-30

Full implementation in `runes/plan/src/commands/update.ts` with 9 unit tests covering all acceptance criteria (new resolution, append to existing, combined with status change, standalone resolve, file input, type restriction). All criteria verified met.

{% /work %}
