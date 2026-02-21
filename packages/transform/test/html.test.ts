import { describe, it, expect } from 'vitest';
import { renderToHtml } from '../src/html.js';
import { makeTag } from '../src/helpers.js';

describe('renderToHtml', () => {
	it('renders a simple tag with text content', () => {
		const tag = makeTag('p', {}, ['Hello world']);
		expect(renderToHtml(tag)).toBe('<p>Hello world</p>');
	});

	it('escapes HTML in text content', () => {
		const tag = makeTag('p', {}, ['<script>alert("xss")</script>']);
		expect(renderToHtml(tag)).toBe('<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>');
	});

	it('renders attributes', () => {
		const tag = makeTag('div', { class: 'rf-hint rf-hint--warning', 'data-rune': 'hint' }, ['text']);
		const html = renderToHtml(tag);
		expect(html).toBe('<div class="rf-hint rf-hint--warning" data-rune="hint">text</div>');
	});

	it('skips null, undefined, and false attributes', () => {
		const tag = makeTag('div', { class: 'test', id: null, hidden: false, 'data-x': undefined }, ['text']);
		expect(renderToHtml(tag)).toBe('<div class="test">text</div>');
	});

	it('renders true attributes as bare attributes', () => {
		const tag = makeTag('input', { type: 'text', required: true }, []);
		expect(renderToHtml(tag)).toBe('<input type="text" required />');
	});

	it('renders void elements as self-closing', () => {
		const tag = makeTag('br', {}, []);
		expect(renderToHtml(tag)).toBe('<br />');

		const img = makeTag('img', { src: '/test.jpg', alt: 'Test' }, []);
		expect(renderToHtml(img)).toBe('<img src="/test.jpg" alt="Test" />');
	});

	it('renders nested tags', () => {
		const tag = makeTag('div', { class: 'rf-hint' }, [
			makeTag('span', { class: 'rf-hint__icon' }, []),
			makeTag('p', {}, ['Content']),
		]);
		expect(renderToHtml(tag)).toBe(
			'<div class="rf-hint"><span class="rf-hint__icon"></span><p>Content</p></div>'
		);
	});

	it('handles arrays of nodes', () => {
		const nodes = [
			makeTag('p', {}, ['First']),
			makeTag('p', {}, ['Second']),
		];
		expect(renderToHtml(nodes)).toBe('<p>First</p><p>Second</p>');
	});

	it('handles null and undefined nodes', () => {
		expect(renderToHtml(null)).toBe('');
		expect(renderToHtml(undefined)).toBe('');
	});

	it('handles string nodes', () => {
		expect(renderToHtml('just text' as any)).toBe('just text');
	});

	it('handles number nodes', () => {
		expect(renderToHtml(42 as any)).toBe('42');
	});

	it('omits internal attributes ($$mdtype, typeof, property)', () => {
		const tag = makeTag('section', {
			$$mdtype: 'Tag',
			typeof: 'Hint',
			property: 'contentSection',
			class: 'rf-hint',
		}, ['text']);
		const html = renderToHtml(tag);
		expect(html).toBe('<section class="rf-hint">text</section>');
		expect(html).not.toContain('typeof');
		expect(html).not.toContain('$$mdtype');
		expect(html).not.toContain('property');
	});

	it('escapes attribute values', () => {
		const tag = makeTag('div', { 'data-value': 'a "quoted" & <special>' }, ['text']);
		expect(renderToHtml(tag)).toBe('<div data-value="a &quot;quoted&quot; &amp; &lt;special&gt;">text</div>');
	});
});

describe('renderToHtml pretty printing', () => {
	it('pretty-prints a simple tag', () => {
		const tag = makeTag('p', {}, ['Hello']);
		expect(renderToHtml(tag, { pretty: true })).toBe('<p>Hello</p>');
	});

	it('pretty-prints nested tags with indentation', () => {
		const tag = makeTag('div', { class: 'rf-hint' }, [
			makeTag('span', { class: 'rf-hint__icon' }, []),
			makeTag('p', {}, ['Content']),
		]);
		const expected = [
			'<div class="rf-hint">',
			'  <span class="rf-hint__icon"></span>',
			'  <p>Content</p>',
			'</div>',
		].join('\n');
		expect(renderToHtml(tag, { pretty: true })).toBe(expected);
	});

	it('pretty-prints deeply nested tags', () => {
		const tag = makeTag('section', { class: 'rf-hint' }, [
			makeTag('div', { class: 'rf-hint__header' }, [
				makeTag('span', { class: 'rf-hint__icon' }, []),
				makeTag('span', { class: 'rf-hint__title' }, ['warning']),
			]),
			makeTag('div', { class: 'rf-hint__body' }, [
				makeTag('p', {}, ['Check your settings']),
			]),
		]);
		const expected = [
			'<section class="rf-hint">',
			'  <div class="rf-hint__header">',
			'    <span class="rf-hint__icon"></span>',
			'    <span class="rf-hint__title">warning</span>',
			'  </div>',
			'  <div class="rf-hint__body">',
			'    <p>Check your settings</p>',
			'  </div>',
			'</section>',
		].join('\n');
		expect(renderToHtml(tag, { pretty: true })).toBe(expected);
	});

	it('supports custom indent string', () => {
		const tag = makeTag('div', {}, [
			makeTag('p', {}, ['text']),
		]);
		const expected = '<div>\n\t<p>text</p>\n</div>';
		expect(renderToHtml(tag, { pretty: true, indent: '\t' })).toBe(expected);
	});
});
