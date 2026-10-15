import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	milestoneItems,
	backgroundRefs,
	draftReleaseNote,
	draftMarkerFindings,
} from './draft-release-note.mjs';

let dir;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'refrakt-draft-note-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const write = (rel, body) => {
	mkdirSync(join(dir, rel, '..'), { recursive: true });
	writeFileSync(join(dir, rel), body);
};

function plan() {
	write(
		'plan/milestones/v1.2.0.md',
		'{% milestone name="v1.2.0" %}\n\n# v1.2.0 — Faster builds\n\nBuilds reuse their cache ({% ref "SPEC-12" /%}).\n',
	);
	write(
		'plan/work/WORK-5-a.md',
		'{% work id="WORK-5" source="SPEC-12,ADR-3" milestone="v1.2.0" %}\n',
	);
	write('plan/work/WORK-6-b.md', '{% work id="WORK-6" source="SPEC-9" milestone="v1.2.0" %}\n');
	write('plan/work/WORK-7-c.md', '{% work id="WORK-7" source="SPEC-1" milestone="v1.1.0" %}\n');
	write('plan/bugs/BUG-20-x.md', '{% bug id="BUG-20" source="SPEC-12" milestone="v1.2.0" %}\n');
	write('plan/bugs/BUG-4-y.md', '{% bug id="BUG-4" milestone="v1.2.0" %}\n');
}

describe('milestoneItems', () => {
	it('finds work and bugs by their milestone attribute', () => {
		plan();
		const ids = milestoneItems(join(dir, 'plan'), 'v1.2.0')
			.map((i) => i.id)
			.sort();
		expect(ids).toEqual(['BUG-20', 'BUG-4', 'WORK-5', 'WORK-6']);
	});
});

describe('backgroundRefs', () => {
	it('lists the milestone, then distinct specs, then bugs, each in ID order', () => {
		plan();
		const refs = backgroundRefs('v1.2.0', milestoneItems(join(dir, 'plan'), 'v1.2.0'), true);
		expect(refs).toEqual([
			'{% ref "v1.2.0" preview="drawer" label="the milestone" /%}',
			'{% ref "SPEC-9" preview="drawer" /%}',
			'{% ref "SPEC-12" preview="drawer" /%}',
			'{% ref "BUG-4" preview="drawer" /%}',
			'{% ref "BUG-20" preview="drawer" /%}',
		]);
	});

	it('leaves out the milestone when there is none', () => {
		expect(backgroundRefs('v9.0.0', [], false)).toEqual([]);
	});
});

describe('draftReleaseNote', () => {
	it('prefills the milestone opening and marks what is left to do', () => {
		plan();
		const note = draftReleaseNote('1.2.0', join(dir, 'plan'));
		expect(note).toContain(
			'**Faster builds.** Builds reuse their cache ({% ref "SPEC-12" preview="drawer" /%}).',
		);
		expect(note).toContain('{% hint type="warning" %}\n**Action needed:**');
		expect(note).toContain(
			'Background: {% ref "v1.2.0" preview="drawer" label="the milestone" /%}',
		);
		expect(note.match(/^TODO:/gm)).toHaveLength(2);
	});

	it('drafts a placeholder opening without a milestone', () => {
		write('plan/work/.keep', '');
		const note = draftReleaseNote('2.0.0', join(dir, 'plan'));
		expect(note).toContain('**Title.** What v2.0.0 is for.');
		expect(note).not.toContain('Background:');
	});
});

describe('draftMarkerFindings', () => {
	it('reports each TODO line left in a note', () => {
		write('releases/notes/v1.2.0.md', 'TODO: rewrite\n\nDone.\n');
		expect(draftMarkerFindings(join(dir, 'releases/notes'))).toEqual([
			'releases/notes/v1.2.0.md:1: unfinished draft (TODO: rewrite)',
		]);
	});

	it("finds none in this repository's notes", () => {
		const repo = join(fileURLToPath(new URL('.', import.meta.url)), '..');
		expect(draftMarkerFindings(join(repo, 'releases/notes'))).toEqual([]);
	});
});
