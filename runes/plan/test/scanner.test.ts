import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { scanPlanFiles, parseFile } from '../src/scanner.js';

const TMP = join(import.meta.dirname, '.tmp-scanner-test');

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

describe('scanPlanFiles', () => {
	it('should scan a directory recursively and find plan runes', () => {
		writeMd('work/task.md', `{% work id="WORK-001" status="ready" priority="high" %}

# Build the scanner

## Acceptance Criteria
- [ ] Scans directories
- [x] Returns typed objects

{% /work %}`);
		writeMd('spec/auth.md', `{% spec id="SPEC-001" status="accepted" %}

# Authentication System

Token-based auth for the API.

{% /spec %}`);
		writeMd('notes.md', '# Just a regular markdown file\n\nNo plan runes here.');

		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(2);

		const types = entities.map(e => e.type).sort();
		expect(types).toEqual(['spec', 'work']);
	});

	it('should handle all 5 rune types', () => {
		writeMd('spec.md', '{% spec id="SPEC-001" status="draft" %}\n\n# A Spec\n\n{% /spec %}');
		writeMd('work.md', '{% work id="WORK-001" status="ready" %}\n\n# A Task\n\n{% /work %}');
		writeMd('bug.md', '{% bug id="BUG-001" status="confirmed" severity="major" %}\n\n# A Bug\n\n{% /bug %}');
		writeMd('decision.md', '{% decision id="ADR-001" status="accepted" date="2026-03-01" %}\n\n# A Decision\n\n{% /decision %}');
		writeMd('milestone.md', '{% milestone name="v1.0" status="active" target="2026-04-01" %}\n\n# v1.0\n\n{% /milestone %}');

		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(5);

		const types = new Set(entities.map(e => e.type));
		expect(types).toEqual(new Set(['spec', 'work', 'bug', 'decision', 'milestone']));
	});

	it('should extract all attributes from the rune opening tag', () => {
		writeMd('work.md', `{% work id="WORK-042" status="in-progress" priority="high" complexity="moderate" tags="cli, plan" milestone="v0.5.0" %}

# My Task

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.attributes).toEqual({
			id: 'WORK-042',
			status: 'in-progress',
			priority: 'high',
			complexity: 'moderate',
			tags: 'cli, plan',
			milestone: 'v0.5.0',
		});
	});

	it('should extract title from the first H1 heading', () => {
		writeMd('work.md', `{% work id="WORK-001" status="ready" %}

# Build the Scanner Library

## Not this heading

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.title).toBe('Build the Scanner Library');
	});

	it('should return undefined title when no H1 exists', () => {
		writeMd('work.md', `{% work id="WORK-001" status="ready" %}

## Only H2 headings here

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.title).toBeUndefined();
	});

	it('should extract acceptance criteria checkboxes', () => {
		writeMd('work.md', `{% work id="WORK-001" status="ready" %}

# Task

## Acceptance Criteria
- [ ] First unchecked criterion
- [x] Second checked criterion
- [ ] Third unchecked criterion

## Approach
Some text here.

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.criteria).toEqual([
			{ text: 'First unchecked criterion', checked: false },
			{ text: 'Second checked criterion', checked: true },
			{ text: 'Third unchecked criterion', checked: false },
		]);
	});

	it('should extract reference IDs from ref/xref tags', () => {
		writeMd('work.md', `{% work id="WORK-001" status="ready" %}

# Task

> Ref: {% ref "SPEC-022" /%} (Plan CLI)

## Dependencies

- {% ref "WORK-021" /%} (xref migration)
- {% xref "WORK-026" /%} (ref alias)

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.refs).toEqual(['SPEC-022', 'WORK-021', 'WORK-026']);
	});

	it('should deduplicate reference IDs', () => {
		writeMd('work.md', `{% work id="WORK-001" status="ready" %}

# Task

See {% ref "SPEC-022" /%} for details.

## References

- {% ref "SPEC-022" /%} (Plan CLI)

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.refs).toEqual(['SPEC-022']);
	});

	it('should set file path relative to the scan directory', () => {
		writeMd('work/deep/nested/task.md', `{% work id="WORK-001" status="ready" %}

# Task

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.file).toBe('work/deep/nested/task.md');
	});

	it('should skip files without plan runes', () => {
		writeMd('readme.md', '# README\n\nJust a normal file.');
		writeMd('work.md', '{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}');

		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(1);
		expect(entities[0].type).toBe('work');
	});

	it('should handle files with no criteria', () => {
		writeMd('spec.md', `{% spec id="SPEC-001" status="draft" %}

# A Spec

Just prose, no checkboxes.

{% /spec %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.criteria).toEqual([]);
	});

	it('should handle files with no refs', () => {
		writeMd('work.md', `{% work id="WORK-001" status="ready" %}

# Standalone Task

No references here.

{% /work %}`);

		const [entity] = scanPlanFiles(TMP);
		expect(entity.refs).toEqual([]);
	});
});

describe('caching', () => {
	it('should create a .plan-cache.json when cache is enabled', () => {
		writeMd('work.md', '{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}');

		scanPlanFiles(TMP, { cache: true });
		expect(existsSync(join(TMP, '.plan-cache.json'))).toBe(true);
	});

	it('should return same results from cache on second scan', () => {
		writeMd('work.md', '{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}');

		const first = scanPlanFiles(TMP, { cache: true });
		const second = scanPlanFiles(TMP, { cache: true });
		expect(second).toEqual(first);
	});

	it('should not create cache file when cache is disabled', () => {
		writeMd('work.md', '{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}');

		scanPlanFiles(TMP);
		expect(existsSync(join(TMP, '.plan-cache.json'))).toBe(false);
	});

	it('should prune deleted files from cache', () => {
		writeMd('a.md', '{% work id="WORK-001" status="ready" %}\n\n# A\n\n{% /work %}');
		writeMd('b.md', '{% work id="WORK-002" status="ready" %}\n\n# B\n\n{% /work %}');

		scanPlanFiles(TMP, { cache: true });

		// Delete one file
		rmSync(join(TMP, 'b.md'));

		const entities = scanPlanFiles(TMP, { cache: true });
		expect(entities).toHaveLength(1);
		expect(entities[0].attributes.id).toBe('WORK-001');

		// Cache should only contain the remaining file
		const cache = JSON.parse(readFileSync(join(TMP, '.plan-cache.json'), 'utf8'));
		expect(Object.keys(cache)).toEqual(['a.md']);
	});

	it('should re-parse files when mtime changes', () => {
		writeMd('work.md', '{% work id="WORK-001" status="ready" %}\n\n# Original Title\n\n{% /work %}');

		const first = scanPlanFiles(TMP, { cache: true });
		expect(first[0].title).toBe('Original Title');

		// Modify the file (with a small delay to ensure mtime changes)
		const future = Date.now() + 2000;
		writeMd('work.md', '{% work id="WORK-001" status="done" %}\n\n# Updated Title\n\n{% /work %}');
		const { utimesSync } = require('fs');
		utimesSync(join(TMP, 'work.md'), future / 1000, future / 1000);

		const second = scanPlanFiles(TMP, { cache: true });
		expect(second[0].title).toBe('Updated Title');
		expect(second[0].attributes.status).toBe('done');
	});
});

describe('edge cases', () => {
	it('should handle malformed files gracefully (no closing tag)', () => {
		writeMd('bad.md', '{% work id="WORK-001" status="ready" %}\n\n# Unclosed\n\nNo closing tag.');

		// Should not throw — Markdoc handles unclosed tags
		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(1);
		expect(entities[0].attributes.id).toBe('WORK-001');
	});

	it('should handle empty files', () => {
		writeMd('empty.md', '');

		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(0);
	});

	it('should handle files with only non-plan tags', () => {
		writeMd('other.md', '{% nav %}\n\n# Navigation\n\n{% /nav %}');

		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(0);
	});

	it('should handle an empty directory', () => {
		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(0);
	});

	it('should only use the first plan rune tag in a file', () => {
		writeMd('multi.md', `{% work id="WORK-001" status="ready" %}

# First

{% /work %}

{% spec id="SPEC-001" status="draft" %}

# Second

{% /spec %}`);

		const entities = scanPlanFiles(TMP);
		expect(entities).toHaveLength(1);
		expect(entities[0].type).toBe('work');
		expect(entities[0].attributes.id).toBe('WORK-001');
	});
});
