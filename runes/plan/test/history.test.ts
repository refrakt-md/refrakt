import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import {
	parseTagAttributes,
	parseCheckboxes,
	hasResolutionSection,
	diffAttributes,
	diffCriteria,
	extractEntityHistory,
} from '../src/history.js';

// ─── Unit tests (no git required) ───

describe('parseTagAttributes', () => {
	it('parses a standard plan rune opening tag', () => {
		const line = '{% work id="WORK-001" status="ready" priority="high" %}';
		expect(parseTagAttributes(line)).toEqual({
			id: 'WORK-001',
			status: 'ready',
			priority: 'high',
		});
	});

	it('parses all plan entity types', () => {
		expect(parseTagAttributes('{% spec id="SPEC-038" status="draft" version="1.0" %}')).toEqual({
			id: 'SPEC-038',
			status: 'draft',
			version: '1.0',
		});
		expect(parseTagAttributes('{% bug id="BUG-001" status="confirmed" severity="major" %}')).toEqual({
			id: 'BUG-001',
			status: 'confirmed',
			severity: 'major',
		});
	});

	it('handles empty attributes', () => {
		expect(parseTagAttributes('{% work %}')).toEqual({});
	});

	it('handles tags with source containing multiple IDs', () => {
		const line = '{% work id="WORK-024" source="SPEC-001,SPEC-002" %}';
		expect(parseTagAttributes(line)).toEqual({
			id: 'WORK-024',
			source: 'SPEC-001,SPEC-002',
		});
	});
});

describe('parseCheckboxes', () => {
	it('extracts checked and unchecked items', () => {
		const content = `# Task

## Acceptance Criteria
- [ ] First unchecked
- [x] Second checked
- [ ] Third unchecked
- [X] Fourth checked (uppercase)
`;
		const result = parseCheckboxes(content);
		expect(result).toEqual([
			{ text: 'First unchecked', checked: false },
			{ text: 'Second checked', checked: true },
			{ text: 'Third unchecked', checked: false },
			{ text: 'Fourth checked (uppercase)', checked: true },
		]);
	});

	it('handles content with no checkboxes', () => {
		expect(parseCheckboxes('# Just a heading\n\nSome text.')).toEqual([]);
	});

	it('handles indented checkboxes', () => {
		const content = '  - [ ] Indented item\n    - [x] Deeply indented';
		const result = parseCheckboxes(content);
		expect(result).toHaveLength(2);
		expect(result[0].text).toBe('Indented item');
		expect(result[1].text).toBe('Deeply indented');
	});
});

describe('hasResolutionSection', () => {
	it('detects a resolution section', () => {
		expect(hasResolutionSection('## Resolution\n\nCompleted: 2026-04-01')).toBe(true);
	});

	it('returns false when no resolution section exists', () => {
		expect(hasResolutionSection('## Approach\n\nDo the thing.')).toBe(false);
	});

	it('does not match H3 or deeper', () => {
		expect(hasResolutionSection('### Resolution\n\nNot a real resolution.')).toBe(false);
	});
});

describe('diffAttributes', () => {
	it('detects changed attributes', () => {
		const prev = { id: 'WORK-001', status: 'ready', priority: 'low' };
		const curr = { id: 'WORK-001', status: 'in-progress', priority: 'high' };
		const changes = diffAttributes(prev, curr);
		expect(changes).toContainEqual({ field: 'status', from: 'ready', to: 'in-progress' });
		expect(changes).toContainEqual({ field: 'priority', from: 'low', to: 'high' });
		expect(changes).not.toContainEqual(expect.objectContaining({ field: 'id' }));
	});

	it('detects added attributes', () => {
		const prev = { id: 'WORK-001', status: 'ready' };
		const curr = { id: 'WORK-001', status: 'ready', milestone: 'v1.0' };
		const changes = diffAttributes(prev, curr);
		expect(changes).toEqual([{ field: 'milestone', from: null, to: 'v1.0' }]);
	});

	it('detects removed attributes', () => {
		const prev = { id: 'WORK-001', status: 'ready', assignee: 'alice' };
		const curr = { id: 'WORK-001', status: 'ready' };
		const changes = diffAttributes(prev, curr);
		expect(changes).toEqual([{ field: 'assignee', from: 'alice', to: null }]);
	});

	it('returns empty array when nothing changed', () => {
		const attrs = { id: 'WORK-001', status: 'ready' };
		expect(diffAttributes(attrs, attrs)).toEqual([]);
	});
});

describe('diffCriteria', () => {
	it('detects checked criteria', () => {
		const prev = [{ text: 'Unit tests pass', checked: false }];
		const curr = [{ text: 'Unit tests pass', checked: true }];
		expect(diffCriteria(prev, curr)).toEqual([
			{ text: 'Unit tests pass', action: 'checked' },
		]);
	});

	it('detects unchecked criteria', () => {
		const prev = [{ text: 'Unit tests pass', checked: true }];
		const curr = [{ text: 'Unit tests pass', checked: false }];
		expect(diffCriteria(prev, curr)).toEqual([
			{ text: 'Unit tests pass', action: 'unchecked' },
		]);
	});

	it('detects added criteria', () => {
		const prev = [{ text: 'Existing', checked: false }];
		const curr = [
			{ text: 'Existing', checked: false },
			{ text: 'New criterion', checked: false },
		];
		expect(diffCriteria(prev, curr)).toEqual([
			{ text: 'New criterion', action: 'added' },
		]);
	});

	it('detects removed criteria', () => {
		const prev = [
			{ text: 'Keep this', checked: false },
			{ text: 'Remove this', checked: false },
		];
		const curr = [{ text: 'Keep this', checked: false }];
		expect(diffCriteria(prev, curr)).toEqual([
			{ text: 'Remove this', action: 'removed' },
		]);
	});

	it('handles multiple simultaneous changes', () => {
		const prev = [
			{ text: 'A', checked: false },
			{ text: 'B', checked: true },
			{ text: 'C', checked: false },
		];
		const curr = [
			{ text: 'A', checked: true },   // checked
			{ text: 'B', checked: true },   // unchanged
			// C removed
			{ text: 'D', checked: false },  // added
		];
		const changes = diffCriteria(prev, curr);
		expect(changes).toContainEqual({ text: 'A', action: 'checked' });
		expect(changes).toContainEqual({ text: 'C', action: 'removed' });
		expect(changes).toContainEqual({ text: 'D', action: 'added' });
		expect(changes).not.toContainEqual(expect.objectContaining({ text: 'B' }));
	});

	it('returns empty when nothing changed', () => {
		const list = [{ text: 'Same', checked: false }];
		expect(diffCriteria(list, list)).toEqual([]);
	});
});

// ─── Integration tests (require git) ───

const TMP = join(import.meta.dirname, '.tmp-history-test');

function git(cmd: string) {
	execSync(`git ${cmd}`, { cwd: TMP, stdio: ['pipe', 'pipe', 'pipe'] });
}

function writeAndCommit(relPath: string, content: string, message: string) {
	const full = join(TMP, relPath);
	const dir = full.substring(0, full.lastIndexOf('/'));
	mkdirSync(dir, { recursive: true });
	writeFileSync(full, content);
	git(`add "${relPath}"`);
	git(`commit -m "${message}"`);
}

describe('extractEntityHistory', () => {
	beforeEach(() => {
		mkdirSync(TMP, { recursive: true });
		git('init');
		git('config user.email "test@test.com"');
		git('config user.name "Test Author"');
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns a single created event for a new file', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="draft" priority="low" %}\n\n# My Task\n\n{% /work %}',
			'Create WORK-001',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(1);
		expect(events[0].kind).toBe('created');
		expect(events[0].author).toBe('Test Author');
		expect(events[0].message).toBe('Create WORK-001');
		expect(events[0].initialAttributes).toEqual({
			id: 'WORK-001',
			status: 'draft',
			priority: 'low',
		});
	});

	it('detects attribute changes across commits', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="draft" priority="low" %}\n\n# Task\n\n{% /work %}',
			'Create task',
		);
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" priority="high" %}\n\n# Task\n\n{% /work %}',
			'Promote task',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(2);
		expect(events[0].kind).toBe('created');
		expect(events[1].kind).toBe('attributes');
		expect(events[1].attributeChanges).toContainEqual({ field: 'status', from: 'draft', to: 'ready' });
		expect(events[1].attributeChanges).toContainEqual({ field: 'priority', from: 'low', to: 'high' });
		expect(events[1].message).toBe('Promote task');
	});

	it('detects criteria changes', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\n## AC\n- [ ] Write tests\n- [ ] Write docs\n\n{% /work %}',
			'Create task',
		);
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\n## AC\n- [x] Write tests\n- [ ] Write docs\n\n{% /work %}',
			'Check off tests',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(2);
		expect(events[1].kind).toBe('criteria');
		expect(events[1].criteriaChanges).toEqual([
			{ text: 'Write tests', action: 'checked' },
		]);
	});

	it('detects resolution section being added', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}',
			'Create task',
		);
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="done" %}\n\n# Task\n\n## Resolution\n\nCompleted: 2026-04-12\n\n{% /work %}',
			'Mark done',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(2);
		// The status change takes priority as the event kind
		expect(events[1].kind).toBe('attributes');
		expect(events[1].attributeChanges).toContainEqual({ field: 'status', from: 'ready', to: 'done' });
	});

	it('detects resolution-only change', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="done" %}\n\n# Task\n\n{% /work %}',
			'Create done task',
		);
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="done" %}\n\n# Task\n\n## Resolution\n\nCompleted: 2026-04-12\n\n{% /work %}',
			'Add resolution',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(2);
		expect(events[1].kind).toBe('resolution');
	});

	it('falls back to content event for body-only edits', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\nOriginal description.\n\n{% /work %}',
			'Create task',
		);
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\nUpdated description with more detail.\n\n{% /work %}',
			'Expand description',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(2);
		expect(events[1].kind).toBe('content');
		expect(events[1].message).toBe('Expand description');
	});

	it('handles combined attribute + criteria changes in one commit', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\n- [ ] Step A\n- [ ] Step B\n\n{% /work %}',
			'Create',
		);
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="done" %}\n\n# Task\n\n- [x] Step A\n- [x] Step B\n\n{% /work %}',
			'Complete task',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(2);
		expect(events[1].kind).toBe('attributes');
		expect(events[1].attributeChanges).toContainEqual({ field: 'status', from: 'ready', to: 'done' });
		expect(events[1].criteriaChanges).toContainEqual({ text: 'Step A', action: 'checked' });
		expect(events[1].criteriaChanges).toContainEqual({ text: 'Step B', action: 'checked' });
	});

	it('handles multi-step lifecycle', () => {
		// Create
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="draft" priority="low" %}\n\n# Task\n\n- [ ] Build it\n- [ ] Test it\n\n{% /work %}',
			'Draft task',
		);
		// Ready
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" priority="medium" %}\n\n# Task\n\n- [ ] Build it\n- [ ] Test it\n\n{% /work %}',
			'Mark ready',
		);
		// In progress
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="in-progress" priority="medium" %}\n\n# Task\n\n- [ ] Build it\n- [ ] Test it\n\n{% /work %}',
			'Start working',
		);
		// Check first criterion
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="in-progress" priority="medium" %}\n\n# Task\n\n- [x] Build it\n- [ ] Test it\n\n{% /work %}',
			'Built it',
		);
		// Done
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="done" priority="medium" %}\n\n# Task\n\n- [x] Build it\n- [x] Test it\n\n## Resolution\n\nCompleted: 2026-04-12\n\n{% /work %}',
			'Mark done',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events).toHaveLength(5);

		expect(events[0].kind).toBe('created');
		expect(events[0].initialAttributes?.status).toBe('draft');

		expect(events[1].kind).toBe('attributes');
		expect(events[1].attributeChanges).toContainEqual({ field: 'status', from: 'draft', to: 'ready' });
		expect(events[1].attributeChanges).toContainEqual({ field: 'priority', from: 'low', to: 'medium' });

		expect(events[2].kind).toBe('attributes');
		expect(events[2].attributeChanges).toContainEqual({ field: 'status', from: 'ready', to: 'in-progress' });

		expect(events[3].kind).toBe('criteria');
		expect(events[3].criteriaChanges).toEqual([{ text: 'Build it', action: 'checked' }]);

		expect(events[4].kind).toBe('attributes');
		expect(events[4].attributeChanges).toContainEqual({ field: 'status', from: 'in-progress', to: 'done' });
		expect(events[4].criteriaChanges).toContainEqual({ text: 'Test it', action: 'checked' });
	});

	it('returns empty array for non-existent file', () => {
		// Init repo with at least one commit
		writeAndCommit('dummy.md', 'dummy', 'init');
		const events = extractEntityHistory('nonexistent.md', TMP);
		expect(events).toEqual([]);
	});

	it('includes short hash (7 chars)', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}',
			'Create',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		expect(events[0].shortHash).toHaveLength(7);
		expect(events[0].hash.startsWith(events[0].shortHash)).toBe(true);
	});

	it('records ISO date string', () => {
		writeAndCommit('work/task.md',
			'{% work id="WORK-001" status="ready" %}\n\n# Task\n\n{% /work %}',
			'Create',
		);

		const events = extractEntityHistory('work/task.md', TMP);
		// Date should be a valid ISO 8601 string
		expect(new Date(events[0].date).toISOString()).toBeTruthy();
	});
});
