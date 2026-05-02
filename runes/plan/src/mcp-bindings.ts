/**
 * MCP-friendly bindings for the plan commands.
 *
 * Each export is `{ inputSchema, mcpHandler }` for one command. The MCP server
 * (`@refrakt-md/mcp`) consumes these to expose the plan commands as typed
 * tools. The argv handlers in `cli-plugin.ts` continue to work unchanged —
 * these are an additive surface, not a replacement.
 *
 * Each `mcpHandler` accepts a structured input (already validated against
 * `inputSchema` by the MCP server) and calls the underlying runner function.
 * The runners live in `commands/*.ts` and were already factored to accept
 * options objects, so wiring is straightforward.
 */

import type { JSONSchema7 } from '@refrakt-md/types';
import { runUpdate, type UpdateOptions } from './commands/update.js';
import { runNext, type NextOptions } from './commands/next.js';
import { runCreate, type CreateOptions } from './commands/create.js';
import { runStatus, type StatusOptions } from './commands/status.js';
import { runValidate, type ValidateOptions } from './commands/validate.js';
import { runNextId, isAutoIdType, type AutoIdType } from './commands/next-id.js';
import { runInit } from './commands/init.js';
import { runHistory, type HistoryOptions } from './commands/history.js';
import { runMigrateFilenames } from './commands/migrate.js';
import { resolvePlanDir } from './plan-config.js';
import { VALID_TYPES, type PlanItemType } from './commands/templates.js';

/** Common `dir` field used by every plan command. */
const dirProp: JSONSchema7 = {
	type: 'string',
	description: 'Plan directory. Defaults to plan.dir from refrakt.config.json, then env REFRAKT_PLAN_DIR, then "plan".',
};

const formatProp: JSONSchema7 = {
	type: 'string',
	enum: ['text', 'json'],
	description: 'Output format. Default: text.',
};

const STATUS_VALUES = ['draft', 'ready', 'in-progress', 'review', 'done', 'blocked'] as const;
const PRIORITY_VALUES = ['critical', 'high', 'medium', 'low'] as const;
const SEVERITY_VALUES = ['critical', 'major', 'minor', 'trivial'] as const;
const TYPE_VALUES = [...VALID_TYPES] as readonly string[];

/** Normalize the `dir` field on incoming MCP input — falling back to the same
 *  resolution the argv handlers use. */
function resolveDir(input: { dir?: unknown }): string {
	const dir = typeof input.dir === 'string' && input.dir.length > 0 ? input.dir : undefined;
	return resolvePlanDir(dir).dir;
}

// --- next ----------------------------------------------------------------

export const nextSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		dir: dirProp,
		milestone: { type: 'string', description: 'Restrict to items in a milestone.' },
		tag: { type: 'string', description: 'Restrict to items with a tag.' },
		assignee: { type: 'string', description: 'Restrict to items assigned to a specific person.' },
		type: { type: 'string', enum: ['work', 'bug', 'all'], description: 'Entity type filter. Default: all.' },
		count: { type: 'integer', minimum: 1, description: 'How many items to return. Default: 1.' },
	},
	additionalProperties: false,
};

export async function nextMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Partial<NextOptions> & { dir?: string };
	return runNext({
		dir: resolveDir(o),
		milestone: o.milestone,
		tag: o.tag,
		assignee: o.assignee,
		type: o.type,
		count: o.count,
		formatJson: false,
	});
}

// --- update --------------------------------------------------------------

export const updateSchema: JSONSchema7 = {
	type: 'object',
	required: ['id'],
	properties: {
		id: { type: 'string', description: 'Entity ID (e.g., "WORK-001").' },
		dir: dirProp,
		status: { type: 'string', enum: [...STATUS_VALUES] },
		priority: { type: 'string', enum: [...PRIORITY_VALUES] },
		severity: { type: 'string', enum: [...SEVERITY_VALUES] },
		assignee: { type: 'string' },
		milestone: { type: 'string' },
		check: { type: 'string', description: 'Acceptance-criterion text to mark complete (substring match).' },
		uncheck: { type: 'string', description: 'Acceptance-criterion text to mark incomplete (substring match).' },
		resolve: { type: 'string', description: 'Resolution summary text appended at the bottom of the entity.' },
		resolveFile: { type: 'string', description: 'Path to a file whose contents become the resolution summary.' },
		attrs: {
			type: 'object',
			additionalProperties: { type: 'string' },
			description: 'Free-form attributes to set on the entity (overrides specific status/priority fields if duplicated).',
		},
	},
	additionalProperties: false,
};

export async function updateMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Record<string, unknown>;
	const attrs: Record<string, string> = { ...((o.attrs as Record<string, string>) ?? {}) };
	for (const key of ['status', 'priority', 'severity', 'assignee', 'milestone']) {
		if (typeof o[key] === 'string') attrs[key] = o[key] as string;
	}
	const opts: UpdateOptions = {
		id: String(o.id),
		dir: resolveDir(o as { dir?: unknown }),
		attrs,
		check: typeof o.check === 'string' ? o.check : undefined,
		uncheck: typeof o.uncheck === 'string' ? o.uncheck : undefined,
		resolve: typeof o.resolve === 'string' ? o.resolve : undefined,
		resolveFile: typeof o.resolveFile === 'string' ? o.resolveFile : undefined,
		formatJson: false,
	};
	return runUpdate(opts);
}

// --- create --------------------------------------------------------------

export const createSchema: JSONSchema7 = {
	type: 'object',
	required: ['type', 'title'],
	properties: {
		type: { type: 'string', enum: [...TYPE_VALUES] },
		title: { type: 'string' },
		id: { type: 'string', description: 'Override the auto-assigned ID.' },
		dir: dirProp,
		attrs: {
			type: 'object',
			additionalProperties: { type: 'string' },
			description: 'Additional attributes (status, priority, milestone, etc).',
		},
	},
	additionalProperties: false,
};

export async function createMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Record<string, unknown>;
	const opts: CreateOptions = {
		dir: resolveDir(o as { dir?: unknown }),
		type: o.type as PlanItemType,
		title: String(o.title),
		id: typeof o.id === 'string' ? o.id : undefined,
		attrs: (o.attrs as Record<string, string>) ?? undefined,
	};
	return runCreate(opts);
}

// --- status --------------------------------------------------------------

export const statusSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		dir: dirProp,
		milestone: { type: 'string' },
	},
	additionalProperties: false,
};

export async function statusMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Partial<StatusOptions> & { dir?: string };
	return runStatus({
		dir: resolveDir(o),
		milestone: o.milestone,
		formatJson: false,
	});
}

// --- validate ------------------------------------------------------------

export const validateSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		dir: dirProp,
		strict: { type: 'boolean', description: 'Promote warnings to errors. Default: false.' },
	},
	additionalProperties: false,
};

export async function validateMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Partial<ValidateOptions> & { dir?: string };
	return runValidate({
		dir: resolveDir(o),
		strict: o.strict,
		formatJson: false,
	});
}

// --- next-id -------------------------------------------------------------

export const nextIdSchema: JSONSchema7 = {
	type: 'object',
	required: ['type'],
	properties: {
		type: { type: 'string', enum: ['work', 'bug', 'spec', 'decision'], description: 'Entity type to compute the next ID for.' },
		dir: dirProp,
	},
	additionalProperties: false,
};

export async function nextIdMcpHandler(input: unknown): Promise<unknown> {
	const o = input as { type: string; dir?: string };
	if (!isAutoIdType(o.type)) {
		throw new Error(`Invalid type "${o.type}" for next-id. Valid: work, bug, spec, decision.`);
	}
	return runNextId(resolveDir(o), o.type as AutoIdType);
}

// --- init ----------------------------------------------------------------

export const initSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		dir: dirProp,
		projectRoot: { type: 'string', description: 'Project root directory. Default: cwd.' },
		agent: { type: 'string', enum: ['claude', 'cursor', 'copilot', 'windsurf', 'cline', 'none'] },
		noPackageJson: { type: 'boolean' },
		noHooks: { type: 'boolean' },
		noWrapper: { type: 'boolean' },
		noConfig: { type: 'boolean' },
	},
	additionalProperties: false,
};

export async function initMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Record<string, unknown>;
	return runInit({
		dir: resolveDir(o as { dir?: unknown }),
		projectRoot: typeof o.projectRoot === 'string' ? o.projectRoot : '.',
		agent: o.agent as 'claude' | 'cursor' | 'copilot' | 'windsurf' | 'cline' | 'none' | undefined,
		noPackageJson: Boolean(o.noPackageJson),
		noHooks: Boolean(o.noHooks),
		noWrapper: Boolean(o.noWrapper),
		noConfig: Boolean(o.noConfig),
	});
}

// --- history -------------------------------------------------------------

export const historySchema: JSONSchema7 = {
	type: 'object',
	properties: {
		dir: dirProp,
		id: { type: 'string', description: 'Entity ID for single-entity history. Omitted for global history.' },
		limit: { type: 'integer', minimum: 1, description: 'Max events. Default: 20 (single), 50 (global).' },
		since: { type: 'string', description: 'Time filter: "7d", "30d", or ISO date.' },
		type: { type: 'string', description: 'Entity type filter, comma-separated (work, spec, bug, decision).' },
		author: { type: 'string' },
	},
	additionalProperties: false,
};

export async function historyMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Partial<HistoryOptions> & { dir?: string };
	return runHistory({
		dir: resolveDir(o),
		id: o.id,
		limit: o.limit ?? (o.id ? 20 : 50),
		since: o.since,
		type: o.type,
		author: o.author,
	} as HistoryOptions);
}

// --- migrate -------------------------------------------------------------

export const migrateSchema: JSONSchema7 = {
	type: 'object',
	properties: {
		subcommand: {
			type: 'string',
			enum: ['filenames'],
			description: 'Migration subcommand. Currently only "filenames" is supported.',
		},
		dir: dirProp,
		apply: { type: 'boolean', description: 'Write the migration. Default: false (dry run).' },
		useGit: { type: 'boolean', description: 'Use git mv for renames. Default: false.' },
	},
	required: ['subcommand'],
	additionalProperties: false,
};

export async function migrateMcpHandler(input: unknown): Promise<unknown> {
	const o = input as Record<string, unknown>;
	if (o.subcommand !== 'filenames') {
		throw new Error(`Unknown migrate subcommand "${String(o.subcommand)}". Valid: filenames.`);
	}
	return runMigrateFilenames({
		dir: resolveDir(o as { dir?: unknown }),
		apply: Boolean(o.apply),
		useGit: Boolean(o.useGit),
	});
}

// --- serve / build are intentionally not exposed via MCP -----------------

// `serve` and `build` are long-running / produce filesystem trees that don't
// fit MCP's request/response model. Agents that need those should shell out
// to the CLI directly.
