/**
 * Core refrakt CLI tools, exposed as MCP tools.
 *
 * Each tool delegates to the same underlying logic the `refrakt` CLI uses,
 * but produces structured JSON output suitable for MCP. Where the underlying
 * CLI command prints to stdout (rather than returning data), the tool here
 * captures stdout via a child-process spawn — the cost is one extra fork per
 * call but it preserves the exact output the user would see.
 */

import { execFileSync } from 'node:child_process';
import type { JSONSchema7 } from '@refrakt-md/types';
import { resolveCliBin } from '../cli-bin.js';

/** Shared shape exported by the MCP server for each registered tool. */
export interface McpTool {
	name: string;
	description: string;
	inputSchema: JSONSchema7;
	handler: (input: unknown, ctx: { cwd: string }) => Promise<unknown>;
}

const siteProp: JSONSchema7 = {
	type: 'string',
	description: 'Site name (required for multi-site projects).',
};

// ----------------------------------------------------------------------------
// refrakt.reference  — emit the rune syntax reference
// ----------------------------------------------------------------------------

export const referenceTool: McpTool = {
	name: 'refrakt.reference',
	description:
		'Emit the rune syntax reference for the active package set. Useful for AI agents that need to know which runes are available and how to use them.',
	inputSchema: {
		type: 'object',
		properties: {
			format: {
				type: 'string',
				enum: ['markdown', 'json'],
				description: 'Output format. Default: json.',
			},
			site: siteProp,
			rune: { type: 'string', description: 'When set, emit reference for a single rune by name.' },
		},
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as { format?: string; site?: string; rune?: string };
		const args = ['reference'];
		if (o.rune) args.push(o.rune);
		args.push('--format', o.format ?? 'json');
		if (o.site) args.push('--site', o.site);
		const stdout = invokeCli(args, ctx.cwd);
		return o.format === 'markdown' ? { format: 'markdown', text: stdout } : tryParseJson(stdout);
	},
};

// ----------------------------------------------------------------------------
// refrakt.contracts — generate structure contracts JSON
// ----------------------------------------------------------------------------

export const contractsTool: McpTool = {
	name: 'refrakt.contracts',
	description:
		'Generate the full structure contract for the active rune set: per-rune BEM block, modifiers, data attributes, structural elements. Useful for theme authors and CSS coverage tooling.',
	inputSchema: {
		type: 'object',
		properties: {
			site: siteProp,
		},
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as { site?: string };
		const args = ['contracts', '-o', '/dev/stdout'];
		if (o.site) args.push('--site', o.site);
		const stdout = invokeCli(args, ctx.cwd);
		// `refrakt contracts -o /dev/stdout` writes the JSON contract to stdout
		// followed by a "Written ..." line on stderr — we only want the JSON.
		const start = stdout.indexOf('{');
		if (start === -1) throw new Error('contracts produced no JSON output');
		return JSON.parse(stdout.slice(start));
	},
};

// ----------------------------------------------------------------------------
// refrakt.i18n_extract — auto-derived i18n keys + English defaults (SPEC-035)
// ----------------------------------------------------------------------------

export const i18nExtractTool: McpTool = {
	name: 'refrakt.i18n_extract',
	description:
		'Emit every derivable framework i18n key with its English default as a JSON dictionary (SPEC-035): meta-field/structure labels (auto-derived {scope}.{block}.{ref}), layout chrome (layout.*), computed navigation (core.*), and enum-as-text values. The same key→value shape used by translation files, so an agent can bootstrap a <locale>.json bundle from it.',
	inputSchema: {
		type: 'object',
		properties: {
			site: siteProp,
		},
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as { site?: string };
		const args = ['i18n', 'extract'];
		if (o.site) args.push('--site', o.site);
		const stdout = invokeCli(args, ctx.cwd);
		const start = stdout.indexOf('{');
		if (start === -1) throw new Error('i18n extract produced no JSON output');
		return JSON.parse(stdout.slice(start));
	},
};

// ----------------------------------------------------------------------------
// refrakt.inspect — see the identity transform output for a rune
// ----------------------------------------------------------------------------

export const inspectTool: McpTool = {
	name: 'refrakt.inspect',
	description:
		'Show the identity transform output for a rune: the HTML it produces with BEM classes and data attributes for a given attribute set. Returns the JSON view (--json) so MCP clients can consume the structured contract.',
	inputSchema: {
		type: 'object',
		required: ['rune'],
		properties: {
			rune: { type: 'string', description: 'Rune name (e.g. "hint", "hero").' },
			attributes: {
				type: 'object',
				additionalProperties: { type: 'string' },
				description: 'Rune attributes to set (e.g. { type: "warning" }).',
			},
			site: siteProp,
		},
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as { rune: string; attributes?: Record<string, string>; site?: string };
		const args = ['inspect', o.rune, '--json'];
		if (o.attributes) {
			for (const [k, v] of Object.entries(o.attributes)) {
				args.push(`--${k}=${v}`);
			}
		}
		if (o.site) args.push('--site', o.site);
		const stdout = invokeCli(args, ctx.cwd);
		return tryParseJson(stdout);
	},
};

// ----------------------------------------------------------------------------
// refrakt.inspect_list — list all available runes
// ----------------------------------------------------------------------------

export const inspectListTool: McpTool = {
	name: 'refrakt.inspect_list',
	description: 'List every rune available in the active package set.',
	inputSchema: {
		type: 'object',
		properties: { site: siteProp },
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as { site?: string };
		const args = ['inspect', '--list', '--json'];
		if (o.site) args.push('--site', o.site);
		return tryParseJson(invokeCli(args, ctx.cwd));
	},
};

// ----------------------------------------------------------------------------
// refrakt.plugins_list — list installed plugins
// ----------------------------------------------------------------------------

export const pluginsListTool: McpTool = {
	name: 'refrakt.plugins_list',
	description:
		'List installed refrakt plugin packages with their commands and MCP schema availability.',
	inputSchema: { type: 'object', properties: {}, additionalProperties: false },
	async handler(_input, ctx) {
		return tryParseJson(invokeCli(['plugins', 'list', '--json'], ctx.cwd));
	},
};

// ----------------------------------------------------------------------------
// refrakt.detect — return the detection result (also exposed as a resource)
// ----------------------------------------------------------------------------

export const detectTool: McpTool = {
	name: 'refrakt.detect',
	description:
		'Report the detected refrakt context (plan dir, declared sites, installed plugins, config source).',
	inputSchema: { type: 'object', properties: {}, additionalProperties: false },
	async handler(_input, ctx) {
		const { detect } = await import('../detect.js');
		return detect(ctx.cwd);
	},
};

// ----------------------------------------------------------------------------
// refrakt.validate — validate the project's sites (SPEC-135 D6 / WORK-581)
// ----------------------------------------------------------------------------

export const validateTool: McpTool = {
	name: 'refrakt.validate',
	description:
		"Validate this project's sites: config resolution first, then content, for every site in refrakt.config.json. " +
		'Returns structured findings (file, line, severity, error id, message) rather than a rendered report, so a caller can filter and act on individual findings. ' +
		'The default tier is per-page — parse and validate, no layouts, no git, no transform, no cross-page pipeline. ' +
		'Set `deep` to add the cross-page checks (broken refs, missing entities, nav slug resolution); that costs a full pipeline run, roughly what a build costs. ' +
		'Config resolution runs first because its failures cause content findings: an unresolvable plugin makes every rune it contributes look like an undefined tag, so when that happens the content layer is skipped and says so.',
	inputSchema: {
		type: 'object',
		properties: {
			site: { type: 'string', description: 'Restrict to one site. Omitted means every site.' },
			only: {
				type: 'string',
				enum: ['content', 'config'],
				description: 'Narrow to one layer. Both run when absent.',
			},
			deep: {
				type: 'boolean',
				description: 'Run the cross-page tier as well. Costs a full pipeline run. Default: false.',
			},
			configPath: {
				type: 'string',
				description: 'Path to refrakt.config.json. Default: ./refrakt.config.json.',
			},
			limit: {
				type: 'number',
				description:
					'Cap the findings returned per site. Default: 200. A site mid-migration can produce thousands, and an unbounded list is not useful to a caller.',
			},
		},
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as {
			site?: string;
			only?: 'content' | 'config';
			deep?: boolean;
			configPath?: string;
			limit?: number;
		};
		// Calls the same function the CLI calls — no second implementation, and
		// no shelling out to parse text back into data (SPEC-135 D6).
		const { runValidation, hasErrors } = await import('@refrakt-md/cli/validate.js');
		const result = await runValidation({
			site: o.site,
			only: o.only,
			deep: o.deep,
			configPath: o.configPath,
			cwd: ctx.cwd,
		});

		if (result.error) {
			return { ok: false, error: result.error, sites: [] };
		}

		const limit = o.limit ?? 200;
		return {
			ok: !hasErrors(result),
			configPath: result.configPath,
			sites: result.sites.map((s) => ({
				site: s.site,
				config: s.config,
				contentSuppressed: s.contentSuppressed,
				content: s.content.slice(0, limit),
				contentTruncated: s.content.length > limit ? s.content.length - limit : undefined,
				counts: {
					errors:
						s.config.filter((f) => f.severity === 'error').length +
						s.content.filter((f) => f.severity === 'error').length,
					warnings:
						s.config.filter((f) => f.severity === 'warning').length +
						s.content.filter((f) => f.severity === 'warning').length,
					info: s.content.filter((f) => f.severity === 'info').length,
				},
			})),
		};
	},
};

// ----------------------------------------------------------------------------
// Aggregate set
// ----------------------------------------------------------------------------

export const CORE_TOOLS: McpTool[] = [
	detectTool,
	pluginsListTool,
	referenceTool,
	contractsTool,
	i18nExtractTool,
	inspectTool,
	inspectListTool,
	validateTool,
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Resolve and invoke the refrakt CLI bin, returning stdout. Throws with the
 *  CLI's stderr on non-zero exit so the MCP handler surfaces the user-facing
 *  error message. */
function invokeCli(args: string[], cwd: string): string {
	const bin = resolveCliBin();
	try {
		return execFileSync('node', [bin, ...args], {
			encoding: 'utf-8',
			cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
			maxBuffer: 50 * 1024 * 1024,
		});
	} catch (err: any) {
		const stderr = (err.stderr ?? '').toString();
		const stdout = (err.stdout ?? '').toString();
		const message = stderr || stdout || err.message;
		const wrapped = new Error(`refrakt ${args[0]} failed: ${message.trim()}`);
		(wrapped as { errorCode?: string }).errorCode = 'CLI_INVOCATION_FAILED';
		throw wrapped;
	}
}

function tryParseJson(text: string): unknown {
	const trimmed = text.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		// Some CLI commands print extra lines around the JSON; pull the first
		// JSON-shaped substring.
		const start = trimmed.indexOf('{');
		const arrStart = trimmed.indexOf('[');
		const idx = start === -1 ? arrStart : arrStart === -1 ? start : Math.min(start, arrStart);
		if (idx === -1) return { raw: trimmed };
		return JSON.parse(trimmed.slice(idx));
	}
}
