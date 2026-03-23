import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runCreate } from '../src/commands/create.js';

const TMP = join(import.meta.dirname, '.tmp-create-test');

beforeEach(() => {
	mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

describe('plan create', () => {
	it('creates a work item from template', () => {
		const result = runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'My Task' });
		expect(result.type).toBe('work');
		expect(result.id).toBe('WORK-001');
		expect(existsSync(result.file)).toBe(true);

		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('{% work');
		expect(content).toContain('id="WORK-001"');
		expect(content).toContain('# My Task');
		expect(content).toContain('## Acceptance Criteria');
	});

	it('creates a bug from template', () => {
		const result = runCreate({ dir: TMP, type: 'bug', id: 'BUG-001', title: 'Crash on Load' });
		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('{% bug');
		expect(content).toContain('id="BUG-001"');
		expect(content).toContain('## Steps to Reproduce');
	});

	it('creates a decision from template', () => {
		const result = runCreate({ dir: TMP, type: 'decision', id: 'ADR-001', title: 'Use SQLite' });
		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('{% decision');
		expect(content).toContain('id="ADR-001"');
		expect(content).toContain('## Options Considered');
	});

	it('creates a spec from template', () => {
		const result = runCreate({ dir: TMP, type: 'spec', id: 'SPEC-001', title: 'Auth System' });
		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('{% spec');
		expect(content).toContain('id="SPEC-001"');
	});

	it('creates a milestone from template', () => {
		const result = runCreate({ dir: TMP, type: 'milestone', id: 'v1.0', title: 'First Release' });
		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('{% milestone');
		expect(content).toContain('name="v1.0"');
		expect(content).toContain('# v1.0 — First Release');
	});

	it('creates directories if they do not exist', () => {
		const dir = join(TMP, 'nested', 'plan');
		runCreate({ dir, type: 'work', id: 'WORK-001', title: 'Test' });
		expect(existsSync(join(dir, 'work'))).toBe(true);
	});

	it('throws on duplicate file', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'Same Title' });
		expect(() => runCreate({ dir: TMP, type: 'work', id: 'WORK-002', title: 'Same Title' }))
			.toThrow('already exists');
	});

	it('throws on missing id', () => {
		expect(() => runCreate({ dir: TMP, type: 'work', id: '', title: 'Test' }))
			.toThrow('--id is required');
	});

	it('throws on missing title', () => {
		expect(() => runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: '' }))
			.toThrow('--title is required');
	});

	it('throws on invalid type', () => {
		expect(() => runCreate({ dir: TMP, type: 'invalid' as any, id: 'X-001', title: 'Test' }))
			.toThrow('Invalid type');
	});

	it('passes extra attrs through to template', () => {
		const result = runCreate({
			dir: TMP, type: 'work', id: 'WORK-001', title: 'Test',
			attrs: { priority: 'critical', tags: 'cli' },
		});
		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('priority="critical"');
		expect(content).toContain('tags="cli"');
	});

	it('generates slug-based filenames', () => {
		const result = runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'My Cool Feature' });
		expect(result.file).toContain('my-cool-feature.md');
	});
});
