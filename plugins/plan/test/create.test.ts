import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runCreate } from '../src/commands/create.js';
import { nextId, idExists, runNextId } from '../src/commands/next-id.js';

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

	it('throws on duplicate file for non-prefixed types (milestone)', () => {
		runCreate({ dir: TMP, type: 'milestone', id: 'v1.0', title: 'Same Title' });
		expect(() => runCreate({ dir: TMP, type: 'milestone', id: 'v2.0', title: 'Same Title' }))
			.toThrow('already exists');
	});

	it('allows same-title entries across different IDs for prefixed types', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'Same Title' });
		const second = runCreate({ dir: TMP, type: 'work', id: 'WORK-002', title: 'Same Title' });
		expect(second.file).toMatch(/WORK-002-same-title\.md$/);
	});

	it('throws on missing id for milestone', () => {
		expect(() => runCreate({ dir: TMP, type: 'milestone', title: 'v2.0 Release' }))
			.toThrow('--id is required for type "milestone"');
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

	it('generates {ID}-{slug}.md filenames for work items', () => {
		const result = runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'My Cool Feature' });
		expect(result.file).toMatch(/WORK-001-my-cool-feature\.md$/);
	});

	it('prefixes bug filenames with BUG ID', () => {
		const result = runCreate({ dir: TMP, type: 'bug', id: 'BUG-042', title: 'Crash on Load' });
		expect(result.file).toMatch(/BUG-042-crash-on-load\.md$/);
	});

	it('prefixes spec filenames with SPEC ID', () => {
		const result = runCreate({ dir: TMP, type: 'spec', id: 'SPEC-007', title: 'Auth System' });
		expect(result.file).toMatch(/SPEC-007-auth-system\.md$/);
	});

	it('prefixes decision filenames with ADR ID', () => {
		const result = runCreate({ dir: TMP, type: 'decision', id: 'ADR-003', title: 'Use SQLite' });
		expect(result.file).toMatch(/ADR-003-use-sqlite\.md$/);
	});

	it('does not prefix milestone filenames (they use slug only)', () => {
		const result = runCreate({ dir: TMP, type: 'milestone', id: 'v1.0', title: 'First Release' });
		expect(result.file).toMatch(/first-release\.md$/);
		expect(result.file).not.toMatch(/v1\.0-first-release/);
	});

	it('throws on duplicate ID', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'First' });
		expect(() => runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'Second' }))
			.toThrow('ID "WORK-001" already exists');
	});
});

describe('auto-id', () => {
	it('auto-assigns WORK-001 when no work items exist', () => {
		const result = runCreate({ dir: TMP, type: 'work', title: 'Auto Task' });
		expect(result.id).toBe('WORK-001');
		const content = readFileSync(result.file, 'utf-8');
		expect(content).toContain('id="WORK-001"');
	});

	it('auto-increments from existing items', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-005', title: 'First' });
		const result = runCreate({ dir: TMP, type: 'work', title: 'Second' });
		expect(result.id).toBe('WORK-006');
	});

	it('auto-assigns across different types independently', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-010', title: 'Work Item' });
		runCreate({ dir: TMP, type: 'spec', id: 'SPEC-003', title: 'Spec Item' });

		const bug = runCreate({ dir: TMP, type: 'bug', title: 'A Bug' });
		expect(bug.id).toBe('BUG-001');

		const spec = runCreate({ dir: TMP, type: 'spec', title: 'New Spec' });
		expect(spec.id).toBe('SPEC-004');
	});

	it('auto-assigns for decision type', () => {
		const result = runCreate({ dir: TMP, type: 'decision', title: 'Use REST' });
		expect(result.id).toBe('ADR-001');
	});
});

describe('nextId', () => {
	it('returns WORK-001 for empty directory', () => {
		expect(nextId(TMP, 'work')).toBe('WORK-001');
	});

	it('returns next after highest existing ID', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-042', title: 'Existing' });
		expect(nextId(TMP, 'work')).toBe('WORK-043');
	});

	it('zero-pads to 3 digits', () => {
		runCreate({ dir: TMP, type: 'spec', id: 'SPEC-007', title: 'Existing' });
		expect(nextId(TMP, 'spec')).toBe('SPEC-008');
	});
});

describe('idExists', () => {
	it('returns undefined when ID does not exist', () => {
		expect(idExists(TMP, 'WORK-999')).toBeUndefined();
	});

	it('returns file path when ID exists', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-001', title: 'Test' });
		expect(idExists(TMP, 'WORK-001')).toBeDefined();
	});
});

describe('runNextId', () => {
	it('returns result with null highest when no items exist', () => {
		const result = runNextId(TMP, 'work');
		expect(result.type).toBe('work');
		expect(result.nextId).toBe('WORK-001');
		expect(result.highest).toBeNull();
	});

	it('returns result with highest when items exist', () => {
		runCreate({ dir: TMP, type: 'work', id: 'WORK-010', title: 'Existing' });
		const result = runNextId(TMP, 'work');
		expect(result.nextId).toBe('WORK-011');
		expect(result.highest).toBe('WORK-010');
	});
});
