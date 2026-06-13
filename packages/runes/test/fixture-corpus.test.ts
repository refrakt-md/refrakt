import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes, extractHeadings } from '../src/index.js';
import { parseFixture, validateFixtureFrontmatter } from '../src/fixtures.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '..', 'fixtures');
const files = readdirSync(fixturesDir).filter(f => f.endsWith('.md')).sort();

/** Build a transform config mirroring the runtime (core tags + nodes). */
function configFor(body: string) {
	const ast = Markdoc.parse(body);
	const headings = extractHeadings(ast);
	const config = {
		tags,
		nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: '/fixture.md',
			headings,
			__source: body,
			__icons: { global: {} },
		},
	};
	return { ast, config };
}

describe('rune fixture corpus parses, validates, and transforms (WORK-414 / SPEC-102)', () => {
	it('the corpus is non-empty', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		it(`${file}`, () => {
			const raw = readFileSync(resolve(fixturesDir, file), 'utf-8');

			// Frontmatter + filename are schema-valid (throws otherwise).
			const fixture = parseFixture(raw, file);
			expect(fixture.rune).toBeTruthy();
			expect(fixture.body.length).toBeGreaterThan(0);

			// The body is valid Markdoc with no error-level diagnostics …
			const { ast, config } = configFor(fixture.body);
			const errors = Markdoc.validate(ast, config as any).filter(
				e => e.error.level === 'error' || e.error.level === 'critical',
			);
			expect(errors, JSON.stringify(errors)).toHaveLength(0);

			// … and transforms without throwing.
			expect(() => Markdoc.transform(ast, config as any)).not.toThrow();
		});
	}
});

describe('validateFixtureFrontmatter (WORK-414)', () => {
	it('accepts a complete, valid frontmatter', () => {
		expect(
			validateFixtureFrontmatter({
				rune: 'recipe',
				title: 'Weeknight pasta',
				description: 'A quick recipe',
				role: 'canonical',
				attributes: { difficulty: 'medium', servings: '4' },
				demonstrates: ['ingredients-list', 'numbered-steps'],
				notes: 'Keep ingredient lines terse.',
			}),
		).toEqual([]);
	});

	it('accepts empty frontmatter (bare fixtures stay valid)', () => {
		expect(validateFixtureFrontmatter({})).toEqual([]);
	});

	it('rejects unknown keys', () => {
		const issues = validateFixtureFrontmatter({ bogus: 1 });
		expect(issues.some(i => i.path === 'bogus')).toBe(true);
	});

	it('rejects an out-of-taxonomy role', () => {
		const issues = validateFixtureFrontmatter({ role: 'fancy' });
		expect(issues.some(i => i.path === 'role')).toBe(true);
	});

	it('rejects wrong field types', () => {
		const issues = validateFixtureFrontmatter({
			title: 5,
			attributes: [1, 2],
			demonstrates: 'not-an-array',
		});
		expect(issues.map(i => i.path).sort()).toEqual(['attributes', 'demonstrates', 'title']);
	});
});

describe('parseFixture (WORK-414)', () => {
	it('throws on a schema violation', () => {
		expect(() => parseFixture('---\nrole: nope\n---\nbody', 'card.md')).toThrow(/role/);
	});

	it('derives rune + scenario from the filename', () => {
		expect(parseFixture('body', 'card.md')).toMatchObject({ rune: 'card', scenario: 'canonical' });
		expect(parseFixture('body', 'card.cover.md')).toMatchObject({ rune: 'card', scenario: 'cover' });
	});

	it('lets a `rune` field override the filename', () => {
		expect(parseFixture('---\nrune: figure\n---\nbody', 'fig.md').rune).toBe('figure');
	});

	it('strips the frontmatter from the body', () => {
		expect(parseFixture('---\nrole: minimal\n---\n\n{% card %}x{% /card %}', 'card.md').body)
			.toBe('{% card %}x{% /card %}');
	});
});
