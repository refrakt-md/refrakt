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
// refrakt.stale — staleness ranking and the `touching` query (SPEC-136 / WORK-596)
// ----------------------------------------------------------------------------

export const staleTool: McpTool = {
	name: 'refrakt.stale',
	description:
		'Find documentation that may no longer describe the code it references. ' +
		'With no arguments it returns the ranked survey — pages ordered by commits to their target since the page last changed. ' +
		'**With `touching` it asks the question backwards, and that is the one that matters: "I am about to change these files. What documents them?" ' +
		'Call it before editing, so the divergence is caught before it exists rather than reported afterwards.** ' +
		'`touching` is an index lookup, not a staleness measurement: no commit count is involved because the change has not happened yet, it needs no git history, and it answers for a file created in the working tree and never committed. ' +
		'Findings are never a failure — the score exists to be read, not satisfied.',
	inputSchema: {
		type: 'object',
		properties: {
			touching: {
				type: 'array',
				items: { type: 'string' },
				description:
					'Repo-root-relative paths you are about to change. Returns every page whose edges point at them, unbounded — a budget designed to keep a survey readable would silently drop pages you need.',
			},
			since: {
				type: 'string',
				description:
					'A git ref. Resolves what changed since it and answers as `touching` would. For a PR-scoped sweep.',
			},
			top: {
				type: 'number',
				description: 'Bound the ranked survey. Default 10. Ignored by `touching` and `since`.',
			},
			class: {
				type: 'string',
				enum: ['declared', 'embedded', 'described-link', 'prose'],
				description: 'Narrow the ranked survey to one edge class.',
			},
			min: { type: 'number', description: 'Floor on the commit count for the ranked survey.' },
		},
		additionalProperties: false,
	},
	async handler(input, ctx) {
		const o = input as {
			touching?: string[];
			since?: string;
			top?: number;
			class?: string;
			min?: number;
		};

		const edges = await import('@refrakt-md/content/edges');
		const repoRoot = ctx.cwd;

		// Content roots and the exclusion lists come from the project's
		// `refrakt.config.json` — nothing about any one repository's folder
		// layout is compiled in.
		let settings: Awaited<ReturnType<typeof edges.resolveStaleSettings>>;
		try {
			settings = edges.resolveStaleSettings(repoRoot);
		} catch (err) {
			return { ok: false, error: (err as Error).message, rows: [], ranked: [] };
		}

		// Both lookups read the same shared index — no query owns it.
		const index = edges.buildEdgeIndex({
			repoRoot,
			contentDirs: settings.contentDirs,
			archival: settings.archival,
			generated: settings.generated,
		});

		if (o.touching !== undefined || o.since !== undefined) {
			let paths = o.touching ?? [];
			if (o.since !== undefined) {
				paths = [...paths, ...edges.changedSince(repoRoot, o.since)];
			}

			// No git scan at all: this is why it works in a shallow clone and
			// for a file that has never been committed.
			const rows = edges.edgesTouching(index, paths);
			return {
				ok: true,
				query: 'touching',
				paths,
				// Structured rows, never formatted text (SPEC-135 D6).
				rows: rows.map((e) => ({
					page: e.referrer,
					line: e.line,
					target: e.target,
					class: e.class,
					reviewed: e.reviewed,
					// A marker the target has outgrown certifies nothing, and an
					// agent must not read it as "someone checked this".
					reviewedStale: e.reviewed ? e.markerStale === true : undefined,
				})),
				count: rows.length,
				declaredErrors: index.errors,
				excluded: index.excluded,
			};
		}

		let history: ReturnType<typeof edges.scanHistory>;
		try {
			history = edges.scanHistory(repoRoot);
		} catch (err) {
			// A refusal is "could not measure", which must not look like a
			// clean corpus.
			return { ok: false, error: (err as Error).message, ranked: [] };
		}

		const result = edges.rankEdges(index, history, {
			edgeClass: o.class as never,
			min: o.min,
		});
		const top = o.top ?? 10;

		return {
			ok: true,
			query: 'ranked',
			ranked: result.ranked.slice(0, top).map((e) => ({
				page: e.edge.referrer,
				line: e.edge.line,
				target: e.edge.target,
				class: e.edge.class,
				score: e.score,
				commits: e.commits.slice(0, 5).map((c) => ({ sha: c.sha, subject: c.subject })),
			})),
			totalNonZero: result.totalNonZero,
			baseRates: result.baseRates,
			declaredErrors: index.errors,
			excluded: index.excluded,
			note: 'A zero score is the absence of evidence of staleness, not evidence of freshness: the referrer side resets on any edit to the page.',
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
	staleTool,
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
