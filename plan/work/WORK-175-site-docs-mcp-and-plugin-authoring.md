{% work id="WORK-175" status="draft" priority="medium" complexity="moderate" tags="docs, mcp, plugins" source="SPEC-043" milestone="v0.11.0" %}

# Site docs — MCP + plugin authoring update + CLAUDE.md pointer

Document the new `@refrakt-md/mcp` server (registration, tool reference, resource reference) at `site/content/docs/mcp/`, update the existing plugin authoring docs to cover the new `cli-plugin` schema fields (`inputSchema`, `outputSchema`, `mcpHandler`), and add a brief pointer in the root `CLAUDE.md` so AI agents know the MCP server exists when registered.

## Acceptance Criteria

- [ ] New `site/content/docs/mcp/` directory with:
  - `overview.md` — what the MCP server is, when to use it, the auto-detection model
  - `installation.md` — registering with Claude Desktop, Claude Code, and other MCP clients
  - `tools.md` — full tool reference (core + plan), generated or hand-written
  - `resources.md` — full resource reference (`refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/*`, `refrakt://plan/*`)
  - `errors.md` — error envelope shape, error codes, how agents should react
- [ ] `site/content/docs/packages/authoring.md` (or wherever package authoring lives) updated with a "Making your commands MCP-friendly" section covering `inputSchema`, `outputSchema`, `mcpHandler`
- [ ] Root `CLAUDE.md` gets a short paragraph (≤5 lines) under a new `## MCP Server` heading explaining that `@refrakt-md/mcp` exists, what it exposes, and how to know if it's available
- [ ] Cross-references between MCP docs and the configuration docs (WORK-174) for `--cwd` and detection behavior
- [ ] Docs site builds cleanly

## Approach

1. Mirror the structure of existing docs sections under `site/content/docs/`.

2. Tool/resource references can be hand-written for v1; future work might generate them from the source if maintenance becomes a burden.

3. The CLAUDE.md addition should be neutral — agents read it whether or not the MCP server is actually registered, so it should describe the server's existence and capability without assuming it's available.

## Dependencies

- {% ref "WORK-169" /%}, {% ref "WORK-170" /%} — docs need real tools and resources to describe
- {% ref "WORK-167" /%} — plan command schemas should be stable for the tool reference
- {% ref "WORK-174" /%} — configuration docs that this section cross-references

## References

- {% ref "SPEC-043" /%} — Refrakt MCP Server (full surface)
- `CLAUDE.md` — root-level instructions to extend
- `site/content/docs/packages/authoring.md` — plugin authoring guide

{% /work %}
