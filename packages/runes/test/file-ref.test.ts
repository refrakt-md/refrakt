import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { tags, nodes } from '../src/index.js';
import { resolveFileRefs } from '../src/file-ref-resolve.js';
import { hoistPreviewDrawers, HOIST_DRAWER_SENTINEL, pathToSlug } from '../src/drawer-pipeline.js';
import type { PipelineContext } from '@refrakt-md/types';

const { Tag } = Markdoc;

const REPO = 'https://github.com/refrakt-md/refrakt';

function makeCtx() {
	const messages: Array<{ severity: string; message: string; url?: string }> = [];
	const ctx: PipelineContext = {
		info: (message, url) => messages.push({ severity: 'info', message, url }),
		warn: (message, url) => messages.push({ severity: 'warning', message, url }),
		error: (message, url) => messages.push({ severity: 'error', message, url }),
	};
	return { ctx, messages };
}

function render(src: string): unknown {
	const ast = Markdoc.parse(src);
	return Markdoc.transform(ast, { tags, nodes, variables: {} } as never);
}

function findAll(node: unknown, pred: (t: InstanceType<typeof Tag>) => boolean) {
	const out: InstanceType<typeof Tag>[] = [];
	const walk = (n: unknown) => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!Tag.isTag(n as never)) return;
		const t = n as InstanceType<typeof Tag>;
		if (pred(t)) out.push(t);
		(t.children ?? []).forEach(walk);
	};
	walk(node);
	return out;
}

describe('file-ref rune (SPEC-078)', () => {
	describe('without preview', () => {
		it('renders an inline anchor with the resolved GitHub URL', () => {
			const tree = render('See {% file-ref path="packages/types/src/token-contract.ts" lines="42-58" label="ThemeTokensConfig" /%}.');
			const { ctx } = makeCtx();
			const resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			const anchors = findAll(resolved, t => t.name === 'a' && (t.attributes.href as string | undefined)?.includes('github.com'));
			expect(anchors).toHaveLength(1);
			expect(anchors[0].attributes.href).toBe(
				'https://github.com/refrakt-md/refrakt/blob/main/packages/types/src/token-contract.ts#L42-L58',
			);
			expect(anchors[0].children).toEqual(['ThemeTokensConfig']);
		});

		it('label defaults to the filename when omitted', () => {
			const tree = render('{% file-ref path="packages/types/src/token-contract.ts" /%}');
			const { ctx } = makeCtx();
			const resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			const anchors = findAll(resolved, t => t.name === 'a');
			expect(anchors[0].children).toEqual(['token-contract.ts']);
		});

		it('emits a build warning + no href when repoUrl is missing', () => {
			const tree = render('{% file-ref path="foo.ts" label="Foo" /%}');
			const { ctx, messages } = makeCtx();
			const resolved = resolveFileRefs(tree, '/p/', undefined, undefined, ctx);
			const anchor = findAll(resolved, t => t.name === 'a' && t.children?.[0] === 'Foo')[0];
			expect(anchor).toBeDefined();
			expect(anchor.attributes.href).toBeUndefined();
			expect(messages.filter(m => m.severity === 'warning')).toHaveLength(1);
		});

		it('per-page repoUrl warning fires at most once even with many file-refs', () => {
			const tree = render('{% file-ref path="a.ts" /%} and {% file-ref path="b.ts" /%} and {% file-ref path="c.ts" /%}.');
			const { ctx, messages } = makeCtx();
			resolveFileRefs(tree, '/p/', undefined, undefined, ctx);
			expect(messages.filter(m => m.severity === 'warning')).toHaveLength(1);
		});

		it('supports tag and SHA refs via repoBranch', () => {
			const tree = render('{% file-ref path="foo.ts" lines="42" /%}');
			const { ctx } = makeCtx();
			const resolved = resolveFileRefs(tree, '/p/', REPO, 'v0.16.0', ctx);
			const anchor = findAll(resolved, t => t.name === 'a' && (t.attributes.href as string | undefined)?.startsWith(REPO))[0];
			expect(anchor.attributes.href).toBe(`${REPO}/blob/v0.16.0/foo.ts#L42`);
		});

		it('does not break the surrounding paragraph', () => {
			const tree = render('See {% file-ref path="foo.ts" label="x" /%} for details.');
			const { ctx } = makeCtx();
			const resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			// The outer paragraph stays intact — there's still exactly one <p> wrapping the prose.
			const paragraphs = findAll(resolved, t => t.name === 'p');
			expect(paragraphs).toHaveLength(1);
		});
	});

	describe('with preview="drawer"', () => {
		it('emits a hoist sentinel + the inline anchor links to the drawer fragment', () => {
			const tree = render('See {% file-ref path="foo.ts" lines="1-10" label="x" preview="drawer" /%}.');
			const { ctx } = makeCtx();
			const resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);

			const slug = pathToSlug('foo.ts', '1-10');
			const anchor = findAll(resolved, t => t.name === 'a' && t.children?.[0] === 'x')[0];
			expect(anchor.attributes.href).toBe(`#drawer-${slug}`);
			expect(anchor.attributes['aria-controls']).toBe(`drawer-${slug}`);
			expect(anchor.attributes['aria-expanded']).toBe('false');
			expect(anchor.attributes['data-target-type']).toBe('drawer');

			const sentinels = findAll(
				resolved,
				t => t.name === 'meta' && t.attributes['data-field'] === HOIST_DRAWER_SENTINEL,
			);
			expect(sentinels).toHaveLength(1);
			expect(sentinels[0].attributes['data-source']).toBe('file-ref');
			expect(sentinels[0].attributes['data-target-id']).toBe(slug);
			expect(sentinels[0].attributes['data-path']).toBe('foo.ts');
			expect(sentinels[0].attributes['data-lines']).toBe('1-10');
		});

		it('builds a hoisted drawer with snippet body + GitHub footer when repoUrl + projectRoot resolve', () => {
			const tree = render('{% file-ref path="package.json" preview="drawer" /%}');
			const { ctx } = makeCtx();
			let resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			// Use the actual project root so readSnippetFile finds a real file.
			resolved = hoistPreviewDrawers(resolved, '/p/', undefined, process.cwd(), ctx);

			// Hoisted drawer at the page root.
			const drawers = findAll(resolved, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			const drawer = drawers[0];
			expect((drawer.attributes.id as string).startsWith('drawer-')).toBe(true);

			// Snippet body inside the drawer.
			const figures = findAll(drawer, t => t.name === 'figure' && t.attributes['data-rune'] === 'snippet');
			expect(figures).toHaveLength(1);
			expect(figures[0].attributes['data-source-path']).toBe('package.json');

			// Footer with View source on GitHub →.
			const footers = findAll(drawer, t => t.name === 'footer');
			expect(footers).toHaveLength(1);
			const footerLinks = findAll(footers[0], t => t.name === 'a');
			expect(footerLinks).toHaveLength(1);
			expect(footerLinks[0].attributes.href).toContain(REPO);
			expect((footerLinks[0].children?.[0] as string).startsWith('View source on GitHub')).toBe(true);
		});

		it('omits the footer link when repoUrl is missing', () => {
			const tree = render('{% file-ref path="package.json" preview="drawer" /%}');
			const { ctx } = makeCtx();
			let resolved = resolveFileRefs(tree, '/p/', undefined, undefined, ctx);
			resolved = hoistPreviewDrawers(resolved, '/p/', undefined, process.cwd(), ctx);
			const drawers = findAll(resolved, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			const footers = findAll(drawers[0], t => t.name === 'footer');
			expect(footers).toHaveLength(0);
		});

		it('emits a build error and no drawer when projectRoot is missing', () => {
			const tree = render('{% file-ref path="foo.ts" preview="drawer" /%}');
			const { ctx, messages } = makeCtx();
			let resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			resolved = hoistPreviewDrawers(resolved, '/p/', undefined, undefined, ctx);
			const drawers = findAll(resolved, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(0);
			expect(messages.filter(m => m.severity === 'error').length).toBeGreaterThan(0);
		});

		it('emits a build error when the path escapes the sandbox', () => {
			const tree = render('{% file-ref path="../escape.ts" preview="drawer" /%}');
			const { ctx, messages } = makeCtx();
			let resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			resolved = hoistPreviewDrawers(resolved, '/p/', undefined, process.cwd(), ctx);
			expect(messages.filter(m => m.severity === 'error').length).toBeGreaterThan(0);
		});

		it('multiple references to the same path+lines hoist a single drawer', () => {
			const tree = render('A {% file-ref path="package.json" preview="drawer" label="one" /%} and B {% file-ref path="package.json" preview="drawer" label="two" /%}.');
			const { ctx } = makeCtx();
			let resolved = resolveFileRefs(tree, '/p/', REPO, 'main', ctx);
			resolved = hoistPreviewDrawers(resolved, '/p/', undefined, process.cwd(), ctx);
			const drawers = findAll(resolved, t => t.attributes['data-rune'] === 'drawer');
			expect(drawers).toHaveLength(1);
			// Both inline anchors point at the same hoisted drawer.
			const anchors = findAll(resolved, t => t.name === 'a' && typeof t.attributes.href === 'string' && (t.attributes.href as string).startsWith('#drawer-'));
			expect(anchors).toHaveLength(2);
			expect(anchors[0].attributes.href).toBe(anchors[1].attributes.href);
		});
	});
});
