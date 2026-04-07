import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { makeTag } from '@refrakt-md/transform';
import type { SerializedTag, RendererNode } from '@refrakt-md/types';
import { Renderer } from '../src/Renderer.js';
import { Table } from '../src/elements/Table.js';
import { Pre } from '../src/elements/Pre.js';

function render(node: RendererNode, components?: Record<string, any>, elements?: Record<string, any>): string {
	return renderToStaticMarkup(createElement(Renderer, { node, components, elements }));
}

describe('React Renderer', () => {
	// ─── Basic rendering ──────────────────────────────────────────

	it('renders null/undefined as empty', () => {
		expect(render(null)).toBe('');
		expect(render(undefined)).toBe('');
	});

	it('renders strings as text', () => {
		expect(render('Hello world')).toBe('Hello world');
	});

	it('renders numbers as strings', () => {
		expect(render(42)).toBe('42');
	});

	it('renders arrays of children', () => {
		const nodes: RendererNode[] = ['Hello ', makeTag('strong', {}, ['world'])];
		expect(render(nodes)).toBe('Hello <strong>world</strong>');
	});

	it('renders a simple HTML element with attributes', () => {
		const node = makeTag('div', { class: 'test', id: 'main' }, ['content']);
		expect(render(node)).toBe('<div class="test" id="main">content</div>');
	});

	it('renders void elements as self-closing', () => {
		const node = makeTag('img', { src: '/photo.jpg', alt: 'Photo' });
		const html = render(node);
		expect(html).toContain('<img');
		expect(html).toContain('src="/photo.jpg"');
		expect(html).toContain('alt="Photo"');
	});

	it('renders nested elements', () => {
		const node = makeTag('div', {}, [
			makeTag('h1', {}, ['Title']),
			makeTag('p', {}, ['Body']),
		]);
		expect(render(node)).toBe('<div><h1>Title</h1><p>Body</p></div>');
	});

	it('filters out null/undefined/false attributes', () => {
		const node = makeTag('div', { class: 'keep', hidden: false, title: undefined }, ['text']);
		expect(render(node)).toBe('<div class="keep">text</div>');
	});

	it('renders SVG as raw HTML', () => {
		const node = makeTag('svg', { width: '16', height: '16', viewBox: '0 0 24 24' }, [
			makeTag('circle', { cx: '12', cy: '12', r: '10' }),
		]);
		const html = render(node);
		expect(html).toContain('<svg');
		expect(html).toContain('circle');
	});

	it('renders raw HTML content (data-codeblock) without escaping', () => {
		const node = makeTag('code', { 'data-codeblock': true }, ['<span class="hl">code</span>']);
		const html = render(node);
		expect(html).toContain('<span class="hl">code</span>');
	});

	// ─── Component overrides (ADR-008) ────────────────────────────

	it('dispatches to registered component by data-rune', () => {
		function MyHint({ hintType, children }: any) {
			return createElement('div', { className: `custom-hint custom-hint--${hintType}` }, children);
		}

		const node = makeTag('div', { 'data-rune': 'hint', class: 'rf-hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
			makeTag('p', {}, ['Be careful.']),
		]);

		const html = render(node, { hint: MyHint });
		expect(html).toContain('custom-hint--warning');
		expect(html).toContain('Be careful.');
	});

	it('passes extracted properties as named props', () => {
		function Recipe({ prepTime, servings }: any) {
			return createElement('div', null, `${prepTime} / ${servings} servings`);
		}

		const node = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: '15 min' }),
			makeTag('meta', { 'data-field': 'servings', content: '4' }),
		]);

		const html = render(node, { recipe: Recipe });
		expect(html).toContain('15 min / 4 servings');
	});

	it('passes named refs as ReactNode props', () => {
		function Recipe({ media, content }: any) {
			return createElement('div', null, media, content);
		}

		const node = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('div', { 'data-name': 'media' }, [
				makeTag('img', { src: '/photo.jpg', alt: 'Dish' }),
			]),
			makeTag('div', { 'data-name': 'content' }, [
				makeTag('p', {}, ['Instructions here']),
			]),
		]);

		const html = render(node, { recipe: Recipe });
		expect(html).toContain('src="/photo.jpg"');
		expect(html).toContain('Instructions here');
		expect(html).toContain('data-ref="media"');
		expect(html).toContain('data-ref="content"');
	});

	it('passes anonymous children as children prop', () => {
		function Hint({ children }: any) {
			return createElement('div', { className: 'hint-body' }, children);
		}

		const node = makeTag('div', { 'data-rune': 'hint' }, [
			makeTag('p', {}, ['First paragraph.']),
			makeTag('p', {}, ['Second paragraph.']),
		]);

		const html = render(node, { hint: Hint });
		expect(html).toContain('hint-body');
		expect(html).toContain('First paragraph.');
		expect(html).toContain('Second paragraph.');
	});

	it('passes the original tag prop for escape-hatch access', () => {
		function Debug({ tag }: any) {
			return createElement('pre', null, `rune=${tag.attributes['data-rune']}`);
		}

		const node = makeTag('div', { 'data-rune': 'debug' }, []);
		const html = render(node, { debug: Debug });
		expect(html).toContain('rune=debug');
	});

	it('falls back to HTML rendering when no component matches', () => {
		const node = makeTag('div', { 'data-rune': 'unknown', class: 'rf-unknown' }, [
			makeTag('p', {}, ['Content']),
		]);

		const html = render(node, {});
		expect(html).toContain('rf-unknown');
		expect(html).toContain('Content');
	});

	// ─── Element overrides ───────────────────────────────────────

	it('dispatches to element override by tag name', () => {
		function TableWrapper({ tag, children }: any) {
			return createElement('div', { className: 'table-wrap' },
				createElement('table', null, children),
			);
		}

		const node = makeTag('table', { class: 'my-table' }, [
			makeTag('tr', {}, [makeTag('td', {}, ['data'])]),
		]);

		const html = render(node, undefined, { table: TableWrapper });
		expect(html).toContain('table-wrap');
		expect(html).toContain('data');
	});

	it('component override takes precedence over element override', () => {
		function MyTable({ tag }: any) {
			return createElement('div', null, 'component-override');
		}
		function TableElement({ tag, children }: any) {
			return createElement('div', null, 'element-override');
		}

		const node = makeTag('table', { 'data-rune': 'datatable', class: 'rf-datatable' }, []);

		const html = render(node, { datatable: MyTable }, { table: TableElement });
		expect(html).toContain('component-override');
		expect(html).not.toContain('element-override');
	});

	// ─── Built-in element overrides ──────────────────────────────

	it('Table element wraps in rf-table-wrapper', () => {
		const node = makeTag('table', { class: 'my-table' }, [
			makeTag('tr', {}, [makeTag('td', {}, ['cell'])]),
		]);

		const html = render(node, undefined, { table: Table });
		expect(html).toContain('rf-table-wrapper');
		expect(html).toContain('cell');
	});

	it('Pre element wraps code blocks in rf-codeblock', () => {
		const node = makeTag('pre', { 'data-language': 'js', class: 'rf-code' }, [
			makeTag('code', {}, ['const x = 1;']),
		]);

		const html = render(node, undefined, { pre: Pre });
		expect(html).toContain('rf-codeblock');
		expect(html).toContain('const x = 1;');
	});

	it('Pre element renders plain pre when not a code block', () => {
		const node = makeTag('pre', {}, ['plain text']);

		const html = render(node, undefined, { pre: Pre });
		expect(html).not.toContain('rf-codeblock');
		expect(html).toContain('plain text');
	});
});
