{% spec id="SPEC-043" status="draft" version="1.0" tags="cli, mcp, ai-workflow" %}

# Refrakt MCP Server

A single `@refrakt-md/mcp` package that exposes the refrakt CLI as a Model Context Protocol server, so AI agents can call refrakt operations through typed tools and structured I/O instead of shelling out and parsing text.

## Problem

AI agents currently interact with refrakt by spawning `npx refrakt …` subprocesses and parsing their output. This works but has well-known limitations:

**No type information.** The agent sees `refrakt plan next` as a free-form command. It must learn flag names, valid values for `--status`, and output shape from prose documentation. Skills and `CLAUDE.md` exist to teach the agent these things, but the teaching surface is informal.

**Output parsing is brittle.** Even with `--format json`, the agent must remember to pass the flag, anticipate non-JSON stderr noise, and handle exit codes. A typo in the flag silently produces text output the model then tries to parse.

**Discovery is manual.** The agent only knows the commands its prompt or `CLAUDE.md` mentions. New plugins (`@refrakt-md/plan`, future `@refrakt-md/docs` commands) require updating prose. There is no way to ask refrakt "what can you do?" and get a structured answer the model can reason over.

**No resource model.** Plan entities, rune contracts, and reference content are scattered across files. The agent has to know which path to read for which question. MCP resources would expose `refrakt://plan/work/WORK-026`, `refrakt://rune/hint`, and `refrakt://contracts` as first-class addressable data.

The Model Context Protocol solves all four: tools have JSON schemas, outputs are structured, the server lists its capabilities on connect, and resources are addressable URIs.

-----

## Design Principles

**One package, auto-detecting.** A single `@refrakt-md/mcp` reads the project context — `plan/` directory, `refrakt.config.json`, installed `@refrakt-md/*` packages — and exposes whichever tools apply. Planning-only repos get plan tools. Site repos get site tools. Both can coexist. No flags, no environment variables, no separate `@refrakt-md/plan-mcp` to install.

**Wrap the CLI, don't re-implement.** The MCP server is a thin adapter over the existing command handlers. Each tool dispatches to the same function the CLI calls, so behaviour stays consistent and there is no second source of truth to keep in sync. Bug fixes in `refrakt plan update` automatically apply to `plan.update` over MCP.

**Reuse plugin discovery.** The refrakt CLI already discovers commands from `@refrakt-md/*` packages via their `cli-plugin` export ({% ref "SPEC-022" /%}). The MCP server uses the same discovery, so any package that already ships CLI commands automatically appears as MCP tools — no separate `mcp-plugin` to maintain.

**Read-only as resources, mutating as tools.** MCP distinguishes between resources (idempotent, addressable, agent-pulled) and tools (actions, agent-invoked). `refrakt://plan/work/WORK-026` is a resource — fetching it has no side effects. `plan.update` is a tool — it modifies a file. This split lets the agent browse plan state cheaply without repeatedly calling `cat`-style tools.

**Stdio first, HTTP later.** Initial transport is stdio, the lowest-friction option for `claude_desktop_config.json` and Claude Code MCP registration. HTTP/SSE transport can come later for IDE plugins that need it.

**Long-running commands stay in the CLI.** `refrakt plan serve`, `refrakt edit`, and `refrakt write` are interactive or long-lived. They are intentionally excluded from the MCP surface — agents that need them shell out the old way.

-----

## Auto-Detection

The server inspects the working directory once at startup to decide which tool groups to expose:

| Detected | Exposed tool groups |
|----------|---------------------|
| `refrakt.config.json` exists | Core: `inspect`, `contracts`, `validate`, `reference`, `package` |
| `plan/` directory exists | Plan: `next`, `update`, `create`, `status`, `validate`, `next-id`, `history` |
| Both | Both groups |
| Neither | Diagnostic-only: `detect`, `version` |

Detection is non-destructive — the server never creates directories or config files just to enable tools. If the agent calls a plan tool in a repo with no `plan/` directory, it gets a clear error instructing it to run `plan.init` first (or `plan.init` runs and then retries, depending on the tool).

The detection result is reported through a `refrakt://detect` resource so the agent can see what is available without invoking a tool:

```json
{
  "cwd": "/home/user/project",
  "context": {
    "site": { "config": "refrakt.config.json", "packages": ["@refrakt-md/marketing", "@refrakt-md/plan"] },
    "plan": { "dir": "plan", "specsDir": "plan/specs", "fileCount": 42 }
  },
  "tools": ["refrakt.inspect", "refrakt.contracts", "plan.next", "plan.update", "..."]
}
```

-----

## Tool Surface

Tools are namespaced: `refrakt.<command>` for core CLI commands, `<plugin>.<command>` for plugin commands. Names use dots (MCP-conventional) rather than the CLI's space-separated form.

### Core Tools (always present when site context detected)

| Tool | Wraps | Purpose |
|------|-------|---------|
| `refrakt.inspect` | `refrakt inspect` | Show identity transform output for a rune. Inputs: `rune`, `attributes`, `theme`, `items`. Outputs: HTML, BEM contract, data attributes, `editHints`. |
| `refrakt.inspect_list` | `refrakt inspect --list` | List all available runes from the active package set. |
| `refrakt.inspect_audit` | `refrakt inspect --audit` | CSS coverage audit for one rune or all runes. |
| `refrakt.contracts` | `refrakt contracts` | Generate structure contracts JSON. |
| `refrakt.contracts_check` | `refrakt contracts --check` | Verify the contracts file is up to date. |
| `refrakt.validate` | `refrakt validate` | Validate theme config and manifest. |
| `refrakt.reference` | `refrakt reference` | Emit rune syntax reference for authors and AI agents. Useful as a discovery tool — the agent can ask for the full rune vocabulary in one call. |
| `refrakt.package_validate` | `refrakt package validate` | Validate a community rune package. |

### Plan Tools (present when `plan/` is detected)

| Tool | Wraps | Purpose |
|------|-------|---------|
| `plan.next` | `refrakt plan next --format json` | Highest-priority ready item with satisfied dependencies. |
| `plan.update` | `refrakt plan update <id> --format json` | Update status, priority, milestone, assignee; check/uncheck criteria; set `--resolve`. |
| `plan.create` | `refrakt plan create <type> --format json` | Scaffold a new spec, work item, bug, decision, or milestone. |
| `plan.next_id` | `refrakt plan next-id <type>` | Get the next available auto-assigned ID for a type. |
| `plan.status` | `refrakt plan status --format json` | Repository plan health summary. |
| `plan.validate` | `refrakt plan validate --format json` | Structural and reference validation. |
| `plan.history` | `refrakt plan history --format json` | Git-derived history for a plan entity. |
| `plan.init` | `refrakt plan init` | Scaffold the plan structure (no-op if it already exists). |

### Excluded From v1

These commands are intentionally not exposed:

- `refrakt write` — long-running AI generation; agents should invoke their own model directly.
- `refrakt edit` — opens a browser-based editor.
- `refrakt plan serve` / `refrakt plan build` — long-lived dev server / static site generation.
- `refrakt scaffold-css` — large file-system writes; agents should call this through the shell with explicit confirmation.

These remain available via the CLI; the MCP server reports them as "available via shell" in `refrakt://detect` so the agent knows they exist.

-----

## Resources

Resources are read-only, addressable, and cacheable. The agent fetches them by URI rather than calling a tool.

| URI | Returns |
|-----|---------|
| `refrakt://detect` | Auto-detection summary (see above). |
| `refrakt://reference` | Full rune syntax reference (same payload as `refrakt.reference`). |
| `refrakt://contracts` | Generated structure contracts JSON. |
| `refrakt://rune/<name>` | Identity-transform output for a rune at default attributes. |
| `refrakt://rune/<name>?attr=value&…` | Inspect output with attribute overrides. |
| `refrakt://plan/index` | List of every plan entity (id, type, status, file path). |
| `refrakt://plan/<type>/<id>` | Full Markdoc source for a single plan entity. |
| `refrakt://plan/status` | Same payload as `plan.status`. |

Resources mirror tool functionality where the operation is read-only. The duplication is deliberate — agents that prefer pull (`ReadResource`) get a clean URI surface, and agents that prefer push (`CallTool`) get equivalent tools. MCP clients differ in which they prefer; we support both.

-----

## Plugin Discovery

The MCP server reuses the CLI's plugin discovery. Today, a package exports a `cli-plugin` entry like:

```typescript
// @refrakt-md/plan/cli-plugin.ts
export const commands = {
  namespace: 'plan',
  commands: [
    { name: 'next', handler: nextHandler, description: 'Find next work item' },
    // …
  ],
};
```

The MCP server scans installed packages, loads their `cli-plugin` exports, and registers each command as an MCP tool under `<namespace>.<name>`. To produce JSON Schemas for the tool inputs, the plugin contract is extended with an optional `inputSchema` field per command:

```typescript
interface CliPluginCommand {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
  inputSchema?: JSONSchema7;          // NEW — used by MCP, ignored by CLI
  outputSchema?: JSONSchema7;         // NEW — optional, for structured output
  mcpHandler?: (input: unknown) => Promise<unknown>; // NEW — bypasses argv parsing
}
```

When `mcpHandler` is present, the MCP server calls it directly with the parsed input. When absent, the server falls back to converting the input object into argv strings and calling `handler` — this keeps existing plugins working without changes, at the cost of round-tripping JSON through argv. New commands should provide `mcpHandler` for clean structured I/O.

The schema fields are **purely additive**. Plugins that do not adopt them still work — the MCP server falls back to a generic `{ args: string[] }` schema and surfaces the command's `description`. This means `@refrakt-md/plan` automatically appears under MCP the day this server ships, with progressively richer schemas as the plan plugin opts in.

-----

## Package Structure

```
@refrakt-md/mcp
├── bin.ts                      ← stdio entry point: `npx @refrakt-md/mcp`
├── server.ts                   ← MCP server setup, transport wiring
├── detect.ts                   ← auto-detection (plan dir, refrakt.config.json)
├── plugins.ts                  ← discovers cli-plugin exports from installed packages
├── tools/
│   ├── core.ts                 ← inspect, contracts, validate, reference, package
│   └── plan-fallback.ts        ← argv-shim for plugins without mcpHandler
└── resources/
    ├── detect.ts
    ├── reference.ts
    ├── contracts.ts
    ├── rune.ts                 ← refrakt://rune/<name>
    └── plan.ts                 ← refrakt://plan/*
```

Package dependencies:

- `@modelcontextprotocol/sdk` — MCP server primitives.
- `@refrakt-md/cli` — for direct access to core command handlers (avoids re-implementing).
- `@refrakt-md/types` — shared types including the extended `CliPluginCommand` interface.
- No runtime dependency on `@refrakt-md/plan`; that package is loaded dynamically when present.

-----

## Installation and Registration

The package publishes a `bin` entry so registration is one line in any MCP client config.

**Claude Desktop / Claude Code:**

```json
{
  "mcpServers": {
    "refrakt": {
      "command": "npx",
      "args": ["-y", "@refrakt-md/mcp"]
    }
  }
}
```

**Project-scoped (recommended):** Install as a dev dependency so the version is locked with the project's other refrakt packages.

```bash
npm install --save-dev @refrakt-md/mcp
```

```json
{
  "mcpServers": {
    "refrakt": {
      "command": "npx",
      "args": ["@refrakt-md/mcp"]
    }
  }
}
```

The server inherits `cwd` from the client, which is how it auto-detects the project context. If the client launches the server from outside the project, the agent can pass `--cwd <path>` as a server arg.

-----

## Error Handling

MCP tools return structured errors with a stable shape so the agent can react programmatically:

```json
{
  "isError": true,
  "content": [
    { "type": "text", "text": "Plan directory not found at ./plan" }
  ],
  "errorCode": "PLAN_DIR_MISSING",
  "hint": "Run plan.init to scaffold the plan/ directory"
}
```

Error codes mirror the CLI's exit codes where they exist (`NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_ARGS`) and add MCP-specific codes for missing context (`PLAN_DIR_MISSING`, `SITE_CONFIG_MISSING`). Each error includes a `hint` pointing at the next reasonable action.

-----

## Acceptance Criteria

- [ ] `@refrakt-md/mcp` package published with `bin` entry runnable as `npx @refrakt-md/mcp`
- [ ] stdio transport works in Claude Desktop and Claude Code with the documented config
- [ ] Auto-detection exposes only applicable tool groups; verified for plan-only, site-only, and combined repos
- [ ] `refrakt://detect` resource reports detected context and tool list
- [ ] All core CLI commands except the excluded set are wrapped as MCP tools
- [ ] All `@refrakt-md/plan` commands except `serve`/`build` are wrapped as MCP tools
- [ ] Plugin discovery loads `cli-plugin` exports from any installed `@refrakt-md/*` package automatically
- [ ] `CliPluginCommand` interface extended with optional `inputSchema`, `outputSchema`, `mcpHandler` fields without breaking existing plugins
- [ ] `@refrakt-md/plan` updated to provide `inputSchema` and `mcpHandler` for `next`, `update`, `create`, `status`, `validate`, `next-id`, `history`, `init`
- [ ] Read-only operations also exposed as MCP resources (`refrakt://reference`, `refrakt://contracts`, `refrakt://rune/<name>`, `refrakt://plan/*`)
- [ ] Errors carry a stable `errorCode` and a `hint` for the next action
- [ ] Documented in `site/content/docs/` under a new `mcp` section covering registration, tool reference, and resource reference
- [ ] CLAUDE.md updated with a short pointer telling agents the MCP server exists when registered

-----

## Open Questions

**Should `mcpHandler` be required for new plugin commands?** Argv-shimming works but loses structured input validation. Requiring `mcpHandler` raises the bar for plugin authors. Suggested resolution: optional now, with a lint rule in `package validate` that warns when a command has no schema.

**HTTP transport.** Worth adding for IDE plugins that prefer SSE over stdio? Defer until requested — stdio covers Claude Desktop, Claude Code, and the major editor extensions.

**`refrakt write` over MCP.** Out of scope for v1 because it spawns a long-running model call from inside another model context. Could be revisited if there is demand for prompt-only generation (where the MCP host's own model handles inference).

**Telemetry / logging.** MCP clients route stderr to a debug pane. We should keep stdout strict JSON-RPC and use stderr for human-readable logs. Worth documenting as a contract for plugins providing `mcpHandler`.

{% /spec %}
