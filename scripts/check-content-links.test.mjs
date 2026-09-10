import { describe, it, expect } from 'vitest';
import { findBrokenFragments, collectPages, headingIdsFor, urlForFile, hasGeneratedHeadings } from './check-content-links.mjs';

/**
 * Colocated with the script, the same shape as `check-rune-docs.mjs`: unit
 * tests over the pure computation, plus one live check against the real
 * content tree.
 */
describe('findBrokenFragments', () => {
	it('reports a fragment matching no heading on the target page', () => {
		const broken = findBrokenFragments([
			{ file: 'a.md', url: '/a', source: 'See [there](/b#no-such-heading).' },
			{ file: 'b.md', url: '/b', source: '## Real heading\n' },
		]);
		expect(broken).toHaveLength(1);
		expect(broken[0]).toMatchObject({ from: 'a.md', url: '/b', fragment: 'no-such-heading' });
	});

	it('accepts a fragment that matches', () => {
		const broken = findBrokenFragments([
			{ file: 'a.md', url: '/a', source: 'See [there](/b#real-heading).' },
			{ file: 'b.md', url: '/b', source: '## Real heading\n' },
		]);
		expect(broken).toEqual([]);
	});

	it('skips links to pages outside the content tree', () => {
		// A generated `entityRoutes` page has no source file to read headings
		// from, so guessing would produce false positives.
		const broken = findBrokenFragments([
			{ file: 'a.md', url: '/a', source: 'See [there](/generated/thing#anything).' },
		]);
		expect(broken).toEqual([]);
	});

	it('resolves fragments against the punctuation-stripped slug', () => {
		// The BUG-005 case: the author-intuitive anchor is now the real one.
		const broken = findBrokenFragments([
			{ file: 'a.md', url: '/a', source: 'See [there](/b#body-zones-preamble-template-fallback).' },
			{ file: 'b.md', url: '/b', source: '## Body zones — preamble, template, fallback\n' },
		]);
		expect(broken).toEqual([]);
	});
});

describe('headingIdsFor', () => {
	it('ignores frontmatter', () => {
		const ids = headingIdsFor('---\ntitle: X\n---\n\n## A heading\n');
		expect([...ids]).toEqual(['a-heading']);
	});
});

describe('urlForFile', () => {
	it('maps index files to their directory', () => {
		expect(urlForFile('/c/docs/index.md', '/c')).toBe('/docs');
		expect(urlForFile('/c/index.md', '/c')).toBe('/');
		expect(urlForFile('/c/docs/thing.md', '/c')).toBe('/docs/thing');
	});
});

describe('the real content tree', () => {
	it('has no internal fragment pointing at a missing heading', () => {
		const broken = findBrokenFragments(collectPages());
		expect(broken.map(b => `${b.from} → ${b.url}#${b.fragment}`)).toEqual([]);
	});
});

describe('hasGeneratedHeadings', () => {
	it('treats a page with a data body as having unknown headings', () => {
		// `### {% $row.name %}` becomes one heading per row at preprocess, which
		// this parse-time check cannot see.
		const broken = findBrokenFragments([
			{ file: 'a.md', url: '/a', source: 'See [there](/b#contentdir).' },
			{
				file: 'b.md',
				url: '/b',
				source: '{% data src="x.json" %}\n### {% $row.name %}\n{% /data %}\n',
			},
		]);
		expect(broken).toEqual([]);
	});

	it('still checks a page whose data tag is self-closing', () => {
		// No body means no generated headings — the page's own headings are all
		// there are, so a bad fragment into it is still a real error.
		const broken = findBrokenFragments([
			{ file: 'a.md', url: '/a', source: 'See [there](/b#nope).' },
			{ file: 'b.md', url: '/b', source: '## Real\n\n{% data src="x.json" /%}\n' },
		]);
		expect(broken).toHaveLength(1);
	});
});
