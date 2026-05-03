/**
 * MCP resources — read-only addressable data the server exposes.
 *
 * Resources mirror the read-only subset of the tool surface so MCP clients
 * that prefer pull semantics (ReadResource) get equivalent data without a
 * tool invocation.
 *
 * URI scheme:
 *   refrakt://detect            — full detection result
 *   refrakt://reference         — rune syntax reference (JSON)
 *   refrakt://contracts         — structure contracts (JSON)
 *   refrakt://rune/<name>       — identity transform output for one rune
 *   refrakt://plan/index        — list of plan entities
 *   refrakt://plan/<type>/<id>  — Markdoc source for one plan entity
 *   refrakt://plan/status       — plan status payload
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

export interface McpResource {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
}

export interface ResourceContent {
	uri: string;
	mimeType: string;
	text: string;
}

/** Static resource list — dynamic ones (e.g. refrakt://rune/<name>) are
 *  surfaced via templated entries the client can complete. */
export function listResources(ctx: { cwd: string; hasPlan: boolean; hasSites: boolean }): McpResource[] {
	const list: McpResource[] = [
		{
			uri: 'refrakt://detect',
			name: 'detect',
			description: 'Auto-detection summary for the current project (plan dir, sites, plugins).',
			mimeType: 'application/json',
		},
	];
	if (ctx.hasSites) {
		list.push(
			{
				uri: 'refrakt://reference',
				name: 'reference',
				description: 'Rune syntax reference for the active package set.',
				mimeType: 'application/json',
			},
			{
				uri: 'refrakt://contracts',
				name: 'contracts',
				description: 'Structure contracts for every rune in the active package set.',
				mimeType: 'application/json',
			},
		);
	}
	if (ctx.hasPlan) {
		list.push(
			{
				uri: 'refrakt://plan/index',
				name: 'plan-index',
				description: 'Index of all plan entities (id, type, status, file path).',
				mimeType: 'application/json',
			},
			{
				uri: 'refrakt://plan/status',
				name: 'plan-status',
				description: 'Plan status summary (counts, milestone progress).',
				mimeType: 'application/json',
			},
		);
	}
	return list;
}

/** Read the contents of a resource by URI. Returns the text payload (always
 *  JSON for now — markdown could be added later for plan entity reads). */
export async function readResource(uri: string, ctx: { cwd: string }): Promise<ResourceContent> {
	if (uri === 'refrakt://detect') {
		const { detect } = await import('./detect.js');
		const result = await detect(ctx.cwd);
		return jsonContent(uri, result);
	}

	if (uri === 'refrakt://reference') {
		return jsonContent(uri, await invokeCli(['reference', '--format', 'json'], ctx.cwd));
	}

	if (uri === 'refrakt://contracts') {
		const stdout = await invokeCliText(['contracts', '-o', '/dev/stdout'], ctx.cwd);
		const start = stdout.indexOf('{');
		if (start === -1) throw resourceError(uri, 'contracts produced no JSON output');
		return { uri, mimeType: 'application/json', text: stdout.slice(start).trim() };
	}

	if (uri.startsWith('refrakt://rune/')) {
		const rest = uri.slice('refrakt://rune/'.length);
		const [name, query] = rest.split('?');
		if (!name) throw resourceError(uri, 'missing rune name');
		const args = ['inspect', name, '--json'];
		if (query) {
			for (const pair of query.split('&')) {
				const [k, v] = pair.split('=');
				if (!k) continue;
				args.push(`--${k}=${v ?? ''}`);
			}
		}
		return jsonContent(uri, await invokeCli(args, ctx.cwd));
	}

	if (uri === 'refrakt://plan/index') {
		return jsonContent(uri, listPlanEntities(ctx.cwd));
	}

	if (uri === 'refrakt://plan/status') {
		return jsonContent(uri, await invokeCli(['plan', 'status', '--format', 'json'], ctx.cwd));
	}

	if (uri.startsWith('refrakt://plan/')) {
		// Single entity by type/id — refrakt://plan/work/WORK-001
		const rest = uri.slice('refrakt://plan/'.length);
		const slashIdx = rest.indexOf('/');
		if (slashIdx === -1) throw resourceError(uri, 'expected refrakt://plan/<type>/<id>');
		const type = rest.slice(0, slashIdx);
		const id = rest.slice(slashIdx + 1);
		return readPlanEntity(uri, ctx.cwd, type, id);
	}

	throw resourceError(uri, `unknown resource URI`);
}

interface PlanEntityListing {
	id: string;
	type: string;
	status?: string;
	file: string;
}

function listPlanEntities(cwd: string): { entities: PlanEntityListing[] } {
	const planDir = resolvePlanDir(cwd);
	if (!planDir || !existsSync(planDir)) return { entities: [] };
	const entities: PlanEntityListing[] = [];
	const stack = [planDir];
	while (stack.length > 0) {
		const current = stack.pop()!;
		try {
			for (const entry of readdirSync(current)) {
				const full = join(current, entry);
				if (statSync(full).isDirectory()) {
					stack.push(full);
				} else if (entry.endsWith('.md')) {
					try {
						const text = readFileSync(full, 'utf-8');
						const meta = parseFrontMatter(text);
						if (meta) {
							entities.push({
								...meta,
								file: full.slice(planDir.length + 1),
							});
						}
					} catch {
						// skip unreadable
					}
				}
			}
		} catch {
			// skip unreadable directory
		}
	}
	return { entities };
}

function parseFrontMatter(text: string): { id: string; type: string; status?: string } | undefined {
	const match = text.match(/\{%\s*(work|bug|spec|decision|milestone)\s+([^%]+)%\}/);
	if (!match) return undefined;
	const type = match[1]!;
	const attrs = match[2]!;
	const idMatch = attrs.match(/(?:id|name)="([^"]+)"/);
	if (!idMatch) return undefined;
	const statusMatch = attrs.match(/status="([^"]+)"/);
	return {
		id: idMatch[1]!,
		type,
		...(statusMatch ? { status: statusMatch[1]! } : {}),
	};
}

function readPlanEntity(uri: string, cwd: string, type: string, id: string): ResourceContent {
	const planDir = resolvePlanDir(cwd);
	if (!planDir || !existsSync(planDir)) throw resourceError(uri, 'plan directory not found');
	// Look in plan/<type>s/ first (the convention), then anywhere under plan/.
	const candidates = [
		join(planDir, `${type}s`),
		join(planDir, type),
		planDir,
	];
	for (const dir of candidates) {
		if (!existsSync(dir)) continue;
		const found = findEntityFile(dir, id);
		if (found) {
			return {
				uri,
				mimeType: 'text/markdown',
				text: readFileSync(found, 'utf-8'),
			};
		}
	}
	throw resourceError(uri, `plan entity ${id} not found`);
}

function findEntityFile(dir: string, id: string): string | undefined {
	const stack = [dir];
	while (stack.length > 0) {
		const current = stack.pop()!;
		try {
			for (const entry of readdirSync(current)) {
				const full = join(current, entry);
				try {
					if (statSync(full).isDirectory()) stack.push(full);
					else if (entry.endsWith('.md') && entry.includes(id)) return full;
				} catch {
					// skip
				}
			}
		} catch {
			// skip
		}
	}
	return undefined;
}

function resolvePlanDir(cwd: string): string | undefined {
	const configPath = resolve(cwd, 'refrakt.config.json');
	if (existsSync(configPath)) {
		try {
			const config = JSON.parse(readFileSync(configPath, 'utf-8')) as { plan?: { dir?: string } };
			if (config.plan?.dir) return resolve(cwd, config.plan.dir);
		} catch {
			// fall through to default
		}
	}
	const fallback = resolve(cwd, 'plan');
	return existsSync(fallback) ? fallback : undefined;
}

function jsonContent(uri: string, payload: unknown): ResourceContent {
	return { uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) };
}

function resourceError(uri: string, message: string): Error {
	const err = new Error(`${message} (${uri})`);
	(err as { errorCode?: string }).errorCode = 'RESOURCE_FAILED';
	return err;
}

/** CLI invocation that returns parsed JSON. */
async function invokeCli(args: string[], cwd: string): Promise<unknown> {
	const text = await invokeCliText(args, cwd);
	return JSON.parse(text);
}

/** CLI invocation that returns raw stdout text. */
async function invokeCliText(args: string[], cwd: string): Promise<string> {
	const { execFileSync } = await import('node:child_process');
	const { resolveCliBin } = await import('./cli-bin.js');
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
		throw new Error(`refrakt ${args[0]} failed: ${stderr.trim() || err.message}`);
	}
}
