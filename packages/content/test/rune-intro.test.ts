import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadContent } from '../src/site.js';

/**
 * SPEC-187 / WORK-706 — the rune intro partial, through the real content
 * pipeline. Two things only a build can show: that the `<h1>` the partial
 * writes from data still sets the page's title, TOC and heading index, and that
 * `file-ref` reads a `path` the `data` rune substituted from `$row`.
 */

const REPO = path.join(__dirname, '..', '..', '..');
const PARTIAL = path.join(REPO, 'site', 'content', '_partials', 'rune-intro.md');

const record = (over: Record<string, unknown> = {}) => ({
	rune: 'widget',
	title: 'Widget',
	description: 'A small composed thing',
	status: 'stable',
	unstable: false,
	package: '@acme/widgets',
	packageLabel: 'widgets',
	packageUrl: '/runes/widgets',
	plugin: true,
	core: false,
	composed: true,
	source: 'plugins/widgets/runes/widget.md',
	publishes: false,
	staged: false,
	compositionBadge: true,
	schemaType: '',
	schemaUrl: '',
	sourceUrl: 'https://github.com/acme/widgets/blob/main/plugins/widgets/runes/widget.md',
	...over,
});

describe('the rune intro partial (WORK-706)', () => {
	let root: string;
	let site: Awaited<ReturnType<typeof loadContent>>;
	let staging: Awaited<ReturnType<typeof loadContent>>;
	const page = (url: string) => site.pages.find((p) => p.route.url === url)!;
	const json = (url: string) => JSON.stringify(page(url).renderable);
	// biome-ignore lint/suspicious/noExplicitAny: a rendered tree is untyped JSON
	const all = (node: any, pred: (n: any) => boolean, out: any[] = []): any[] => {
		if (Array.isArray(node)) {
			for (const c of node) all(c, pred, out);
			return out;
		}
		if (!node || typeof node !== 'object') return out;
		if (pred(node)) out.push(node);
		all(node.children ?? [], pred, out);
		return out;
	};

	beforeAll(async () => {
		root = mkdtempSync(path.join(tmpdir(), 'refrakt-rune-intro-'));
		const content = path.join(root, 'site', 'content');
		mkdirSync(path.join(content, '_partials'), { recursive: true });
		mkdirSync(path.join(content, '_data'), { recursive: true });
		mkdirSync(path.join(root, 'plugins', 'widgets', 'runes'), { recursive: true });
		copyFileSync(PARTIAL, path.join(content, '_partials', 'rune-intro.md'));
		writeFileSync(
			path.join(root, 'plugins', 'widgets', 'runes', 'widget.md'),
			'---\ntag: div\n---\n\nWIDGET-DEFINITION-BODY\n',
		);
		writeFileSync(
			path.join(content, '_data', 'rune-intro.json'),
			JSON.stringify({
				main: [
					record(),
					record({
						rune: 'gadget',
						title: 'Gadget',
						package: 'core',
						packageLabel: 'core',
						packageUrl: '/runes/rune-catalog',
						plugin: false,
						core: true,
						composed: false,
						compositionBadge: false,
						source: 'plugins/widgets/runes/widget.md',
						publishes: true,
						schemaType: 'HowTo',
						schemaUrl: 'https://schema.org/HowTo',
						status: 'beta',
						unstable: true,
					}),
				],
				staging: [
					record({
						staged: true,
						compositionBadge: false,
						source: 'site/staged-runes/widget.md',
					}),
				],
			}),
		);
		const intro = (r: string) =>
			`{% include file="rune-intro.md" variables={r: "rune:${r}"} /%}\n\n## Basic usage\n\nText.\n`;
		writeFileSync(path.join(content, 'widget.md'), `---\ntitle: Widget\n---\n\n${intro('widget')}`);
		writeFileSync(path.join(content, 'gadget.md'), `---\ntitle: Gadget\n---\n\n${intro('gadget')}`);
		mkdirSync(path.join(root, 'site', 'staged-runes'), { recursive: true });
		writeFileSync(path.join(root, 'site', 'staged-runes', 'widget.md'), 'STAGED-DEFINITION-BODY\n');
		const load = (name: string) =>
			loadContent(content, { projectRoot: root, siteConfig: { name } } as never);
		site = await load('main');
		staging = await load('staging');
	});

	afterAll(() => rmSync(root, { recursive: true, force: true }));

	it('writes the title as the page’s h1, which feeds the TOC and heading index', () => {
		const headings = page('/widget').headings;
		expect(headings[0]).toMatchObject({ level: 1, text: 'Widget', id: 'widget' });
		expect(headings.map((h) => h.id)).toContain('basic-usage');
		const index = (site.aggregated.__core__ as { headingIndex: Map<string, unknown> }).headingIndex;
		expect([...index.keys()].some((k) => k.endsWith('#widget'))).toBe(true);
		expect(page('/widget').seo.og.title).toBe('Widget');
		expect(json('/widget')).not.toContain('include error');
	});

	it('reads the snippet path from $row, and the Source drawer holds the file (D12)', () => {
		const out = json('/widget');
		expect(out).toContain('plugins/widgets/runes/widget.md');
		expect(out).toContain('WIDGET-DEFINITION-BODY');
		expect(out).toContain('"data-drawer-id":"rune-source"');
	});

	it('places Install and Source as actions that open their drawers (D10, D11)', () => {
		const links = all(
			page('/widget').renderable,
			(n) => n.name === 'a' && n.attributes?.['data-target-type'] === 'drawer',
		);
		expect(links.map((a) => a.attributes.href)).toEqual([
			'#drawer-rune-install',
			'#drawer-rune-source',
		]);
		const items = all(
			page('/widget').renderable,
			(n) => n.name === 'li' && n.attributes?.['data-rank'] !== undefined,
		);
		expect(items.map((li) => li.attributes['data-rank'])).toEqual(['primary', 'secondary']);
		// A core rune's lone Source action opens its drawer too.
		const core = all(
			page('/gadget').renderable,
			(n) => n.name === 'a' && n.attributes?.['data-target-type'] === 'drawer',
		);
		expect(core.map((a) => a.attributes.href)).toEqual(['#drawer-rune-source']);
	});

	it('names the plugin by its short name, as plain text, in the eyebrow', () => {
		const text = (n: any): string =>
			typeof n === 'string' ? n : (n?.children ?? []).map(text).join('');
		const eyebrow = all(page('/widget').renderable, (n) => n.name === 'p' && text(n) === 'widgets');
		expect(eyebrow).toHaveLength(1);
		expect(all(eyebrow[0], (n) => n.name === 'a')).toEqual([]);
		expect(
			all(page('/gadget').renderable, (n) => n.name === 'p' && text(n) === 'core'),
		).toHaveLength(1);
	});

	it('a composed plugin rune: Composition badge, Install action and drawer, no schema badge', () => {
		const out = json('/widget');
		expect(out).toContain('Composition');
		expect(out).toContain('rune-install');
		expect(out).toContain('npm install ');
		expect(out).toContain('@acme/widgets');
		expect(out).not.toContain('schema.org');
	});

	it('on staging, a staged rune shows Staged in place of Composition, and its staged source (D7)', () => {
		const out = JSON.stringify(staging.pages.find((p) => p.route.url === '/widget')!.renderable);
		expect(out).toContain('Staged');
		expect(out).not.toContain('Composition');
		expect(out).toContain('STAGED-DEFINITION-BODY');
		expect(json('/widget')).not.toContain('Staged');
	});

	it('a native core rune: no Composition badge, no Install, a status and a schema.org badge', () => {
		const out = json('/gadget');
		expect(out).not.toContain('Composition');
		expect(out).not.toContain('rune-install');
		expect(out).toContain('beta');
		expect(out).toContain('https://schema.org/HowTo');
	});
});
