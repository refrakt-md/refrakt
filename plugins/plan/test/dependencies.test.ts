import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { parseFileContent, buildBlockedByAdjacency } from '../src/scanner-core.js';
import { runValidate } from '../src/commands/validate.js';
import { runMigrateDependencies } from '../src/commands/migrate.js';

const TMP = join(import.meta.dirname, '.tmp-deps-test');

function writeMd(relPath: string, content: string) {
	const full = join(TMP, relPath);
	mkdirSync(full.substring(0, full.lastIndexOf('/')), { recursive: true });
	writeFileSync(full, content);
}

beforeEach(() => {
	rmSync(TMP, { recursive: true, force: true });
	mkdirSync(TMP, { recursive: true });
});
afterEach(() => {
	rmSync(TMP, { recursive: true, force: true });
});

// --- Typed directed edges (SPEC-114) ---

describe('directed dependency edges', () => {
	it('derives blocked-by from a Blocked by section', () => {
		const e = parseFileContent('{% work id="WORK-001" status="ready" %}\n# A\n\n## Blocked by\n- {% ref "WORK-002" /%}\n{% /work %}', 'a.md')!;
		expect(e.dependencies).toEqual([{ id: 'WORK-002', direction: 'blocked-by' }]);
	});

	it('derives blocks from a Blocks section', () => {
		const e = parseFileContent('{% work id="WORK-001" status="ready" %}\n# A\n\n## Blocks\n- {% ref "WORK-002" /%}\n{% /work %}', 'a.md')!;
		expect(e.dependencies).toEqual([{ id: 'WORK-002', direction: 'blocks' }]);
	});

	it('treats `## Dependencies` as a deprecated alias of Blocked by', () => {
		const e = parseFileContent('{% work id="WORK-001" status="ready" %}\n# A\n\n## Dependencies\n- {% ref "WORK-002" /%}\n{% /work %}', 'a.md')!;
		expect(e.dependencies).toEqual([{ id: 'WORK-002', direction: 'blocked-by' }]);
	});

	it('excludes prose / References refs from the typed edges', () => {
		const e = parseFileContent('{% work id="WORK-001" status="ready" %}\n# A\n\nMentions {% ref "WORK-009" /%}.\n\n## References\n- {% ref "SPEC-001" /%}\n{% /work %}', 'a.md')!;
		expect(e.dependencies).toEqual([]);
	});

	it('normalises both directions into "A blocked by B" adjacency', () => {
		const a = parseFileContent('{% work id="WORK-001" status="ready" %}\n# A\n\n## Blocked by\n- {% ref "WORK-002" /%}\n{% /work %}', 'a.md')!;
		const c = parseFileContent('{% work id="WORK-003" status="ready" %}\n# C\n\n## Blocks\n- {% ref "WORK-004" /%}\n{% /work %}', 'c.md')!;
		const adj = buildBlockedByAdjacency([a, c]);
		// WORK-001 is blocked by WORK-002.
		expect(adj.get('WORK-001')).toEqual(['WORK-002']);
		// WORK-003 blocks WORK-004 → WORK-004 is blocked by WORK-003.
		expect(adj.get('WORK-004')).toEqual(['WORK-003']);
	});
});

// --- Migration (WORK-443) ---

describe('migrate dependencies', () => {
	it('renames `## Dependencies` headings to `## Blocked by` on --apply', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n## Dependencies\n- {% ref "WORK-002" /%}\n{% /work %}');
		const dry = runMigrateDependencies({ dir: TMP });
		expect(dry.mode).toBe('dry-run');
		expect(dry.renamed).toHaveLength(1);
		// Dry-run leaves the file untouched.
		expect(readFileSync(join(TMP, 'work/a.md'), 'utf8')).toContain('## Dependencies');

		const applied = runMigrateDependencies({ dir: TMP, apply: true });
		expect(applied.renamed).toHaveLength(1);
		const content = readFileSync(join(TMP, 'work/a.md'), 'utf8');
		expect(content).toContain('## Blocked by');
		expect(content).not.toContain('## Dependencies');
	});

	it('flags reverse-direction entries without auto-flipping them', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n## Dependencies\n- Unblocks {% ref "WORK-002" /%} once done\n{% /work %}');
		const result = runMigrateDependencies({ dir: TMP });
		expect(result.reverseFlags).toHaveLength(1);
		expect(result.reverseFlags[0].file).toBe('work/a.md');
		// It renames the heading but does NOT move the entry to Blocks.
		expect(result.renamed).toHaveLength(1);
	});
});

// --- End-to-end: corpus stays clean, real deadlocks still caught ---

describe('cycle detection on directed edges', () => {
	it('reports zero cycles for a prose cross-reference pair', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="done" %}\n# A\n\nSee {% ref "WORK-002" /%}.\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="done" %}\n# B\n\nSee {% ref "WORK-001" /%}.\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'circular-dependency')).toHaveLength(0);
	});

	it('still catches a genuine directed deadlock', () => {
		writeMd('work/a.md', '{% work id="WORK-001" status="ready" %}\n# A\n\n## Blocked by\n- {% ref "WORK-002" /%}\n{% /work %}');
		writeMd('work/b.md', '{% work id="WORK-002" status="ready" %}\n# B\n\n## Blocked by\n- {% ref "WORK-001" /%}\n{% /work %}');
		const result = runValidate({ dir: TMP });
		expect(result.issues.filter(i => i.type === 'circular-dependency').length).toBeGreaterThanOrEqual(1);
	});
});
