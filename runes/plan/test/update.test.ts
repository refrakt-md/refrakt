import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { runUpdate, EXIT_NOT_FOUND, EXIT_VALIDATION_ERROR } from '../src/commands/update.js';

const TMP = join(import.meta.dirname, '.tmp-update-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	const dir = full.substring(0, full.lastIndexOf('/'));
	mkdirSync(dir, { recursive: true });
	writeFileSync(full, content);
}

function readMd(relPath: string): string {
	return readFileSync(join(TMP, relPath), 'utf8');
}

const SAMPLE_WORK = `{% work id="WORK-001" status="ready" priority="high" complexity="moderate" %}

# Build the scanner

## Acceptance Criteria
- [ ] Scans directories
- [ ] Returns typed objects
- [x] Handles edge cases

{% /work %}`;

const SAMPLE_SPEC = `{% spec id="SPEC-001" status="draft" %}

# Authentication System

Token-based auth for the API.

{% /spec %}`;

const SAMPLE_BUG = `{% bug id="BUG-001" status="reported" severity="major" %}

# Button breaks on mobile

## Steps to Reproduce
1. Open on mobile
2. Tap the button

{% /bug %}`;

beforeEach(() => {
	mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

describe('plan update — attribute editing', () => {
	it('updates status attribute in place', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: { status: 'in-progress' } });
		expect(result.changes).toEqual([
			{ field: 'status', old: 'ready', new: 'in-progress' },
		]);
		const content = readMd('work/task.md');
		expect(content).toContain('status="in-progress"');
		expect(content).not.toContain('status="ready"');
	});

	it('updates multiple attributes in a single call', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({
			id: 'WORK-001', dir: TMP,
			attrs: { status: 'in-progress', priority: 'critical', complexity: 'complex' },
		});
		expect(result.changes).toHaveLength(3);
		const content = readMd('work/task.md');
		expect(content).toContain('status="in-progress"');
		expect(content).toContain('priority="critical"');
		expect(content).toContain('complexity="complex"');
	});

	it('adds an attribute that does not exist yet', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: { assignee: 'claude' } });
		expect(result.changes).toEqual([
			{ field: 'assignee', old: '', new: 'claude' },
		]);
		const content = readMd('work/task.md');
		expect(content).toContain('assignee="claude"');
	});

	it('updates spec status', () => {
		writeMd('spec/auth.md', SAMPLE_SPEC);
		const result = runUpdate({ id: 'SPEC-001', dir: TMP, attrs: { status: 'accepted' } });
		expect(result.changes[0]).toEqual({ field: 'status', old: 'draft', new: 'accepted' });
		expect(readMd('spec/auth.md')).toContain('status="accepted"');
	});

	it('updates bug severity', () => {
		writeMd('bug/mobile.md', SAMPLE_BUG);
		const result = runUpdate({ id: 'BUG-001', dir: TMP, attrs: { severity: 'critical' } });
		expect(result.changes[0]).toEqual({ field: 'severity', old: 'major', new: 'critical' });
	});
});

describe('plan update — checkbox toggling', () => {
	it('checks a matching criterion', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: {}, check: 'Scans directories' });
		expect(result.changes).toEqual([
			{ field: 'criterion', old: '[ ] Scans directories', new: '[x] Scans directories' },
		]);
		const content = readMd('work/task.md');
		expect(content).toContain('- [x] Scans directories');
	});

	it('unchecks a matching criterion', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: {}, uncheck: 'Handles edge cases' });
		expect(result.changes).toEqual([
			{ field: 'criterion', old: '[x] Handles edge cases', new: '[ ] Handles edge cases' },
		]);
		const content = readMd('work/task.md');
		expect(content).toContain('- [ ] Handles edge cases');
	});

	it('uses substring matching for criteria', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: {}, check: 'typed objects' });
		expect(result.changes[0].new).toContain('[x] Returns typed objects');
	});

	it('combines attribute changes with checkbox toggling', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({
			id: 'WORK-001', dir: TMP,
			attrs: { status: 'in-progress' },
			check: 'Scans directories',
		});
		expect(result.changes).toHaveLength(2);
		const content = readMd('work/task.md');
		expect(content).toContain('status="in-progress"');
		expect(content).toContain('- [x] Scans directories');
	});
});

describe('plan update — validation', () => {
	it('rejects invalid status for work rune', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		try {
			runUpdate({ id: 'WORK-001', dir: TMP, attrs: { status: 'working' } });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('Invalid status "working"');
			expect(err.message).toContain('draft');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});

	it('rejects invalid status for spec rune', () => {
		writeMd('spec/auth.md', SAMPLE_SPEC);
		try {
			runUpdate({ id: 'SPEC-001', dir: TMP, attrs: { status: 'ready' } });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('Invalid status "ready"');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});

	it('rejects unknown attribute', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		try {
			runUpdate({ id: 'WORK-001', dir: TMP, attrs: { flavor: 'vanilla' } });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('Unknown attribute "flavor"');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});

	it('rejects changing the id attribute', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		try {
			runUpdate({ id: 'WORK-001', dir: TMP, attrs: { id: 'WORK-999' } });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('Cannot change the "id"');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});
});

describe('plan update — error cases', () => {
	it('returns exit code 2 for entity not found', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		try {
			runUpdate({ id: 'WORK-999', dir: TMP, attrs: { status: 'done' } });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('not found');
			expect(err.exitCode).toBe(EXIT_NOT_FOUND);
		}
	});

	it('errors on ambiguous criterion match', () => {
		const content = `{% work id="WORK-002" status="ready" priority="high" %}

# Multiple criteria

## Acceptance Criteria
- [ ] Scanner handles files
- [ ] Scanner handles directories

{% /work %}`;
		writeMd('work/ambiguous.md', content);
		try {
			runUpdate({ id: 'WORK-002', dir: TMP, attrs: {}, check: 'Scanner handles' });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('Ambiguous');
			expect(err.message).toContain('2');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});

	it('errors when no unchecked criterion matches', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		try {
			runUpdate({ id: 'WORK-001', dir: TMP, attrs: {}, check: 'nonexistent criterion' });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('No unchecked criterion');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});

	it('errors when no checked criterion matches for uncheck', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		try {
			runUpdate({ id: 'WORK-001', dir: TMP, attrs: {}, uncheck: 'Scans directories' });
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('No checked criterion');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});
});

describe('plan update — resolution', () => {
	it('appends a resolution section when using --resolve', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({
			id: 'WORK-001', dir: TMP, attrs: {},
			resolve: 'Branch: `claude/feature`\n\n### What was done\n- Built the thing',
		});
		expect(result.changes).toContainEqual(expect.objectContaining({ field: 'resolution' }));
		const content = readMd('work/task.md');
		expect(content).toContain('## Resolution');
		expect(content).toContain('Completed: ');
		expect(content).toContain('Branch: `claude/feature`');
		expect(content).toContain('### What was done');
		// Resolution should be before the closing tag
		const resIdx = content.indexOf('## Resolution');
		const closeIdx = content.indexOf('{% /work %}');
		expect(resIdx).toBeLessThan(closeIdx);
	});

	it('combines --resolve with --status done', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		runUpdate({
			id: 'WORK-001', dir: TMP,
			attrs: { status: 'done' },
			resolve: 'Quick fix',
		});
		const content = readMd('work/task.md');
		expect(content).toContain('status="done"');
		expect(content).toContain('## Resolution');
		expect(content).toContain('Quick fix');
	});

	it('appends to existing resolution with separator', () => {
		const workWithResolution = `{% work id="WORK-001" status="in-progress" priority="high" %}

# Build the scanner

## Resolution

Completed: 2026-03-20

Initial notes here.

{% /work %}`;
		writeMd('work/task.md', workWithResolution);
		runUpdate({
			id: 'WORK-001', dir: TMP, attrs: {},
			resolve: 'Added more context.',
		});
		const content = readMd('work/task.md');
		expect(content).toContain('Initial notes here.');
		expect(content).toContain('---');
		expect(content).toContain('Added more context.');
	});

	it('rejects resolution on spec rune', () => {
		writeMd('spec/auth.md', SAMPLE_SPEC);
		try {
			runUpdate({
				id: 'SPEC-001', dir: TMP, attrs: {},
				resolve: 'Some resolution',
			});
			expect.unreachable('should have thrown');
		} catch (err: any) {
			expect(err.message).toContain('only supported on work and bug');
			expect(err.message).toContain('spec');
			expect(err.exitCode).toBe(EXIT_VALIDATION_ERROR);
		}
	});

	it('works on bug runes', () => {
		writeMd('bug/mobile.md', SAMPLE_BUG);
		runUpdate({
			id: 'BUG-001', dir: TMP,
			attrs: { status: 'fixed' },
			resolve: 'Fixed the click handler',
		});
		const content = readMd('bug/mobile.md');
		expect(content).toContain('status="fixed"');
		expect(content).toContain('## Resolution');
		expect(content).toContain('Fixed the click handler');
	});
});

describe('plan update — attribute clearing', () => {
	it('removes an attribute when value is empty string', () => {
		const content = `{% work id="WORK-001" status="ready" assignee="claude" priority="high" %}\n\n# A\n\n{% /work %}`;
		writeMd('work/task.md', content);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: { assignee: '' } });
		expect(result.changes).toEqual([
			{ field: 'assignee', old: 'claude', new: '(removed)' },
		]);
		const updated = readMd('work/task.md');
		expect(updated).not.toContain('assignee');
		expect(updated).toContain('status="ready"');
		expect(updated).toContain('priority="high"');
	});

	it('removes milestone attribute', () => {
		const content = `{% work id="WORK-001" status="ready" milestone="v1.0" %}\n\n# A\n\n{% /work %}`;
		writeMd('work/task.md', content);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: { milestone: '' } });
		expect(result.changes).toEqual([
			{ field: 'milestone', old: 'v1.0', new: '(removed)' },
		]);
		const updated = readMd('work/task.md');
		expect(updated).not.toContain('milestone');
	});

	it('silently does nothing when clearing a non-existent attribute', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: { assignee: '' } });
		expect(result.changes).toHaveLength(0);
	});

	it('skips enum validation for empty string (clearing)', () => {
		const content = `{% work id="WORK-001" status="ready" complexity="moderate" %}\n\n# A\n\n{% /work %}`;
		writeMd('work/task.md', content);
		// This should not throw even though '' is not a valid complexity value
		const result = runUpdate({ id: 'WORK-001', dir: TMP, attrs: { complexity: '' } });
		expect(result.changes[0].new).toBe('(removed)');
	});
});

describe('plan update — JSON output', () => {
	it('returns structured result for JSON format', () => {
		writeMd('work/task.md', SAMPLE_WORK);
		const result = runUpdate({
			id: 'WORK-001', dir: TMP,
			attrs: { status: 'done' },
			formatJson: true,
		});
		expect(result.file).toBe('work/task.md');
		expect(result.type).toBe('work');
		expect(result.changes).toEqual([
			{ field: 'status', old: 'ready', new: 'done' },
		]);
	});
});
