{% work id="WORK-175" status="done" priority="medium" complexity="moderate" tags="docs, mcp, plugins" source="SPEC-043" milestone="v0.11.0" %}

# Site docs — MCP + plugin authoring update + CLAUDE.md pointer

Document the new `@refrakt-md/mcp` server (registration, tool reference, resource reference) at `site/content/docs/mcp/`, update the existing plugin authoring docs to cover the new `cli-plugin` schema fields (`inputSchema`, `outputSchema`, `mcpHandler`), and add a brief pointer in the root `CLAUDE.md` so AI agents know the MCP server exists when registered.

## Acceptance Criteria

- [x] New `site/content/docs/mcp/` directory with:
  - `overview.md` — what the MCP server is, when to use it, the auto-detection model
  - `installation.md` — registering with Claude Desktop, Claude Code, and other MCP clients
  - `tools.md` — full tool reference (core + plan), generated or hand-written
  - `resources.md` — full resource reference (`refrakt://detect`, `refrakt://reference`, `refrakt://contracts`, `refrakt://rune/*`, `refrakt://plan/*`)
  - `errors.md` — error envelope shape, error codes, how agents should react
- [x] `site/content/docs/packages/authoring.md` (or wherever package authoring lives) updated with a "Making your commands MCP-friendly" section covering `inputSchema`, `outputSchema`, `mcpHandler`
- [x] Root `CLAUDE.md` gets a short paragraph (≤5 lines) under a new `## MCP Server` heading explaining that `@refrakt-md/mcp` exists, what it exposes, and how to know if it's available
- [x] Cross-references between MCP docs and the configuration docs (WORK-174) for `--cwd` and detection behavior
- [x] Docs site builds cleanly

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

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `site/content/docs/mcp/` (new) — 5 pages covering the MCP server end-to-end:
  - `overview.md` — what the server provides, auto-detection (plan / sites / both / neither), excluded commands, why use it over plain CLI invocation.
  - `installation.md` — Claude Desktop, Claude Code, Cursor registration; `--cwd` for clients that launch from outside the project; verification via JSON-RPC handshake; troubleshooting.
  - `tools.md` — full reference for the 6 core tools (refrakt.detect, refrakt.plugins_list, refrakt.reference, refrakt.contracts, refrakt.inspect, refrakt.inspect_list) plus the plugin-tool registration mechanism, mcpHandler vs argv-shimming, site-scoped tool inputs.
  - `resources.md` — static + templated URI scheme (refrakt://detect, refrakt://reference, refrakt://contracts, refrakt://rune/<name>, refrakt://plan/index, refrakt://plan/<type>/<id>, refrakt://plan/status), conditional exposure, multi-site disambiguation, tools-vs-resources guidance.
  - `errors.md` — tool error envelope shape with errorCode + hint, resource error format, full error code table, multi-site ambiguity and unknown-site patterns, agent recovery patterns starting with refrakt.detect.
- `site/content/docs/packages/authoring.md` — Added "Adding CLI Commands and MCP Tools" section covering: minimal cli-plugin export, MCP-friendly extensions (inputSchema, outputSchema, mcpHandler), example showing argv handler + mcpHandler sharing a runX(opts) function, linting via `refrakt package validate`, exclusion patterns for commands that don't fit MCP.
- `CLAUDE.md` (root) — Added a 3-line "## MCP Server" section near the top explaining the package exists, pointing at `refrakt.detect` / `refrakt.plugins_list` for inspection, and linking to `site/content/docs/mcp/` for the full reference.
- `site/content/docs/_layout.md` — Added an "MCP Server" section to the docs nav listing all 5 new pages.

### Notes

- All internal links between MCP and configuration docs use `/docs/<section>/<slug>` paths and were verified by a clean site prerender (153 pages, no broken-link errors — was 148 before, +5 MCP pages on top of WORK-174's +5 configuration pages).
- The MCP overview cross-references the configuration docs for `--cwd` and auto-detection behavior; the configuration docs already point at MCP via the schema page.
- All 2318 tests pass.

{% /work %}
