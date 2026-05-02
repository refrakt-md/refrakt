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
