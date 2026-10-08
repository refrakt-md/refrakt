import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffold } from '../src/scaffold.js';

/**
 * WORK-634 — `create-refrakt` scaffolds the `runes.dir` key (SPEC-153 D4), and a
 * scaffolded project with one definition in `runes/` builds and renders it.
 * "Builds" here is `createRefraktLoader`, the loader every Vite adapter's SSR
 * and build path runs; the scaffold's own `npm install` is not exercised.
 */

const root = join(
	tmpdir(),
	`create-refrakt-runes-${Date.now()}-${Math.random().toString(36).slice(2)}`,
);
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('scaffold: project rune directory', () => {
	it('writes `runes.dir`, and a definition dropped into `runes/` builds and renders', async () => {
		const targetDir = join(root, 'my-site');
		await scaffold({ projectName: 'my-site', targetDir, theme: '@refrakt-md/lumina' });

		const config = JSON.parse(readFileSync(join(targetDir, 'refrakt.config.json'), 'utf-8'));
		expect(config.sites.main.runes).toEqual({ dir: 'runes' });

		// One definition, as a user would write it, and a page that uses it.
		mkdirSync(join(targetDir, 'runes'), { recursive: true });
		writeFileSync(
			join(targetDir, 'runes', 'quote-card.md'),
			[
				'---',
				'tag: aside',
				'attributes:',
				'  by: { type: string, required: true }',
				'content:',
				'  type: sequence',
				'  fields:',
				'    quote: { match: any, optional: true, greedy: true }',
				'---',
				'',
				'{% hint type="note" %}',
				'{% slot name="quote" /%}',
				'',
				'— {% $attrs.by %}',
				'{% /hint %}',
				'',
			].join('\n'),
		);
		writeFileSync(
			join(targetDir, 'content', 'quoted.md'),
			'---\ntitle: Quoted\n---\n\n{% quote-card by="Ada" %}\nThe engine weaves patterns.\n{% /quote-card %}\n',
		);

		const { createRefraktLoader } = await import('@refrakt-md/content');
		const loader = createRefraktLoader({
			configPath: join(targetDir, 'refrakt.config.json'),
			reporter: () => {},
		});
		const site = await loader.getSite();
		const page = site.pages.find((p) => p.route.url === '/quoted');
		expect(page).toBeDefined();
		const html = JSON.stringify((await loader.getTransform())(page!.renderable));
		expect(html).toContain('"data-rune":"quote-card"');
		expect(html).toContain('The engine weaves patterns.');
		expect(html).toContain('— ');
		expect(html).toContain('Ada');
		// No diagnostic about the rune. (The starter's `_layout.md` nav has an
		// unrelated `getting-started` item that resolves to no page; that error
		// is on every page of a fresh scaffold and is not this test's subject.)
		expect(
			site.pipelineWarnings.filter((w) => /quote-card|tag-undefined|undefined tag/.test(w.message)),
		).toEqual([]);
	});
});
