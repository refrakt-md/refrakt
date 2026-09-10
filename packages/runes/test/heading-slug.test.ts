import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { extractHeadings, headingSlug } from '../src/util.js';
import { parse, findTag } from './helpers.js';

/**
 * BUG-005 — heading ids used to drop inline code and keep punctuation, so the
 * anchor an author would write never matched the one that shipped. Two
 * near-copies of the slug rules had also drifted (`?` vs `?{}%`), meaning the
 * heading index and the rendered `<h*>` could disagree.
 */
describe('headingSlug', () => {
	it('drops punctuation rather than carrying it into the id', () => {
		expect(headingSlug('Body zones — preamble, template, fallback'))
			.toBe('body-zones-preamble-template-fallback');
	});

	it('collapses separator runs left behind by dropped punctuation', () => {
		expect(headingSlug('Phase 2.5 — contributePages')).toBe('phase-25-contributepages');
	});

	it('never leaves a leading or trailing separator', () => {
		expect(headingSlug('— leading dash')).toBe('leading-dash');
		expect(headingSlug('trailing —')).toBe('trailing');
	});

	it('strips the characters that used to break the prerender crawler', () => {
		// A literal `%` not followed by a hex pair crashed `decodeURI`.
		expect(headingSlug('A {% symbol %} heading')).toBe('a-symbol-heading');
	});

	it('keeps non-ASCII words instead of collapsing to an empty id', () => {
		expect(headingSlug('Über Größe')).toBe('über-größe');
	});
});

describe('heading ids include inline code', () => {
	const source = '### `fileRoots` — named directories for file-reading runes\n';

	it('the heading index carries the code text', () => {
		const headings = extractHeadings(Markdoc.parse(source));
		expect(headings).toHaveLength(1);
		expect(headings[0].text).toContain('fileRoots');
		expect(headings[0].id).toBe('fileroots-named-directories-for-file-reading-runes');
	});

	it('the rendered heading uses the same id as the index', () => {
		const indexed = extractHeadings(Markdoc.parse(source))[0].id;
		const rendered = findTag(parse(source) as any, t => t.name === 'h3');
		expect(rendered).toBeDefined();
		expect(rendered!.attributes.id).toBe(indexed);
	});

	it('index and render agree on a heading containing braces', () => {
		// The case the two drifted copies disagreed on: `extractHeadings`
		// stripped only `?`, the node transform stripped `?{}%`. Braces and a
		// literal `%` that Markdoc does not read as a tag.
		const braces = '## Config {overrides} at 100% width\n';
		const indexed = extractHeadings(Markdoc.parse(braces))[0].id;
		const rendered = findTag(parse(braces) as any, t => t.name === 'h2');
		expect(rendered!.attributes.id).toBe(indexed);
	});
});
