import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import type { SiteConfig } from '@refrakt-md/types';
import { setupContentHmr } from '@refrakt-md/transform/node';
import { ContentTree } from '../src/content-tree.js';
import { createRefraktLoader, createVirtualRefraktLoader } from '../src/refract-loader.js';
import { composedDir } from './composed-storytelling.js';

/**
 * WORK-634 — a project's `runes.dir`, end to end through the loaders every
 * adapter uses: the hosted one over `memoryProjectFiles` (SPEC-153 D5), and the
 * filesystem one in dev, where editing a definition rebuilds every page using
 * it (D10).
 */

const bond = readFileSync(join(composedDir, 'runes', 'bond.md'), 'utf-8');

const temps: string[] = [];
afterAll(() => {
	for (const t of temps) rmSync(t, { recursive: true, force: true });
});

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
const json = (node: any) => JSON.stringify(node);

describe('hosted: project runes from memoryProjectFiles (SPEC-153 D5)', () => {
	it('a definition in the map renders on a page built from the same map', async () => {
		// One map, as a host materialises a repository: content and rune
		// definitions side by side, project-root-relative.
		const files = new Map([
			['content/index.md', '# Home\n\n{% bond from="Aria" to="Veshra" %}\nRivals.\n{% /bond %}\n'],
			['runes/bond.md', bond],
		]);
		const loader = createVirtualRefraktLoader({
			site: { contentDir: 'content', theme: '@refrakt-md/lumina' } as SiteConfig,
			tree: ContentTree.fromContentMap(files, { contentDir: 'content' }),
			projectFiles: memoryProjectFiles(files),
		});
		const site = await loader.getSite();
		const page = site.pages.find((p) => p.route.url === '/')!;
		const transform = await loader.getTransform();
		const html = json(transform(page.renderable));
		expect(html).toContain('"data-rune":"bond"');
		expect(html).toContain('"data-rune":"hint"');
		expect(html).toContain('Rivals.');
		expect(site.pipelineWarnings.filter((w) => w.severity === 'error')).toEqual([]);
	});

	it('without projectFiles the project defines no runes', async () => {
		const files = new Map([
			['content/index.md', '{% bond from="Aria" to="Veshra" %}\nRivals.\n{% /bond %}\n'],
			['runes/bond.md', bond],
		]);
		const loader = createVirtualRefraktLoader({
			site: { contentDir: 'content', theme: '@refrakt-md/lumina' } as SiteConfig,
			tree: ContentTree.fromContentMap(files, { contentDir: 'content' }),
		});
		const site = await loader.getSite();
		const transform = await loader.getTransform();
		expect(json(transform(site.pages[0].renderable))).not.toContain('"data-rune":"bond"');
	});
});

describe('dev: editing a definition rebuilds every page that uses it (SPEC-153 D10)', () => {
	it('on a two-page site where only one page uses the rune', async () => {
		const root = mkdtempSync(join(tmpdir(), 'refrakt-runes-dir-dev-'));
		temps.push(root);
		mkdirSync(join(root, 'content'));
		mkdirSync(join(root, 'runes'));
		writeFileSync(
			join(root, 'refrakt.config.json'),
			JSON.stringify({ sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina' } } }),
		);
		writeFileSync(
			join(root, 'content', 'uses.md'),
			'# Uses\n\n{% shout %}\nHello.\n{% /shout %}\n',
		);
		writeFileSync(join(root, 'content', 'other.md'), '# Other\n\nNo runes here.\n');
		const definition = (word: string) =>
			[
				'---',
				'tag: aside',
				'content:',
				'  type: sequence',
				'  fields:',
				'    body: { match: any, optional: true, greedy: true }',
				'---',
				'',
				`**${word}**`,
				'',
				'{% slot name="body" /%}',
				'',
			].join('\n');
		writeFileSync(join(root, 'runes', 'shout.md'), definition('Version one'));

		const loader = createRefraktLoader({
			configPath: join(root, 'refrakt.config.json'),
			reporter: () => {},
		});

		// The dev server's watcher, as setupContentHmr drives it.
		const handlers: Record<string, Array<(file: string) => void>> = {};
		const sent: string[] = [];
		const watched: string[] = [];
		setupContentHmr(
			{
				watcher: {
					add: (p: string) => watched.push(p),
					on: (event: string, fn: (file: string) => void) => {
						(handlers[event] ??= []).push(fn);
					},
				},
				moduleGraph: { getModulesByFile: () => undefined, invalidateModule: () => {} },
				ws: { send: (payload: { type: string }) => sent.push(payload.type) },
			} as never,
			join(root, 'content'),
			undefined,
			() => loader.invalidateSite(),
			{ runesDir: join(root, 'runes') },
		);
		expect(watched).toContain(join(root, 'runes'));

		const render = async () => {
			const site = await loader.getSite();
			const transform = await loader.getTransform();
			const byUrl = (url: string) =>
				json(transform(site.pages.find((p) => p.route.url === url)!.renderable));
			return { uses: byUrl('/uses'), other: byUrl('/other') };
		};

		const before = await render();
		expect(before.uses).toContain('Version one');
		expect(before.uses).toContain('"data-rune":"shout"');

		writeFileSync(join(root, 'runes', 'shout.md'), definition('Version two'));
		for (const fn of handlers.change ?? []) fn(join(root, 'runes', 'shout.md'));
		expect(sent).toEqual(['full-reload']);

		const after = await render();
		// The page using the rune is rebuilt from the new definition…
		expect(after.uses).toContain('Version two');
		expect(after.uses).not.toContain('Version one');
		// …and the page that does not use it is unaffected.
		expect(after.other).toEqual(before.other);

		// A non-definition file in the directory is not a rune edit.
		for (const fn of handlers.change ?? []) fn(join(root, 'runes', 'notes.txt'));
		expect(sent).toEqual(['full-reload']);
	});

	it('a content edit alone keeps the rune set', async () => {
		const root = mkdtempSync(join(tmpdir(), 'refrakt-runes-dir-dev-'));
		temps.push(root);
		mkdirSync(join(root, 'content'));
		mkdirSync(join(root, 'runes'));
		writeFileSync(
			join(root, 'refrakt.config.json'),
			JSON.stringify({ sites: { main: { contentDir: './content', theme: '@refrakt-md/lumina' } } }),
		);
		writeFileSync(join(root, 'content', 'index.md'), '# One\n');
		writeFileSync(join(root, 'runes', 'bond.md'), bond);
		const loader = createRefraktLoader({
			configPath: join(root, 'refrakt.config.json'),
			reporter: () => {},
		});
		const t1 = await loader.getTransform();
		writeFileSync(join(root, 'content', 'index.md'), '# Two\n');
		loader.invalidateSite();
		expect(await loader.getTransform()).toBe(t1);
		const site = await loader.getSite();
		expect(json(site.pages[0].renderable)).toContain('Two');
	});
});
