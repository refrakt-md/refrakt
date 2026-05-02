/**
 * MCP server setup. Registers tools, hooks up the stdio transport, and
 * dispatches incoming requests.
 *
 * The server reads `cwd` from process at start; a `--cwd <path>` flag on the
 * bin handler can override it for clients that launch the server from outside
 * the project root.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CORE_TOOLS, type McpTool } from './tools/core.js';
import { loadPluginTools } from './tools/plugins.js';
import { listResources, readResource } from './resources.js';
import { detect, type DetectionResult } from './detect.js';

export interface CreateServerOptions {
	cwd?: string;
}

export async function createServer(options: CreateServerOptions = {}) {
	const cwd = options.cwd ?? process.cwd();

	// Detection happens once at startup so we can both decide which resources
	// to expose and surface the detection result on `tools/list` for clients
	// that want to understand the project before invoking anything.
	const detection: DetectionResult = await detect(cwd);
	const pluginTools = await loadPluginTools(cwd);
	const tools: McpTool[] = [...CORE_TOOLS, ...pluginTools];

	const server = new Server(
		{
			name: '@refrakt-md/mcp',
			version: '0.10.1',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
			},
		},
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
			})),
		};
	});

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const tool = tools.find((t) => t.name === request.params.name);
		if (!tool) {
			return {
				isError: true,
				content: [
					{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` },
				],
				_meta: {
					errorCode: 'UNKNOWN_TOOL',
					hint: `Available tools: ${tools.map((t) => t.name).join(', ')}`,
				},
			};
		}

		try {
			const result = await tool.handler(request.params.arguments ?? {}, { cwd });
			return {
				content: [
					{
						type: 'text' as const,
						text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
					},
				],
				structuredContent: result as Record<string, unknown> | undefined,
			};
		} catch (err: unknown) {
			const error = err as { message?: string; errorCode?: string; hint?: string };
			return {
				isError: true,
				content: [
					{ type: 'text' as const, text: error.message ?? 'Tool invocation failed' },
				],
				_meta: {
					errorCode: error.errorCode ?? 'TOOL_FAILED',
					...(error.hint ? { hint: error.hint } : {}),
				},
			};
		}
	});

	server.setRequestHandler(ListResourcesRequestSchema, async () => {
		return {
			resources: listResources({
				cwd,
				hasPlan: detection.plan !== null,
				hasSites: detection.site !== null,
			}),
		};
	});

	server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
		try {
			const content = await readResource(request.params.uri, { cwd });
			return { contents: [content] };
		} catch (err: unknown) {
			const error = err as { message?: string };
			throw new Error(error.message ?? 'Failed to read resource');
		}
	});

	return server;
}

export async function runStdioServer(options: CreateServerOptions = {}): Promise<void> {
	const server = await createServer(options);
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
