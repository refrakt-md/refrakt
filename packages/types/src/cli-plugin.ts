import type { JSONSchema7 } from 'json-schema';

/**
 * A single command contributed by a `cli-plugin` export.
 *
 * The minimum a plugin command must declare is `name`, `description`, and
 * `handler`. The optional fields below let the command participate in the MCP
 * server (SPEC-043) without changing how the CLI itself dispatches argv.
 */
export interface CliPluginCommand {
	/** Subcommand name, used as `refrakt <namespace> <name>` and as the MCP
	 *  tool's local name (final tool id is `<namespace>.<name>`). */
	name: string;

	/** One-line human description. Used in `--help` output and as the
	 *  fallback MCP tool description when no input schema is provided. */
	description: string;

	/** Argv handler, invoked by the CLI. Receives the args after the
	 *  subcommand name. */
	handler: (args: string[]) => void | Promise<void>;

	/** Optional JSON Schema for the structured input shape. Used by the MCP
	 *  server to advertise this command as a typed tool. Ignored by the CLI
	 *  itself, which always parses argv. */
	inputSchema?: JSONSchema7;

	/** Optional JSON Schema for the structured output shape. Used by MCP
	 *  clients to validate or unpack the tool's result. Ignored by the CLI. */
	outputSchema?: JSONSchema7;

	/** Optional structured handler that bypasses argv parsing. When the MCP
	 *  server has this, it calls it directly with the parsed input object.
	 *  When absent, the MCP server falls back to argv-shimming via `handler`.
	 *
	 *  The optional `ctx` argument carries the MCP server's resolved project
	 *  cwd. Handlers should use `ctx.cwd` when resolving relative paths or
	 *  reading project config — `process.cwd()` is unreliable because the
	 *  server process may have been launched from elsewhere.
	 *
	 *  New plugin commands should provide this for clean structured I/O. */
	mcpHandler?: (input: unknown, ctx?: McpHandlerContext) => Promise<unknown>;
}

/**
 * Context passed to `mcpHandler` calls by the MCP server. The `cwd` is the
 * project root the server was bound to (via `--cwd` or `process.cwd()` at
 * startup), which may differ from `process.cwd()` at call time.
 */
export interface McpHandlerContext {
	cwd: string;
}

/**
 * The shape of a `cli-plugin` module's default export. A package contributes
 * commands by exporting an object of this shape from its `cli-plugin` entry
 * (e.g., `@refrakt-md/plan/cli-plugin`).
 */
export interface CliPlugin {
	/** Namespace under which the commands are dispatched. Becomes the first
	 *  positional argument: `refrakt <namespace> <command>`. */
	namespace: string;

	/** Commands contributed by this plugin. */
	commands: CliPluginCommand[];

	/** Optional namespace-level description for help output. */
	description?: string;
}

// Re-export JSONSchema7 from `json-schema` so consumers don't need to install
// `@types/json-schema` themselves to type their schema declarations.
export type { JSONSchema7 } from 'json-schema';
