/**
 * Plugin-contributed MCP tools.
 *
 * Each command from a discovered plugin (e.g. @refrakt-md/plan) becomes an
 * MCP tool under `<namespace>.<name>`. Commands that declare an `mcpHandler`
 * are invoked directly with the structured input. Commands without one fall
 * back to argv-shimming: the handler receives an object, we serialize it into
 * argv strings, and call the existing CLI handler.
 */

import type { CliPluginCommand, JSONSchema7 } from '@refrakt-md/types';
import type { DiscoveredPlugin } from '@refrakt-md/cli/lib/plugins.js';
import { discoverPlugins } from '@refrakt-md/cli/lib/plugins.js';
import type { McpTool } from './core.js';

/** Commands that should not be exposed via MCP — long-running servers,
 *  filesystem generators, etc. that don't fit the request/response model. */
const EXCLUDED_COMMANDS = new Set<string>([
	'plan.serve',
	'plan.build',
]);

/** Discover installed plugins and convert each command into an MCP tool. */
export async function loadPluginTools(cwd: string): Promise<McpTool[]> {
	const discovered: DiscoveredPlugin[] = await discoverPlugins({ cwd, warn: false });
	const tools: McpTool[] = [];
	for (const plugin of discovered) {
		for (const command of plugin.commands) {
			const toolName = `${plugin.namespace}.${command.name}`;
			if (EXCLUDED_COMMANDS.has(toolName)) continue;
			tools.push(buildPluginTool(toolName, command));
		}
	}
	return tools;
}

function buildPluginTool(name: string, command: CliPluginCommand): McpTool {
	const inputSchema: JSONSchema7 = command.inputSchema ?? {
		type: 'object',
		additionalProperties: true,
		description: 'Free-form arguments — this command has no inputSchema yet, so MCP cannot validate inputs.',
	};

	return {
		name,
		description: command.description,
		inputSchema,
		handler: async (input) => {
			if (command.mcpHandler) {
				return command.mcpHandler(input);
			}
			// Fallback: serialize the input as argv and invoke the legacy
			// handler. Captures stdout via a simple buffer hack.
			const args = inputToArgv(input);
			const captured = await captureStdout(() => command.handler(args));
			return tryParseJson(captured);
		},
	};
}

/** Translate a structured input object into a flat argv array suitable for
 *  legacy `handler(args)` consumption. Boolean true → bare flag; everything
 *  else → `--key`, `value` pair. Nested objects/arrays are JSON-stringified. */
function inputToArgv(input: unknown): string[] {
	if (!input || typeof input !== 'object') return [];
	const args: string[] = [];
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		if (value === undefined || value === null) continue;
		if (value === true) {
			args.push(`--${key}`);
			continue;
		}
		if (value === false) continue;
		if (typeof value === 'string' || typeof value === 'number') {
			args.push(`--${key}`, String(value));
			continue;
		}
		args.push(`--${key}`, JSON.stringify(value));
	}
	return args;
}

/** Capture writes to process.stdout while running fn(). Restores stdout when
 *  done. Used as the legacy-handler fallback because most plugin commands
 *  print structured JSON to stdout when given `--format json`. */
async function captureStdout(fn: () => void | Promise<void>): Promise<string> {
	const chunks: Buffer[] = [];
	const originalWrite = process.stdout.write.bind(process.stdout);
	(process.stdout.write as unknown) = (chunk: string | Buffer): boolean => {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
		return true;
	};
	try {
		await fn();
	} finally {
		(process.stdout.write as unknown) = originalWrite;
	}
	return Buffer.concat(chunks).toString('utf-8');
}

function tryParseJson(text: string): unknown {
	const trimmed = text.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		return { raw: trimmed };
	}
}
