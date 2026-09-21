{% work id="WORK-581" status="done" priority="medium" complexity="simple" milestone="v0.36.0" source="SPEC-135" tags="mcp, validation, agents" pr="refrakt-md/refrakt#629" %}

# An refrakt_validate MCP tool returning structured findings

The MCP surface has `plan_validate` and no content equivalent — which is exactly
the gap an agent falls into. It can check the plan graph it just edited, and not
the content.

## Why this is more than convenience here

This project's author population is unusual: the plan directory is
agent-authored and the documentation is agent-edited. An agent that can check
its own content in a second, with structured findings rather than scraped
stderr, is a materially different authoring loop from one that must run a build
and parse text.

It is also the third caller of the same validation function — build, CLI, MCP —
which is the shape {% ref "SPEC-135" /%} D5 exists to produce.

## Acceptance Criteria

- [x] `refrakt_validate` is registered on the MCP server with typed inputs mirroring the CLI: site, only, deep
- [x] It returns findings as structured data — file, line, severity, error id, message — not a rendered report
- [x] It calls the same function {% ref "WORK-578" /%} calls; no second implementation and no shelling out to the CLI
- [x] Findings carry enough location detail for a caller to open the right file at the right line without guessing
- [x] The tool's description states that the default tier is per-page and `deep` adds cross-page checks, so a caller can choose knowingly
- [x] Docs list it alongside the other `refrakt.*` tools in CLAUDE.md's substitution table

## Approach

Thin over {% ref "WORK-578" /%}. The work is the binding and the input schema,
not the validation.

**Return findings, not the CLI's output.** A tool that returns formatted text is
a worse CLI — the point of the tool is that a caller can filter, count and act
on individual findings. This is {% ref "SPEC-135" /%} D6, and it is the one
thing here worth being strict about.

Worth deciding while implementing: what happens on a site with hundreds of
findings. A cap with a "and N more" count is probably right; unbounded output
is not.

## Blocked by

- {% ref "WORK-578" /%} — mirrors its surface and calls its function

## References

- {% ref "SPEC-135" /%} — D6 (structured findings, not text), D5 (one function, several callers)
- `plugins/plan/src/mcp-bindings.ts` — the binding pattern to follow
- `packages/mcp/` — the server this registers on

## Resolution

Completed: 2026-09-21

Branch: `claude/work-581-mcp-validate`

### What was done

- `packages/cli/src/commands/validate-core.ts` — the validation run, extracted
  from the command. Returns data; never prints, never calls `process.exit`.
- `packages/cli/src/commands/validate.ts` — reduced to formatting and an exit
  code over that function.
- `packages/cli/package.json` — new `./validate.js` subpath export.
- `packages/mcp/src/tools/core.ts` — `refrakt.validate`, with typed inputs
  mirroring the CLI (`site`, `only`, `deep`, `configPath`) plus `limit`.
- `CLAUDE.md` — added to the MCP substitution table with a note on the tiers.

### The extraction was required, not tidying

The acceptance criterion says the tool must call the same function the CLI
calls, with "no second implementation and **no shelling out to the CLI**".
Every other `refrakt.*` tool in `core.ts` shells out and parses stdout, so
following the local pattern would have violated the criterion.

`@refrakt-md/mcp` already depends on `@refrakt-md/cli`, so the fix was to give
the run a home that returns data and export it. The CLI command is now
presentation over the same call the tool makes.

### Bounded output, decided while implementing

The item flagged "what happens on a site with hundreds of findings" as worth
deciding. Capped at 200 per site by default, with `contentTruncated` carrying
the count that was dropped, and `limit` to override. Unbounded output is not
useful to a caller and a silent truncation is worse than a counted one.

### Verified

Called through the registered tool against this repo and against scaffolded
fixtures:

| Case | Result |
|---|---|
| clean repo, `site: 'main'` | `ok: true`, no findings |
| planted undefined tag | `ok: false`, `{file, url, line: 162, severity, id, message}` |
| `only: 'config'` | content layer empty, `ok: true` |
| `limit: 5` against 12 findings | 5 returned, `contentTruncated: 7` |
| no config | `ok: false`, error, `sites: []` |
| unresolvable plugin | `contentSuppressed` explains the skip |

9 new MCP tests; the existing `declares the expected core tools` assertion
updated for the new entry. 4,639 tests pass.

{% /work %}
