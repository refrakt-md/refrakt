import { describe, it, expect } from 'vitest';
import { createSSRApp, h, defineComponent } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { makeTag } from '@refrakt-md/transform';
import type { RendererNode } from '@refrakt-md/types';
import { Renderer } from '../src/Renderer.js';
import { Table } from '../src/elements/Table.js';
import { Pre } from '../src/elements/Pre.js';

async function render(
	node: RendererNode,
	components?: Record<string, any>,
	elements?: Record<string, any>,
): Promise<string> {
	const app = createSSRApp({
		render: () => h(Renderer, { node, components, elements }),
	});
	return renderToString(app);
}

describe('Vue Renderer', () => {
	// ─── Basic rendering ──────────────────────────────────────────

	it('renders null/undefined as empty', async () => {
		expect(await render(null)).toBe('<!---->');
		expect(await render(undefined)).toBe('<!---->');
	});

	it('renders strings as text', async () => {
		expect(await render('Hello world')).toBe('Hello world');
	});

	it('renders numbers as strings', async () => {
		expect(await render(42)).toBe('42');
	});

	it('renders arrays of children', async () => {
		const nodes: RendererNode[] = ['Hello ', makeTag('strong', {}, ['world'])];
		const html = await render(nodes);
		expect(html).toContain('Hello ');
		expect(html).toContain('<strong>world</strong>');
	});

	it('renders a simple HTML element with attributes', async () => {
		const node = makeTag('div', { class: 'test', id: 'main' }, ['content']);
		const html = await render(node);
		expect(html).toContain('class="test"');
		expect(html).toContain('id="main"');
		expect(html).toContain('content');
	});

	it('renders void elements', async () => {
		const node = makeTag('img', { src: '/photo.jpg', alt: 'Photo' });
		const html = await render(node);
		expect(html).toContain('<img');
		expect(html).toContain('src="/photo.jpg"');
		expect(html).toContain('alt="Photo"');
	});

	it('renders nested elements', async () => {
		const node = makeTag('div', {}, [
			makeTag('h1', {}, ['Title']),
			makeTag('p', {}, ['Body']),
		]);
		const html = await render(node);
		expect(html).toContain('<h1>Title</h1>');
		expect(html).toContain('<p>Body</p>');
	});

	it('renders SVG as raw HTML', async () => {
		const node = makeTag('svg', { width: '16', height: '16', viewBox: '0 0 24 24' }, [
			makeTag('circle', { cx: '12', cy: '12', r: '10' }),
		]);
		const html = await render(node);
		expect(html).toContain('<svg');
		expect(html).toContain('circle');
	});

	it('renders raw HTML content (data-codeblock) without escaping', async () => {
		const node = makeTag('code', { 'data-codeblock': true }, ['<span class="hl">code</span>']);
		const html = await render(node);
		expect(html).toContain('<span class="hl">code</span>');
	});

	// ─── Component overrides (ADR-008) ────────────────────────────

	it('dispatches to registered component by data-rune', async () => {
		const MyHint = defineComponent({
			props: { hintType: String },
			setup(props, { slots }) {
				return () => h('div', { class: `custom-hint custom-hint--${props.hintType}` }, slots.default?.());
			},
		});

		const node = makeTag('div', { 'data-rune': 'hint', class: 'rf-hint' }, [
			makeTag('meta', { 'data-field': 'hint-type', content: 'warning' }),
			makeTag('p', {}, ['Be careful.']),
		]);

		const html = await render(node, { hint: MyHint });
		expect(html).toContain('custom-hint--warning');
		expect(html).toContain('Be careful.');
	});

	it('passes extracted properties as named props', async () => {
		const Recipe = defineComponent({
			props: { prepTime: String, servings: String },
			setup(props) {
				return () => h('div', null, `${props.prepTime} / ${props.servings} servings`);
			},
		});

		const node = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('meta', { 'data-field': 'prep-time', content: '15 min' }),
			makeTag('meta', { 'data-field': 'servings', content: '4' }),
		]);

		const html = await render(node, { recipe: Recipe });
		expect(html).toContain('15 min / 4 servings');
	});

	it('passes named refs as Vue named slots', async () => {
		const Recipe = defineComponent({
			setup(_props, { slots }) {
				return () => h('div', null, [
					slots.media?.(),
					slots.content?.(),
				]);
			},
		});

		const node = makeTag('article', { 'data-rune': 'recipe' }, [
			makeTag('div', { 'data-name': 'media' }, [
				makeTag('img', { src: '/photo.jpg', alt: 'Dish' }),
			]),
			makeTag('div', { 'data-name': 'content' }, [
				makeTag('p', {}, ['Instructions here']),
			]),
		]);

		const html = await render(node, { recipe: Recipe });
		expect(html).toContain('src="/photo.jpg"');
		expect(html).toContain('Instructions here');
		expect(html).toContain('data-ref="media"');
		expect(html).toContain('data-ref="content"');
	});

	it('passes anonymous children as default slot', async () => {
		const Hint = defineComponent({
			setup(_props, { slots }) {
				return () => h('div', { class: 'hint-body' }, slots.default?.());
			},
		});

		const node = makeTag('div', { 'data-rune': 'hint' }, [
			makeTag('p', {}, ['First paragraph.']),
			makeTag('p', {}, ['Second paragraph.']),
		]);

		const html = await render(node, { hint: Hint });
		expect(html).toContain('hint-body');
		expect(html).toContain('First paragraph.');
		expect(html).toContain('Second paragraph.');
	});

	it('passes the original tag prop for escape-hatch access', async () => {
		const Debug = defineComponent({
			props: { tag: Object },
			setup(props) {
				return () => h('pre', null, `rune=${(props.tag as any)?.attributes?.['data-rune']}`);
			},
		});

		const node = makeTag('div', { 'data-rune': 'debug' }, []);
		const html = await render(node, { debug: Debug });
		expect(html).toContain('rune=debug');
	});

	it('falls back to HTML rendering when no component matches', async () => {
		const node = makeTag('div', { 'data-rune': 'unknown', class: 'rf-unknown' }, [
			makeTag('p', {}, ['Content']),
		]);

		const html = await render(node, {});
		expect(html).toContain('rf-unknown');
		expect(html).toContain('Content');
	});

	// ─── Element overrides ───────────────────────────────────────

	it('dispatches to element override by tag name', async () => {
		const TableWrapper = defineComponent({
			props: { tag: Object },
			setup(_props, { slots }) {
				return () => h('div', { class: 'table-wrap' },
					h('table', null, slots.default?.()),
				);
			},
		});

		const node = makeTag('table', { class: 'my-table' }, [
			makeTag('tr', {}, [makeTag('td', {}, ['data'])]),
		]);

		const html = await render(node, undefined, { table: TableWrapper });
		expect(html).toContain('table-wrap');
		expect(html).toContain('data');
	});

	it('component override takes precedence over element override', async () => {
		const MyTable = defineComponent({
			setup() { return () => h('div', null, 'component-override'); },
		});
		const TableElement = defineComponent({
			setup() { return () => h('div', null, 'element-override'); },
		});

		const node = makeTag('table', { 'data-rune': 'datatable', class: 'rf-datatable' }, []);

		const html = await render(node, { datatable: MyTable }, { table: TableElement });
		expect(html).toContain('component-override');
		expect(html).not.toContain('element-override');
	});

	// ─── Built-in element overrides ──────────────────────────────

	it('Table element wraps in rf-table-wrapper', async () => {
		const node = makeTag('table', { class: 'my-table' }, [
			makeTag('tr', {}, [makeTag('td', {}, ['cell'])]),
		]);

		const html = await render(node, undefined, { table: Table });
		expect(html).toContain('rf-table-wrapper');
		expect(html).toContain('cell');
	});

	it('Pre element wraps code blocks in rf-codeblock', async () => {
		const node = makeTag('pre', { 'data-language': 'js', class: 'rf-code' }, [
			makeTag('code', {}, ['const x = 1;']),
		]);

		const html = await render(node, undefined, { pre: Pre });
		expect(html).toContain('rf-codeblock');
		expect(html).toContain('const x = 1;');
	});

	it('Pre element renders plain pre when not a code block', async () => {
		const node = makeTag('pre', {}, ['plain text']);

		const html = await render(node, undefined, { pre: Pre });
		expect(html).not.toContain('rf-codeblock');
		expect(html).toContain('plain text');
	});
});
