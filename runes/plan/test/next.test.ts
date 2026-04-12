import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runNext } from '../src/commands/next.js';

const TMP = join(import.meta.dirname, '.tmp-next-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	const dir = full.substring(0, full.lastIndexOf('/'));
	mkdirSync(dir, { recursive: true });
	writeFileSync(full, content);
}

beforeEach(() => {
	mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

describe('plan next — basic selection', () => {
	it('finds a ready work item', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" complexity="simple" %}
# Task A
{% /work %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('WORK-001');
		expect(result.items[0].title).toBe('Task A');
	});

	it('finds a confirmed bug', () => {
		writeMd('bug/b.md', `{% bug id="BUG-001" status="confirmed" severity="major" %}
# Mobile crash
{% /bug %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('BUG-001');
		expect(result.items[0].type).toBe('bug');
	});

	it('skips non-ready items', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="done" priority="high" %}
# Done task
{% /work %}`);
		writeMd('work/b.md', `{% work id="WORK-002" status="in-progress" priority="high" %}
# In progress task
{% /work %}`);
		writeMd('work/c.md', `{% work id="WORK-003" status="draft" priority="high" %}
# Draft task
{% /work %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(0);
	});

	it('returns empty when no items exist', () => {
		writeMd('spec/a.md', `{% spec id="SPEC-001" status="accepted" %}
# Some spec
{% /spec %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(0);
	});
});

describe('plan next — priority and complexity sorting', () => {
	it('sorts by priority (critical > high > medium > low)', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="low" %}
# Low priority
{% /work %}`);
		writeMd('work/b.md', `{% work id="WORK-002" status="ready" priority="critical" %}
# Critical priority
{% /work %}`);
		writeMd('work/c.md', `{% work id="WORK-003" status="ready" priority="high" %}
# High priority
{% /work %}`);
		const result = runNext({ dir: TMP, count: 3 });
		expect(result.items.map(i => i.id)).toEqual(['WORK-002', 'WORK-003', 'WORK-001']);
	});

	it('uses complexity as tiebreaker (simpler first)', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" complexity="complex" %}
# Complex task
{% /work %}`);
		writeMd('work/b.md', `{% work id="WORK-002" status="ready" priority="high" complexity="trivial" %}
# Trivial task
{% /work %}`);
		const result = runNext({ dir: TMP, count: 2 });
		expect(result.items[0].id).toBe('WORK-002');
		expect(result.items[1].id).toBe('WORK-001');
	});
});

describe('plan next — dependency exclusion', () => {
	it('excludes items with unfinished dependencies', () => {
		writeMd('work/dep.md', `{% work id="WORK-001" status="in-progress" priority="high" %}
# Dependency (not done)
{% /work %}`);
		writeMd('work/blocked.md', `{% work id="WORK-002" status="ready" priority="critical" %}
# Blocked by WORK-001

## References
- {% ref "WORK-001" /%}
{% /work %}`);
		writeMd('work/free.md', `{% work id="WORK-003" status="ready" priority="low" %}
# No dependencies
{% /work %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('WORK-003');
	});

	it('includes items whose dependencies are done', () => {
		writeMd('work/dep.md', `{% work id="WORK-001" status="done" priority="high" %}
# Done dependency
{% /work %}`);
		writeMd('work/ready.md', `{% work id="WORK-002" status="ready" priority="high" %}
# Ready with done dep

## References
- {% ref "WORK-001" /%}
{% /work %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('WORK-002');
	});

	it('allows items referencing non-existent entities (e.g. specs)', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" %}
# References an external spec

## References
- {% ref "SPEC-999" /%}
{% /work %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('WORK-001');
	});
});

describe('plan next — filters', () => {
	beforeEach(() => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" milestone="v1.0" tags="cli, plan" assignee="alice" %}
# Task A
{% /work %}`);
		writeMd('work/b.md', `{% work id="WORK-002" status="ready" priority="medium" milestone="v2.0" tags="docs" assignee="bob" %}
# Task B
{% /work %}`);
		writeMd('bug/c.md', `{% bug id="BUG-001" status="confirmed" severity="major" tags="cli" %}
# Bug C
{% /bug %}`);
	});

	it('--milestone filters by milestone', () => {
		const result = runNext({ dir: TMP, milestone: 'v1.0', count: 5 });
		expect(result.items.map(i => i.id)).toEqual(['WORK-001']);
	});

	it('--tag filters by tag', () => {
		const result = runNext({ dir: TMP, tag: 'cli', count: 5 });
		expect(result.items.map(i => i.id)).toEqual(['WORK-001', 'BUG-001']);
	});

	it('--assignee filters by assignee', () => {
		const result = runNext({ dir: TMP, assignee: 'bob', count: 5 });
		expect(result.items.map(i => i.id)).toEqual(['WORK-002']);
	});

	it('--type work excludes bugs', () => {
		const result = runNext({ dir: TMP, type: 'work', count: 5 });
		expect(result.items.every(i => i.type === 'work')).toBe(true);
	});

	it('--type bug excludes work items', () => {
		const result = runNext({ dir: TMP, type: 'bug', count: 5 });
		expect(result.items).toHaveLength(1);
		expect(result.items[0].type).toBe('bug');
	});
});

describe('plan next — count', () => {
	it('--count N returns top N items', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" %}
# A
{% /work %}`);
		writeMd('work/b.md', `{% work id="WORK-002" status="ready" priority="medium" %}
# B
{% /work %}`);
		writeMd('work/c.md', `{% work id="WORK-003" status="ready" priority="low" %}
# C
{% /work %}`);
		const result = runNext({ dir: TMP, count: 2 });
		expect(result.items).toHaveLength(2);
		expect(result.items[0].id).toBe('WORK-001');
		expect(result.items[1].id).toBe('WORK-002');
	});

	it('defaults to 1 item', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" %}
# A
{% /work %}`);
		writeMd('work/b.md', `{% work id="WORK-002" status="ready" priority="medium" %}
# B
{% /work %}`);
		const result = runNext({ dir: TMP });
		expect(result.items).toHaveLength(1);
	});
});

describe('plan next — section-aware blocking', () => {
	it('only Dependencies refs block when Dependencies section exists', () => {
		writeMd('work/dep.md', `{% work id="WORK-001" status="in-progress" priority="high" %}
# Still working
{% /work %}`);
		writeMd('work/informational.md', `{% work id="WORK-002" status="ready" priority="high" %}
# Has WORK-001 in References only

## References
- {% ref "WORK-001" /%}
{% /work %}`);
		// Without a Dependencies section, all refs block (backward compat)
		const result1 = runNext({ dir: TMP, count: 5 });
		expect(result1.items.map(i => i.id)).not.toContain('WORK-002');
	});

	it('informational refs in References do not block when Dependencies section exists', () => {
		writeMd('work/dep.md', `{% work id="WORK-001" status="in-progress" priority="high" %}
# Still working
{% /work %}`);
		writeMd('work/a.md', `{% work id="WORK-002" status="ready" priority="high" %}
# Has WORK-001 in References but Dependencies is empty

## Dependencies

## References
- {% ref "WORK-001" /%}
{% /work %}`);
		// With a Dependencies section (even empty), only deps block — WORK-001 in References doesn't block
		const result = runNext({ dir: TMP, count: 5 });
		expect(result.items.map(i => i.id)).toContain('WORK-002');
	});

	it('Dependencies refs still block', () => {
		writeMd('work/dep.md', `{% work id="WORK-001" status="in-progress" priority="high" %}
# Still working
{% /work %}`);
		writeMd('work/a.md', `{% work id="WORK-002" status="ready" priority="high" %}
# Has WORK-001 as actual dependency

## Dependencies
- {% ref "WORK-001" /%}

## References
- {% ref "SPEC-001" /%}
{% /work %}`);
		const result = runNext({ dir: TMP, count: 5 });
		expect(result.items.map(i => i.id)).not.toContain('WORK-002');
	});
});

describe('plan next — JSON output includes full data', () => {
	it('includes criteria and refs in result', () => {
		writeMd('work/a.md', `{% work id="WORK-001" status="ready" priority="high" complexity="moderate" %}
# Full task

## Acceptance Criteria
- [ ] First criterion
- [x] Second criterion

## References
- {% ref "SPEC-001" /%}
{% /work %}`);
		const result = runNext({ dir: TMP, formatJson: true });
		expect(result.items[0].criteria).toEqual([
			{ text: 'First criterion', checked: false },
			{ text: 'Second criterion', checked: true },
		]);
		expect(result.items[0].refs).toEqual(['SPEC-001']);
		expect(result.items[0].attributes).toHaveProperty('status', 'ready');
	});
});
