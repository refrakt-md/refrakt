import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';
import { registerDrawers, resolveAutoDrawerTitleLevels } from '../src/drawer-pipeline.js';
import { EntityRegistryImpl } from '../../content/src/registry.js';
import type { PipelineContext, TransformedPage } from '@refrakt-md/types';

function makeCtx() {
	const messages: Array<{ severity: string; message: string; url?: string }> = [];
	const ctx: PipelineContext = {
		info: (message: string, url?: string) => messages.push({ severity: 'info', message, url }),
		warn: (message: string, url?: string) => messages.push({ severity: 'warning', message, url }),
		error: (message: string, url?: string) => messages.push({ severity: 'error', message, url }),
	};
	return { ctx, messages };
}

describe('drawer rune (SPEC-060)', () => {
	describe('schema transform', () => {
		it('renders the drawer body as a section with the canonical BEM shape', () => {
			const result = parse(`{% drawer id="auth" title="Auth system" %}
A brief explainer.
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			expect(drawer).toBeDefined();
			expect(drawer!.name).toBe('section');
			expect(drawer!.attributes.id).toBe('drawer-auth');
			expect(drawer!.attributes['data-drawer-id']).toBe('auth');
		});

		it('renders the title heading inside the header', () => {
			const result = parse(`{% drawer id="auth" title="Auth system" headingLevel=3 %}
Body.
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const header = findTag(drawer!, t => t.attributes['data-name'] === 'header');
			expect(header).toBeDefined();
			const title = findTag(header!, t => t.attributes['data-name'] === 'title');
			expect(title).toBeDefined();
			expect(title!.name).toBe('h3');
			expect(title!.children).toEqual(['Auth system']);
		});

		it('emits an auto-level title placeholder when headingLevel is omitted', () => {
			const result = parse(`{% drawer id="auth" title="Auth system" %}
Body.
{% /drawer %}`);
			const title = findTag(result as any, t => t.attributes['data-name'] === 'title');
			expect(title).toBeDefined();
			expect(title!.name).toBe('h3'); // sentinel placeholder
			expect(title!.attributes['data-drawer-title-auto']).toBe('true');
		});

		it('clamps explicit headingLevel into the 1-6 range', () => {
			const big = parse(`{% drawer id="d1" title="T" headingLevel=99 %}body{% /drawer %}`);
			expect(findTag(big as any, t => t.attributes['data-name'] === 'title')!.name).toBe('h6');

			const small = parse(`{% drawer id="d2" title="T" headingLevel=0 %}body{% /drawer %}`);
			expect(findTag(small as any, t => t.attributes['data-name'] === 'title')!.name).toBe('h1');
		});

		it('emits a close button that is hidden by default', () => {
			const result = parse(`{% drawer id="auth" title="Auth system" %}body{% /drawer %}`);
			const close = findTag(result as any, t => t.attributes['data-name'] === 'close');
			expect(close).toBeDefined();
			expect(close!.name).toBe('button');
			expect(close!.attributes.hidden).toBe(true);
			expect(close!.attributes['aria-label']).toBe('Close');
			expect(close!.attributes.type).toBe('button');
		});

		it('emits side and size meta tags with defaults', () => {
			const result = parse(`{% drawer id="auth" title="T" %}body{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const metas = findAllTags(drawer!, t => t.name === 'meta');
			const fields = new Set(metas.map(m => m.attributes['data-field']));
			expect(fields.has('side')).toBe(true);
			expect(fields.has('size')).toBe(true);
			const sideMeta = metas.find(m => m.attributes['data-field'] === 'side');
			const sizeMeta = metas.find(m => m.attributes['data-field'] === 'size');
			expect(sideMeta!.attributes.content).toBe('right');
			expect(sizeMeta!.attributes.content).toBe('md');
		});

		it('omits the shortcut meta when no shortcut is set', () => {
			const result = parse(`{% drawer id="auth" title="T" %}body{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const shortcutMeta = findTag(drawer!, t => t.attributes['data-field'] === 'shortcut');
			expect(shortcutMeta).toBeUndefined();
		});

		it('emits a shortcut meta when set', () => {
			const result = parse(`{% drawer id="auth" title="T" shortcut="." %}body{% /drawer %}`);
			const shortcutMeta = findTag(result as any, t => t.attributes['data-field'] === 'shortcut');
			expect(shortcutMeta).toBeDefined();
			expect(shortcutMeta!.attributes.content).toBe('.');
		});

		it('supports drawers without a title (header still emitted with the close button)', () => {
			const result = parse(`{% drawer id="quick" %}Just a body.{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const header = findTag(drawer!, t => t.attributes['data-name'] === 'header');
			expect(header).toBeDefined();
			const title = findTag(header!, t => t.attributes['data-name'] === 'title');
			expect(title).toBeUndefined();
			const close = findTag(header!, t => t.attributes['data-name'] === 'close');
			expect(close).toBeDefined();
		});
	});

	describe('body-zone footer split (SPEC-078)', () => {
		it('emits no footer when the body has no top-level hr', () => {
			const result = parse(`{% drawer id="x" title="T" %}
Body content.
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const footer = findTag(drawer!, t => t.attributes['data-name'] === 'footer');
			expect(footer).toBeUndefined();
		});

		it('splits body on the first top-level hr into body + footer', () => {
			const result = parse(`{% drawer id="x" title="T" %}
Main content here.

---

Footer text.
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const body = findTag(drawer!, t => t.attributes['data-name'] === 'body');
			const footer = findTag(drawer!, t => t.attributes['data-name'] === 'footer');
			expect(body).toBeDefined();
			expect(footer).toBeDefined();
			expect(footer!.name).toBe('footer');
			expect(JSON.stringify(body)).toContain('Main content here');
			expect(JSON.stringify(body)).not.toContain('Footer text');
			expect(JSON.stringify(footer)).toContain('Footer text');
		});

		it('footer can carry inline markdoc (links, refs) — generic markdoc rendering', () => {
			const result = parse(`{% drawer id="x" title="T" %}
Body.

---

See [the source](https://example.com/source).
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const footer = findTag(drawer!, t => t.attributes['data-name'] === 'footer');
			expect(footer).toBeDefined();
			const link = findTag(footer!, t => t.name === 'a');
			expect(link).toBeDefined();
			expect(link!.attributes.href).toBe('https://example.com/source');
		});

		it('leading-hr drawer body produces an empty body + footer with the rest', () => {
			const result = parse(`{% drawer id="x" title="T" %}
---

Just footer content.
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const body = findTag(drawer!, t => t.attributes['data-name'] === 'body');
			const footer = findTag(drawer!, t => t.attributes['data-name'] === 'footer');
			expect(body).toBeDefined();
			expect(footer).toBeDefined();
			expect(JSON.stringify(footer)).toContain('Just footer content');
		});

		it('subsequent hrs after the first stay as horizontal rules within the footer', () => {
			const result = parse(`{% drawer id="x" title="T" %}
Body.

---

First footer line.

---

Second footer line.
{% /drawer %}`);
			const drawer = findTag(result as any, t => t.attributes['data-rune'] === 'drawer');
			const footer = findTag(drawer!, t => t.attributes['data-name'] === 'footer');
			expect(footer).toBeDefined();
			expect(JSON.stringify(footer)).toContain('First footer line');
			expect(JSON.stringify(footer)).toContain('Second footer line');
			// hr renders as an <hr> tag inside the footer
			const hrs = findAllTags(footer!, t => t.name === 'hr');
			expect(hrs.length).toBe(1);
		});
	});

	describe('register hook', () => {
		it('registers each drawer as a page-scoped entity', () => {
			const result = parse(`{% drawer id="auth" title="Auth" %}body{% /drawer %}

Some body text.

{% drawer id="billing" title="Billing" side="left" size="lg" shortcut="b" %}other{% /drawer %}`);
			const page: TransformedPage = {
				url: '/docs/things/',
				title: 'Things',
				headings: [],
				frontmatter: {},
				renderable: result,
			};
			const registry = new EntityRegistryImpl();
			const { ctx } = makeCtx();

			registerDrawers([page], registry, ctx);

			const drawers = registry.getAll('drawer');
			expect(drawers).toHaveLength(2);

			const auth = registry.getById('drawer', 'auth', '/docs/things/');
			expect(auth).toBeDefined();
			expect(auth!.scope).toBe('page');
			expect(auth!.sourceUrl).toBe('/docs/things/#drawer-auth');
			expect(auth!.data.title).toBe('Auth');
			expect(auth!.data.side).toBe('right');
			expect(auth!.data.size).toBe('md');

			const billing = registry.getById('drawer', 'billing', '/docs/things/');
			expect(billing!.data.side).toBe('left');
			expect(billing!.data.size).toBe('lg');
			expect(billing!.data.shortcut).toBe('b');
		});

		it('lets two pages register the same drawer id without colliding', () => {
			const pageA: TransformedPage = {
				url: '/page-a/',
				title: 'A',
				headings: [],
				frontmatter: {},
				renderable: parse(`{% drawer id="notes" title="Notes A" %}A body{% /drawer %}`),
			};
			const pageB: TransformedPage = {
				url: '/page-b/',
				title: 'B',
				headings: [],
				frontmatter: {},
				renderable: parse(`{% drawer id="notes" title="Notes B" %}B body{% /drawer %}`),
			};
			const registry = new EntityRegistryImpl();
			const { ctx } = makeCtx();

			registerDrawers([pageA, pageB], registry, ctx);

			expect(registry.getById('drawer', 'notes', '/page-a/')!.data.title).toBe('Notes A');
			expect(registry.getById('drawer', 'notes', '/page-b/')!.data.title).toBe('Notes B');
			expect(registry.getAll('drawer')).toHaveLength(2);
		});

		it('warns when the same drawer id appears more than once on a page', () => {
			const result = parse(`{% drawer id="dup" title="One" %}A{% /drawer %}

{% drawer id="dup" title="Two" %}B{% /drawer %}`);
			const page: TransformedPage = {
				url: '/p/',
				title: 'P',
				headings: [],
				frontmatter: {},
				renderable: result,
			};
			const registry = new EntityRegistryImpl();
			const { ctx, messages } = makeCtx();

			registerDrawers([page], registry, ctx);

			const warnings = messages.filter(m => m.severity === 'warning');
			expect(warnings.length).toBeGreaterThan(0);
			expect(warnings[0].message).toContain('dup');
		});
	});

	describe('auto title-level postProcess', () => {
		it('rewrites a placeholder to h2 when no preceding heading exists', () => {
			const renderable = parse(`{% drawer id="d" title="T" %}body{% /drawer %}`);
			const next = resolveAutoDrawerTitleLevels(renderable);
			const title = findTag(next as any, t => t.attributes['data-name'] === 'title');
			expect(title!.name).toBe('h2');
			expect(title!.attributes['data-drawer-title-auto']).toBeUndefined();
		});

		it('rewrites a placeholder to h3 when the preceding heading is h2', () => {
			const renderable = parse(`## Section

{% drawer id="d" title="T" %}body{% /drawer %}`);
			const next = resolveAutoDrawerTitleLevels(renderable);
			const title = findTag(next as any, t => t.attributes['data-name'] === 'title');
			expect(title!.name).toBe('h3');
		});

		it('rewrites a placeholder to h4 when the preceding heading is h3', () => {
			const renderable = parse(`## Big

### Smaller

{% drawer id="d" title="T" %}body{% /drawer %}`);
			const next = resolveAutoDrawerTitleLevels(renderable);
			const title = findTag(next as any, t => t.attributes['data-name'] === 'title');
			expect(title!.name).toBe('h4');
		});

		it('clamps to h6 even when nested deep', () => {
			const renderable = parse(`###### Deep

{% drawer id="d" title="T" %}body{% /drawer %}`);
			const next = resolveAutoDrawerTitleLevels(renderable);
			const title = findTag(next as any, t => t.attributes['data-name'] === 'title');
			expect(title!.name).toBe('h6');
		});

		it('leaves explicit-level titles alone', () => {
			const renderable = parse(`## Section

{% drawer id="d" title="T" headingLevel=5 %}body{% /drawer %}`);
			const next = resolveAutoDrawerTitleLevels(renderable);
			const title = findTag(next as any, t => t.attributes['data-name'] === 'title');
			expect(title!.name).toBe('h5');
		});
	});
});
