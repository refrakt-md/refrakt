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
	packageLabel: '@acme/widgets',
	packageUrl: '/runes/widgets',
	plugin: true,
	composed: true,
	source: 'plugins/widgets/runes/widget.md',
	publishes: false,
	schemaType: '',
	schemaUrl: '',
	...over,
});

describe('the rune intro partial (WORK-706)', () => {
	let root: string;
	let site: Awaited<ReturnType<typeof loadContent>>;
	const page = (url: string) => site.pages.find((p) => p.route.url === url)!;
	const json = (url: string) => JSON.stringify(page(url).renderable);

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
				runes: [
					record(),
					record({
						rune: 'gadget',
						title: 'Gadget',
						package: 'core',
						packageLabel: 'Core',
						packageUrl: '/runes/rune-catalog',
						plugin: false,
						composed: false,
						source: 'plugins/widgets/runes/widget.md',
						publishes: true,
						schemaType: 'HowTo',
						schemaUrl: 'https://schema.org/HowTo',
						status: 'beta',
						unstable: true,
					}),
				],
			}),
		);
		const intro = (r: string) =>
			`{% include file="rune-intro.md" variables={r: "rune:${r}"} /%}\n\n## Basic usage\n\nText.\n`;
		writeFileSync(path.join(content, 'widget.md'), `---\ntitle: Widget\n---\n\n${intro('widget')}`);
		writeFileSync(path.join(content, 'gadget.md'), `---\ntitle: Gadget\n---\n\n${intro('gadget')}`);
		site = await loadContent(
			content,
			'/',
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			/* projectRoot */ root,
		);
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

	it('reads the file-ref path from $row, and the Source drawer holds the file', () => {
		const out = json('/widget');
		expect(out).toContain('plugins/widgets/runes/widget.md');
		expect(out).toContain('WIDGET-DEFINITION-BODY');
	});

	it('a composed plugin rune: Composition badge, Install action and drawer, no schema badge', () => {
		const out = json('/widget');
		expect(out).toContain('Composition');
		expect(out).toContain('rune-install');
		expect(out).toContain('npm install ');
		expect(out).toContain('@acme/widgets');
		expect(out).not.toContain('schema.org');
	});

	it('a native core rune: no Composition badge, no Install, a status and a schema.org badge', () => {
		const out = json('/gadget');
		expect(out).not.toContain('Composition');
		expect(out).not.toContain('rune-install');
		expect(out).toContain('beta');
		expect(out).toContain('https://schema.org/HowTo');
		expect(out).toContain('Core');
	});
});
