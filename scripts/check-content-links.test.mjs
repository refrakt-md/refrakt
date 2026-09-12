import { describe, it, expect } from 'vitest';
import { findBrokenFragments, findComments, collectPages, headingIdsFor, urlForFile, hasGeneratedHeadings } from './check-content-links.mjs';

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

describe('findComments (BUG-012)', () => {
	const page = (source) => [{ file: 'a.md', url: '/a', source }];

	it('flags an HTML comment, which renders as visible text', () => {
		// Measured: `<!-- a note -->` does not pass through as an HTML comment —
		// Markdoc parses it into a paragraph, so the reader sees the delimiters.
		const found = findComments(page('<!--\n  a note\n-->\n\nVisible.'));
		expect(found).toEqual([{ file: 'a.md', form: 'an HTML comment' }]);
	});

	it('flags Markdoc comment syntax, which is not enabled', () => {
		const found = findComments(page('{#\n  a note\n#}\n\nVisible.'));
		expect(found).toEqual([{ file: 'a.md', form: 'Markdoc comment syntax' }]);
	});

	it('allows either form inside a fenced code block', () => {
		// Showing the syntax as an example is fine, and is every existing use in
		// this repo — a guard that fired on those would be turned off on day one.
		expect(findComments(page('```markdoc\n{# like this #}\n<!-- or this -->\n```'))).toEqual([]);
	});

	it('allows either form inside inline code', () => {
		expect(findComments(page('Write `<!-- x -->` or `{# x #}` to show it.'))).toEqual([]);
	});

	it('does not mistake Svelte block syntax for a comment', () => {
		// `site/content/releases.md` describes `{@const}` inside `{#if}`. There is
		// no closing `#}`, so it is not a comment attempt.
		expect(findComments(page('- Fix build failure ({@const} inside {#if} block)'))).toEqual([]);
	});

	it('is quiet on ordinary content', () => {
		expect(findComments(page('# Title\n\nSome prose.'))).toEqual([]);
	});
});
