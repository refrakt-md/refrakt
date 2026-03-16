import { describe, it, expect } from 'vitest';
import { parseInlineMarkdown, serializeInlineHtml, stripInlineMarkdown } from '../app/src/lib/editor/inline-markdown.js';
import { JSDOM } from 'jsdom';

/** Helper: parse markdown to HTML, then serialize back through a DOM element */
function roundTrip(source: string): string {
	const html = parseInlineMarkdown(source);
	const dom = new JSDOM(`<div>${html}</div>`);
	const el = dom.window.document.querySelector('div')!;
	return serializeInlineHtml(el as unknown as HTMLElement);
}

describe('parseInlineMarkdown', () => {
	it('handles plain text', () => {
		expect(parseInlineMarkdown('hello world')).toBe('hello world');
	});

	it('handles bold', () => {
		expect(parseInlineMarkdown('hello **world**')).toBe('hello <strong>world</strong>');
	});

	it('handles italic', () => {
		expect(parseInlineMarkdown('hello *world*')).toBe('hello <em>world</em>');
	});

	it('handles inline code', () => {
		expect(parseInlineMarkdown('use `npm install`')).toBe('use <code>npm install</code>');
	});

	it('handles links', () => {
		const result = parseInlineMarkdown('visit [our docs](/docs) for more');
		expect(result).toBe('visit <a href="/docs">our docs</a> for more');
	});

	it('handles links with title', () => {
		const result = parseInlineMarkdown('visit [docs](/docs "Documentation")');
		expect(result).toContain('title="Documentation"');
	});

	it('handles nested formatting', () => {
		const result = parseInlineMarkdown('**bold and *italic* text**');
		expect(result).toBe('<strong>bold and <em>italic</em> text</strong>');
	});

	it('handles empty string', () => {
		expect(parseInlineMarkdown('')).toBe('');
	});

	it('escapes HTML entities', () => {
		const result = parseInlineMarkdown('a < b & c > d');
		expect(result).toContain('&lt;');
		expect(result).toContain('&amp;');
		expect(result).toContain('&gt;');
	});
});

describe('stripInlineMarkdown', () => {
	it('strips bold', () => {
		expect(stripInlineMarkdown('hello **world**')).toBe('hello world');
	});

	it('strips italic', () => {
		expect(stripInlineMarkdown('hello *world*')).toBe('hello world');
	});

	it('strips inline code', () => {
		expect(stripInlineMarkdown('use `npm install`')).toBe('use npm install');
	});

	it('strips links preserving text', () => {
		expect(stripInlineMarkdown('visit [our docs](/docs) for more')).toBe('visit our docs for more');
	});

	it('strips strikethrough', () => {
		expect(stripInlineMarkdown('~~old~~ new')).toBe('old new');
	});

	it('handles nested formatting', () => {
		expect(stripInlineMarkdown('**bold [link](/url)**')).toBe('bold link');
	});
});

describe('round-trip (parse -> serialize)', () => {
	it('preserves plain text', () => {
		expect(roundTrip('hello world')).toBe('hello world');
	});

	it('preserves bold', () => {
		expect(roundTrip('hello **world**')).toBe('hello **world**');
	});

	it('preserves italic', () => {
		expect(roundTrip('hello *world*')).toBe('hello *world*');
	});

	it('preserves inline code', () => {
		expect(roundTrip('use `npm install`')).toBe('use `npm install`');
	});

	it('preserves links', () => {
		expect(roundTrip('visit [our docs](/docs) for more')).toBe('visit [our docs](/docs) for more');
	});

	it('preserves mixed formatting', () => {
		expect(roundTrip('Check out [our docs](/docs) for **more info**'))
			.toBe('Check out [our docs](/docs) for **more info**');
	});

	it('preserves nested bold+italic', () => {
		expect(roundTrip('**bold and *italic* text**'))
			.toBe('**bold and *italic* text**');
	});
});
