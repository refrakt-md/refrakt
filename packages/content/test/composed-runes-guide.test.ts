import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { COMPOSITION_ERRORS, CompositionError, defineComposedRune } from '@refrakt-md/runes';
import { composedDir, definitionOf } from './composed-storytelling.js';
import { NOT_YET_PLACEABLE, PREPROCESS_ONLY, ROOT, derivePlacementSet } from './placeable-set.js';

/**
 * WORK-637 — the composed-runes authoring guide is checked against the code it
 * documents, so it cannot drift:
 *
 * - every construction error carries a code, and every code has a docs entry
 *   (and the docs list no code that is gone);
 * - the placeable set it states is SPEC-145 D12's set, derived from the catalog;
 * - its worked examples are the tested definition files, included, not retyped.
 */

const GUIDE = join(ROOT, 'site', 'content', 'extend', 'rune-authoring', 'composed-runes.md');
const guide = readFileSync(GUIDE, 'utf-8');

/** The lines of the section under `heading`, up to the next heading at its level or above. */
function section(heading: string): string[] {
	const lines = guide.split('\n');
	const start = lines.findIndex((l) => l === heading);
	expect(start, `guide has "${heading}"`).toBeGreaterThan(-1);
	const level = heading.match(/^#+/)![0].length;
	const end = lines.findIndex(
		(l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level,
	);
	return lines.slice(start + 1, end === -1 ? undefined : end);
}

/** The body rows of the first Markdown table in a section, split into cells. */
function tableRows(lines: string[]): string[][] {
	const rows = lines.filter((l) => l.startsWith('|'));
	return rows.slice(2).map((r) =>
		r
			.slice(1, -1)
			.split(' | ')
			.map((c) => c.trim()),
	);
}

const backticked = (cell: string) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Where construction errors are thrown. Every throw in the first four is coded. */
const CODED_FILES = [
	'packages/runes/src/lib/composition.ts',
	'packages/runes/src/composed-rune.ts',
	'packages/runes/src/rune-dir.ts',
	'packages/runes/src/project-runes.ts',
];
/** Throws composition errors among others; its coded ones must be registered. */
const MIXED_FILES = ['packages/runes/src/plugins.ts'];

const codes = new Set(Object.keys(COMPOSITION_ERRORS));

describe('every construction error is documented', () => {
	it('every throw site in the compiler and the loaders carries a registered code', () => {
		const problems: string[] = [];
		for (const file of [...CODED_FILES, ...MIXED_FILES]) {
			const source = readFileSync(join(ROOT, file), 'utf-8');
			const lineOf = (index: number) => source.slice(0, index).split('\n').length;
			const coded = file !== MIXED_FILES[0];
			if (coded) {
				for (const m of source.matchAll(/throw new Error\(/g)) {
					problems.push(`${file}:${lineOf(m.index!)}: an uncoded \`throw new Error\``);
				}
				// `fail(…)` / `at(…)` calls: the first argument is the code. The
				// helpers' own definitions and pass-throughs take a variable.
				for (const m of source.matchAll(/(?<![\w.])(?:fail|at)\(\s*([^,)\s]+)/g)) {
					const arg = m[1];
					if (arg === 'code' || arg === 'msg') continue;
					const literal = /^'([a-z-]+)'$/.exec(arg);
					if (!literal) {
						problems.push(`${file}:${lineOf(m.index!)}: \`${m[0]}\` passes no code`);
					} else if (!codes.has(literal[1])) {
						problems.push(`${file}:${lineOf(m.index!)}: unregistered code '${literal[1]}'`);
					}
				}
			}
			for (const m of source.matchAll(/new CompositionError\(\s*([^,)\s]+)/g)) {
				const literal = /^'([a-z-]+)'$/.exec(m[1]);
				if (literal && !codes.has(literal[1])) {
					problems.push(`${file}:${lineOf(m.index!)}: unregistered code '${literal[1]}'`);
				} else if (!literal && !['code', 'first.code'].some((v) => m[1].startsWith(v))) {
					problems.push(`${file}:${lineOf(m.index!)}: \`${m[0]}\` passes no code literal`);
				}
			}
		}
		expect(problems).toEqual([]);
	});

	it('every code has an entry in the guide’s Errors table, with its cause and fix', () => {
		const rows = tableRows(section('## Errors'));
		const documented = new Map(rows.map((r) => [backticked(r[0])[0], r]));
		const missing = [...codes].filter((c) => !documented.has(c));
		expect(missing, 'codes with no docs entry').toEqual([]);
		const stale = [...documented.keys()].filter((c) => !codes.has(c));
		expect(stale, 'docs entries for codes that no longer exist').toEqual([]);
		for (const [code, row] of documented) {
			expect(row[1]?.length, `${code}: meaning`).toBeGreaterThan(10);
			expect(row[2]?.length, `${code}: fix`).toBeGreaterThan(5);
		}
	});

	// The codes are only as good as their assignment: each trigger here is the
	// mistake the docs entry describes, and must throw that code.
	const def = (front: string, body = '') => `---\n${front}\n---\n\n${body}\n`;
	const seq =
		'content:\n  type: sequence\n  fields:\n    body: { match: any, optional: true, greedy: true }';
	const sections =
		'content:\n  type: sections\n  emitAttributes: { heading: $heading }\n  preamble:\n    intro: { match: paragraph, optional: true }';
	const triggers: Array<[string, string, string?]> = [
		['name-not-kebab', def('tag: div'), 'Bad_Name'],
		['no-frontmatter', 'Just a body.'],
		['frontmatter-yaml', def('tag: [unclosed')],
		['name-restated', def('rune: x')],
		['style-key', def('css: x')],
		['second-emit-path', def('transform: x')],
		['layout-key', def('layout: {}')],
		['unknown-key', def('tagg: div')],
		['invalid-value', def('tag: Not An Element')],
		['attribute-invalid', def('attributes:\n  from: { type: date }')],
		['attribute-reserved', def('attributes:\n  slot: { matches: [a, b] }')],
		['content-model-type', def('content: { type: custom }')],
		[
			'content-model-invalid',
			def('content:\n  type: sequence\n  fields:\n    body: { optional: true }'),
		],
		[
			'registers-invalid',
			def(
				`attributes:\n  from: { type: string }\n  to: { type: string }\n${seq}\nregisters:\n  edge: { from: from, to: to, kind: { field: nope } }`,
				'{% slot name="body" /%}',
			),
		],
		['template-parse', def(seq, '{% slot name="body" /%}\n\n{% hint type= %}\nx\n{% /hint %}')],
		// An unclosed tag parses as a tag with a critical error, not an error node.
		['template-parse', def(seq, '{% slot name="body" /%}\n\n{% hint %}\nunclosed')],
		['preprocessor-tag', def(seq, '{% slot name="body" /%}\n\n{% include file="x.md" /%}')],
		['attrs-undeclared', def(seq, '{% $attrs.nope %}\n\n{% slot name="body" /%}')],
		['each-outside-slot', def(seq, '{% $each.heading %}\n\n{% slot name="body" /%}')],
		[
			'each-field-not-emitted',
			def(
				sections,
				'{% slot name="intro" /%}\n\n{% slot name="sections" each %}\n{% $each.nope %}\n{% slot /%}\n{% /slot %}',
			),
		],
		['slot-invalid', def(seq, '{% slot name="body" class="x" /%}')],
		['bare-slot-misplaced', def(seq, '{% slot /%}\n\n{% slot name="body" /%}')],
		[
			'slot-inside-each',
			def(
				sections,
				'{% slot name="sections" each %}\n{% slot name="intro" /%}\n{% slot /%}\n{% /slot %}',
			),
		],
		['slot-unknown-field', def(seq, '{% slot name="nope" /%}')],
		['slot-placed-twice', def(seq, '{% slot name="body" /%}\n\n{% slot name="body" /%}')],
		[
			'each-on-single-field',
			def(
				'content:\n  type: sequence\n  fields:\n    one: { match: paragraph }',
				'{% slot name="one" each %}\n{% slot /%}\n{% /slot %}',
			),
		],
		[
			'each-item-unplaced',
			def(
				sections,
				'{% slot name="intro" /%}\n\n{% slot name="sections" each %}\nNothing.\n{% /slot %}',
			),
		],
		['field-unplaced', def(seq, 'No slot.')],
		[
			'metablock-invalid',
			def(`${seq}\nblocks:\n  meta: { fields: [] }`, '{% metablock /%}\n\n{% slot name="body" /%}'),
		],
		[
			'metablock-inside-each',
			def(
				`${sections}\nblocks:\n  meta: { fields: [] }`,
				'{% slot name="intro" /%}\n\n{% slot name="sections" each %}\n{% metablock name="meta" /%}\n{% slot /%}\n{% /slot %}',
			),
		],
		['metablock-undeclared', def(seq, '{% metablock name="nope" /%}\n\n{% slot name="body" /%}')],
		[
			'metablock-placed-twice',
			def(
				`${seq}\nblocks:\n  meta: { fields: [] }`,
				'{% metablock name="meta" /%}\n\n{% metablock name="meta" /%}\n\n{% slot name="body" /%}',
			),
		],
		['composition-cycle', def(seq, '{% x %}\n{% slot name="body" /%}\n{% /x %}')],
	];

	it.each(triggers)('`%s` is the code its mistake throws', (code, source, name = 'x') => {
		let err: unknown;
		try {
			defineComposedRune(name, source);
		} catch (e) {
			err = e;
		}
		expect(err, `${code}: expected an error`).toBeInstanceOf(CompositionError);
		expect((err as CompositionError).code, (err as Error).message).toBe(code);
		expect(codes.has(code)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// The placeable set
// ---------------------------------------------------------------------------

describe('the placeable set the guide states is D12’s, derived (SPEC-145 D12)', () => {
	let derived: Awaited<ReturnType<typeof derivePlacementSet>>;
	beforeAll(async () => {
		derived = await derivePlacementSet();
	});

	it('lists every placeable rune, once, by package', () => {
		const rows = tableRows(section('### The placeable set'));
		const stated = new Map<string, string>();
		for (const [pkg, cell] of rows) {
			for (const rune of backticked(cell)) {
				expect(stated.has(rune), `${rune} listed twice`).toBe(false);
				stated.set(rune, pkg);
			}
		}
		// Preprocess runes pass both exclusions and are rejected by D4 instead.
		const expected = derived.placementSet.filter((r) => !PREPROCESS_ONLY.has(r));
		expect([...stated.keys()].sort()).toEqual([...expected].sort());
		for (const [rune, pkg] of stated) expect(pkg, rune).toBe(derived.source[rune]);
	});

	it('names every excluded rune with its reason', () => {
		const rows = tableRows(section('### Not placeable'));
		const stated = Object.fromEntries(rows.map(([rune, why]) => [backticked(rune)[0], why]));
		expect(Object.keys(stated).sort()).toEqual(Object.keys(derived.excluded).sort());
		for (const [rune, reason] of Object.entries(derived.excluded)) {
			const why = stated[rune];
			if (reason.startsWith('requiresParent')) expect(why, rune).toMatch(/^requires `/);
			else expect(why, rune).toBe(`peer type \`${reason.replace('peer schema type: ', '')}\``);
		}
	});

	it('states the survival test’s rebuilt node kinds, and only those', () => {
		const rows = tableRows(section('### Placed, but a node kind is rebuilt'));
		const stated = rows.map(([rune, kind, what]) => [backticked(rune)[0], kind, what]);
		const measured = Object.entries(NOT_YET_PLACEABLE).flatMap(([rune, kinds]) =>
			Object.entries(kinds).map(([kind, what]) => [rune, kind, what]),
		);
		expect(stated).toEqual(measured);
	});
});

// ---------------------------------------------------------------------------
// The worked examples
// ---------------------------------------------------------------------------

describe('the worked examples are the tested definitions', () => {
	it('includes `bond` and `character` from the files the composed tests build', () => {
		const included = [...guide.matchAll(/\{% snippet path="([^"]+)"[^%]*\/%\}/g)].map((m) => m[1]);
		const runesDir = relative(ROOT, join(composedDir, 'runes'));
		expect(included).toContain(`${runesDir}/bond.md`);
		expect(included).toContain(`${runesDir}/character.md`);
		for (const path of included) {
			expect(existsSync(join(ROOT, path)), path).toBe(true);
			expect(path.startsWith(relative(ROOT, composedDir)), path).toBe(true);
		}
		// The prose beside them makes claims about them, so they carry review
		// markers: `refrakt snippet review --check` (a CI gate) fires when a
		// definition changes under the prose.
		for (const rune of ['bond', 'character']) {
			expect(guide, rune).toMatch(
				new RegExp(
					`\\{% snippet path="${runesDir}/${rune}\\.md" reviewed="[0-9a-f]+:[0-9a-f]+" /%\\}`,
				),
			);
		}
		// They build — the same definitions `composed-bond` and
		// `composed-character` compare against the storytelling plugin.
		expect(() => defineComposedRune('bond', definitionOf('bond'))).not.toThrow();
		expect(() => defineComposedRune('character', definitionOf('character'))).not.toThrow();
	});

	it('retypes no definition: the guide has no frontmatter block of either', () => {
		for (const rune of ['bond', 'character']) {
			const frontmatter = definitionOf(rune).split('---')[1].trim();
			expect(guide.includes(frontmatter), rune).toBe(false);
		}
	});
});
