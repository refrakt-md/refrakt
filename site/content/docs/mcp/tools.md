---
title: Tools
description: Full reference for the MCP server's tool surface — core tools and plugin-discovered tools.
---

# Tools

The MCP server exposes two categories of tools: a fixed set of **core tools** that wrap the refrakt CLI, and **plugin tools** that come from installed `@refrakt-md/*` packages exporting a `cli-plugin` entry.

## Core tools

| Tool | Purpose | Site-scoped |
|------|---------|-------------|
| `refrakt.detect` | Report the detected project context (plan dir, sites, plugins, config source). | No |
| `refrakt.plugins_list` | List installed plugins with version, command count, and per-command MCP-readiness flags. | No |
| `refrakt.reference` | Emit the rune syntax reference for the active package set. | Yes |
| `refrakt.contracts` | Generate structure contracts for every rune (BEM block, modifiers, data attrs, structural elements). | Yes |
| `refrakt.inspect` | Show identity transform output for one rune at given attributes. | Yes |
| `refrakt.inspect_list` | List every rune available in the active package set. | Yes |

### `refrakt.detect`

```json
{ "type": "object", "properties": {}, "additionalProperties": false }
```

Returns the full detection result: `{ cwd, plan, site, plugins, configSource }`. Use this as your first call to discover what tools and resources will be available.

### `refrakt.reference`

```json
{
  "type": "object",
  "properties": {
    "format": { "type": "string", "enum": ["markdown", "json"] },
    "site": { "type": "string" },
    "rune": { "type": "string" }
  }
}
```

Returns the rune reference. With `rune` set, scoped to a single rune. JSON format returns structured data; markdown format returns human-readable text. Default format: `json`.

### `refrakt.contracts`

```json
{ "type": "object", "properties": { "site": { "type": "string" } } }
```

Returns the full structure contract — `{ runes: { <name>: { block, modifiers, contextModifiers, staticModifiers, elements } } }`. Useful for theme tooling and CSS coverage validation.

### `refrakt.inspect`

```json
{
  "type": "object",
  "required": ["rune"],
  "properties": {
    "rune": { "type": "string" },
    "attributes": { "type": "object", "additionalProperties": { "type": "string" } },
    "site": { "type": "string" }
  }
}
```

Returns the JSON view of the identity transform output for a rune at the given attributes. Includes the produced HTML, BEM classes, data attributes, and editHints.

### `refrakt.inspect_list`

```json
{ "type": "object", "properties": { "site": { "type": "string" } } }
```

Returns `{ runes: [...] }` — the full list of runes with their package origin and brief descriptions.

### `refrakt.plugins_list`

```json
{ "type": "object", "properties": {}, "additionalProperties": false }
```

Returns the same data as `refrakt plugins list --json`: each installed plugin with `namespace`, `packageName`, `packageVersion`, `commands` (with `hasInputSchema`/`hasOutputSchema`/`hasMcpHandler` flags per command), and discovery `source`.

## Plugin tools

When the MCP server starts, it runs `discoverPlugins()` and registers every command from every installed plugin as `<namespace>.<name>`. For example, `@refrakt-md/plan` contributes:

- `plan.next` — find the highest-priority ready work item.
- `plan.update` — change status, check criteria, set resolve text.
- `plan.create` — scaffold a new spec/work/bug/decision/milestone.
- `plan.status` — repository plan health summary.
- `plan.validate` — structural validation of plan files.
- `plan.next-id` — get the next available ID for a type.
- `plan.init` — scaffold the plan structure.
- `plan.history` — git-derived history for a plan entity.
- `plan.migrate` — file convention migrations.

Excluded by name (long-running / file generation, no MCP fit): `plan.serve`, `plan.build`.

### Direct `mcpHandler` vs argv-shimming

Plugin commands declaring an `mcpHandler` are invoked directly with the structured input and return structured output — the cleanest path. Commands without one fall back to **argv-shimming**: the MCP server serializes the input object into argv strings and calls the legacy `handler`, capturing stdout. This works for legacy plugins but loses structured I/O.

Run `refrakt plugins list --json` to see which commands have `mcpHandler` (the `hasMcpHandler` flag). Plugin authors should provide it for any new command. See [Plugin Authoring](/docs/packages/authoring) for details.

### Input schemas

Each plugin command's input schema comes from its `cli-plugin` export's `inputSchema` field. When absent, the MCP server falls back to a generic `{ type: 'object', additionalProperties: true }` schema and uses the command's `description` text. Schemas with proper `enum` values, `required` lists, and per-field descriptions give MCP clients much better autocomplete.

## Site-scoped tool inputs

Tools that read site-scoped data (`refrakt.inspect`, `refrakt.contracts`, `refrakt.reference`, `refrakt.inspect_list`) accept a `site?: string` input.

- **Single-site projects**: omit it; the server picks the only site automatically.
- **Multi-site projects**: pass it explicitly. Without it, the tool throws a structured error with the available site names.
