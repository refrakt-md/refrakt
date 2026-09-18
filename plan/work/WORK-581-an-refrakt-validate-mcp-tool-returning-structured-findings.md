{% work id="WORK-581" status="ready" priority="medium" complexity="simple" milestone="v0.36.0" source="SPEC-135" tags="mcp, validation, agents" %}

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

- [ ] `refrakt_validate` is registered on the MCP server with typed inputs mirroring the CLI: site, only, deep
- [ ] It returns findings as structured data — file, line, severity, error id, message — not a rendered report
- [ ] It calls the same function {% ref "WORK-578" /%} calls; no second implementation and no shelling out to the CLI
- [ ] Findings carry enough location detail for a caller to open the right file at the right line without guessing
- [ ] The tool's description states that the default tier is per-page and `deep` adds cross-page checks, so a caller can choose knowingly
- [ ] Docs list it alongside the other `refrakt.*` tools in CLAUDE.md's substitution table

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

{% /work %}
