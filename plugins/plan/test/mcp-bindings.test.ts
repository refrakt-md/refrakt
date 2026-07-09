import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	nextSchema, nextMcpHandler,
	updateSchema, updateMcpHandler,
	createSchema, createMcpHandler,
	statusSchema, statusMcpHandler,
	validateSchema, validateMcpHandler,
	nextIdSchema, nextIdMcpHandler,
	historySchema, historyMcpHandler,
	migrateSchema, migrateMcpHandler,
	initSchema,
} from '../src/mcp-bindings.js';

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'refrakt-plan-mcp-'));
	mkdirSync(join(tempDir, 'work'), { recursive: true });
	mkdirSync(join(tempDir, 'specs'), { recursive: true });
	mkdirSync(join(tempDir, 'milestones'), { recursive: true });
	writeFileSync(
		join(tempDir, 'work/WORK-001-example.md'),
		`{% work id="WORK-001" status="ready" priority="medium" complexity="simple" %}\n\n# Example\n\nDescription.\n\n## Acceptance Criteria\n\n- [ ] Criterion one\n- [ ] Criterion two\n\n{% /work %}\n`,
	);
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe('plan command schemas', () => {
	it('all schemas are valid JSON Schema objects', () => {
		const schemas = [
			nextSchema, updateSchema, createSchema, statusSchema,
			validateSchema, nextIdSchema, historySchema, migrateSchema, initSchema,
		];
		for (const schema of schemas) {
			expect(schema.type).toBe('object');
			expect(typeof schema.properties).toBe('object');
		}
	});

	it('next schema enumerates type values', () => {
		const typeProp = (nextSchema.properties as any).type;
		expect(typeProp.enum).toEqual(['work', 'bug', 'all']);
	});

	it('update schema enumerates status values', () => {
		const statusProp = (updateSchema.properties as any).status;
		expect(statusProp.enum).toContain('done');
		expect(statusProp.enum).toContain('in-progress');
	});

	it('update schema requires id', () => {
		expect(updateSchema.required).toContain('id');
	});

	it('create schema requires type and title', () => {
		expect(createSchema.required).toEqual(expect.arrayContaining(['type', 'title']));
	});

	// --- WORK-491 / SPEC-117: MCP vocab must not drift from enums.ts ---

	it('update schema status enum includes pending (drift regression guard)', () => {
		// The MCP server previously hard-coded a status list that omitted
		// `pending`, so `plan.update` rejected the valid pending work status.
		const statusProp = (updateSchema.properties as any).status;
		expect(statusProp.enum).toContain('pending');
	});

	it('update schema status enum includes the new terminal work states', () => {
		const statusProp = (updateSchema.properties as any).status;
		expect(statusProp.enum).toContain('cancelled');
		expect(statusProp.enum).toContain('superseded');
	});

	it('update schema severity enum uses cosmetic, not trivial', () => {
		// The MCP server previously listed `trivial` — which `plan validate`
		// then flagged as invalid — instead of the canonical `cosmetic`.
		const severityProp = (updateSchema.properties as any).severity;
		expect(severityProp.enum).toContain('cosmetic');
		expect(severityProp.enum).not.toContain('trivial');
	});
});

describe('plan command mcpHandlers', () => {
	it('nextMcpHandler returns the same shape as runNext', async () => {
		const result = (await nextMcpHandler({ dir: tempDir, count: 1 })) as { items: any[] };
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('WORK-001');
	});

	it('statusMcpHandler returns the status payload', async () => {
		const result = (await statusMcpHandler({ dir: tempDir })) as Record<string, unknown>;
		expect(result.counts).toBeDefined();
		// fresh tempDir with one ready work item
		expect((result.counts as any).work.byStatus.ready).toBe(1);
	});

	it('validateMcpHandler returns a structured result', async () => {
		const result = (await validateMcpHandler({ dir: tempDir })) as Record<string, unknown>;
		expect(result).toHaveProperty('scanned');
		expect(typeof result.scanned).toBe('number');
	});

	it('updateMcpHandler applies status changes', async () => {
		const result = (await updateMcpHandler({
			id: 'WORK-001',
			dir: tempDir,
			status: 'in-progress',
		})) as { changes: any[] };
		expect(result.changes).toHaveLength(1);
		expect(result.changes[0].field).toBe('status');
		expect(result.changes[0].new).toBe('in-progress');
	});

	it('updateMcpHandler accepts the pending status (WORK-491)', async () => {
		const result = (await updateMcpHandler({
			id: 'WORK-001',
			dir: tempDir,
			status: 'pending',
		})) as { changes: any[] };
		expect(result.changes.find(c => c.field === 'status')?.new).toBe('pending');
	});

	it('updateMcpHandler accepts cosmetic bug severity (WORK-491)', async () => {
		writeFileSync(
			join(tempDir, 'BUG-001-example.md'),
			`{% bug id="BUG-001" status="confirmed" severity="major" %}\n\n# Example bug\n\n## Steps to Reproduce\n1. Do a thing\n\n## Expected\nWorks.\n\n## Actual\nBroken.\n\n{% /bug %}\n`,
		);
		const result = (await updateMcpHandler({
			id: 'BUG-001',
			dir: tempDir,
			severity: 'cosmetic',
		})) as { changes: any[] };
		expect(result.changes.find(c => c.field === 'severity')?.new).toBe('cosmetic');
	});

	it('updateMcpHandler accepts a check substring', async () => {
		const result = (await updateMcpHandler({
			id: 'WORK-001',
			dir: tempDir,
			check: 'Criterion one',
		})) as { changes: any[] };
		expect(result.changes.length).toBeGreaterThan(0);
		expect(result.changes[0].field).toMatch(/criterion|checked/i);
	});

	it('createMcpHandler scaffolds a new entity', async () => {
		const result = (await createMcpHandler({
			dir: tempDir,
			type: 'work',
			title: 'New Item',
			id: 'WORK-002',
		})) as { id: string; file: string };
		expect(result.id).toBe('WORK-002');
		expect(result.file).toMatch(/WORK-002/);
	});

	it('nextIdMcpHandler returns the next available id', async () => {
		const result = (await nextIdMcpHandler({ type: 'work', dir: tempDir })) as Record<string, unknown>;
		expect(result.nextId).toBe('WORK-002');
	});

	it('nextIdMcpHandler rejects invalid types', async () => {
		await expect(nextIdMcpHandler({ type: 'milestone', dir: tempDir })).rejects.toThrow();
	});

	it('historyMcpHandler invokes runHistory without throwing', async () => {
		// runHistory currently prints to stdout (returns void); the mcpHandler
		// invokes it for side effects. Future work would refactor runHistory to
		// return structured data so MCP can surface it directly.
		await expect(historyMcpHandler({ dir: tempDir, limit: 5 })).resolves.toBeUndefined();
	});

	it('migrateMcpHandler rejects unknown subcommands', async () => {
		await expect(migrateMcpHandler({ subcommand: 'unknown', dir: tempDir })).rejects.toThrow();
	});
});

describe('plan command mcpHandlers — ctx.cwd resolution', () => {
	// Regression: when an MCP client calls a plan tool without `dir`, the
	// fallback chain (REFRAKT_PLAN_DIR → refrakt.config.json → "plan") must
	// resolve against `ctx.cwd`, not `process.cwd()`. The MCP server is
	// frequently launched from outside the project directory (e.g. /tmp),
	// so process.cwd() is the wrong base.
	let cwdRoot: string;
	let savedEnv: string | undefined;
	let originalCwd: string;

	beforeEach(() => {
		// Pin process.cwd() to a directory with no `plan/` subdir so the
		// regression test fails loudly if the resolver ever falls back to
		// process.cwd() instead of using ctx.cwd.
		originalCwd = process.cwd();
		process.chdir(tmpdir());
		cwdRoot = mkdtempSync(join(tmpdir(), 'refrakt-plan-mcp-cwd-'));
		mkdirSync(join(cwdRoot, 'plan/work'), { recursive: true });
		mkdirSync(join(cwdRoot, 'plan/specs'), { recursive: true });
		mkdirSync(join(cwdRoot, 'plan/milestones'), { recursive: true });
		writeFileSync(
			join(cwdRoot, 'plan/work/WORK-001-example.md'),
			`{% work id="WORK-001" status="ready" priority="medium" complexity="simple" %}\n\n# Example\n\nDescription.\n\n## Acceptance Criteria\n\n- [ ] Criterion one\n\n{% /work %}\n`,
		);
		writeFileSync(
			join(cwdRoot, 'refrakt.config.json'),
			JSON.stringify({ plan: { dir: 'plan' } }),
		);
		savedEnv = process.env.REFRAKT_PLAN_DIR;
		delete process.env.REFRAKT_PLAN_DIR;
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(cwdRoot, { recursive: true, force: true });
		if (savedEnv === undefined) delete process.env.REFRAKT_PLAN_DIR;
		else process.env.REFRAKT_PLAN_DIR = savedEnv;
	});

	it('resolves plan.dir from refrakt.config.json relative to ctx.cwd', async () => {
		const result = (await nextMcpHandler({}, { cwd: cwdRoot })) as { items: any[] };
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('WORK-001');
	});

	it('resolves a relative dir argument against ctx.cwd', async () => {
		const result = (await statusMcpHandler({ dir: 'plan' }, { cwd: cwdRoot })) as Record<string, unknown>;
		expect((result.counts as any).work.byStatus.ready).toBe(1);
	});
});
