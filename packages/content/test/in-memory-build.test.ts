import { describe, it, expect } from 'vitest';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import { ContentTree } from '../src/content-tree.js';
import { loadContentFromTree } from '../src/site.js';

// SPEC-113 / WORK-484 — the keystone: a complete site builds from a pure
// in-memory `Map` with no filesystem access at all. Every input below is a map
// key; nothing is written to disk. The `/virtual/...` project root never
// exists, so if any reader fell back to `fs` the corresponding assertion would
// fail (the read would return null/empty). All four file-touching surfaces —
// pages, partials (local + namespaced fileRoots), a `src`-directory sandbox,
// and a snippet — resolve through `memoryProjectFiles`.
describe('in-memory full-build (SPEC-113, fs-free)', () => {
	function buildMap(): Map<string, string> {
		return new Map<string, string>([
			// Layout at the content root.
			[
				'content/_layout.md',
				'{% layout %}\n{% region name="header" %}\n# In-Memory Header\n{% /region %}\n{% /layout %}\n',
			],
			// Local partial (content/_partials/).
			['content/_partials/footer.md', 'Shared footer from the in-memory map.\n'],
			// A page exercising every reader.
			[
				'content/index.md',
				[
					'---',
					'title: Home',
					'---',
					'',
					'# Welcome to the in-memory build',
					'',
					'{% partial file="footer.md" /%}',
					'',
					'{% partial file="shared:footer.md" /%}',
					'',
					'{% sandbox src="widget" /%}',
					'',
					'{% snippet path="src/sample.ts" /%}',
					'',
				].join('\n'),
			],
			// A nested page, to prove the directory tree is assembled from keys.
			[
				'content/guide/intro.md',
				'---\ntitle: Intro\n---\n\n# Guide intro\n\nThe nested page resolved.\n',
			],
			// Namespaced file-root partial (scanned through the provider).
			['shared/footer.md', 'Namespaced shared footer text.\n'],
			// Sandbox `src` directory (read through the provider).
			['examples/widget/index.html', '<button class="widget">Hello Widget</button>'],
			['examples/widget/style.css', '.widget { color: rebeccapurple; }'],
			// Snippet source file (read through the provider).
			['src/sample.ts', 'export const sample = 42;\nexport const other = 7;\n'],
		]);
	}

	async function build() {
		const files = buildMap();
		const tree = ContentTree.fromContentMap(files, { contentDir: 'content' });
		return loadContentFromTree(tree, {
			projectFiles: memoryProjectFiles(files),
			projectRoot: '/virtual',
			sandboxExamplesDir: 'examples',
			fileRoots: { shared: '/virtual/shared' },
			basePath: '/',
		});
	}

	it('assembles pages and layouts from the map', async () => {
		const site = await build();

		const urls = site.pages.map((p) => p.route.url).sort();
		expect(urls).toContain('/');
		expect(urls).toContain('/guide/intro');

		const home = site.pages.find((p) => p.route.url === '/');
		expect(home).toBeDefined();
		// Layout resolved from the in-memory `_layout.md`.
		expect(home!.layout.chain.length).toBe(1);
		expect(home!.layout.regions.has('header')).toBe(true);

		const nested = site.pages.find((p) => p.route.url === '/guide/intro');
		expect(nested).toBeDefined();
		expect(JSON.stringify(nested!.renderable)).toContain('The nested page resolved');
	});

	it('resolves local + namespaced partials, sandbox src, and a snippet — all from the provider', async () => {
		const site = await build();
		const home = site.pages.find((p) => p.route.url === '/');
		const html = JSON.stringify(home!.renderable);

		// Page body.
		expect(html).toContain('Welcome to the in-memory build');
		// Local `_partials/footer.md`.
		expect(html).toContain('Shared footer from the in-memory map');
		// Namespaced partial via fileRoots scanned through the provider.
		expect(html).toContain('Namespaced shared footer text');
		// `src`-directory sandbox assembled through the provider.
		expect(html).toContain('Hello Widget');
		// Snippet content read through the provider.
		expect(html).toContain('export const sample = 42');

		// Local partials are exposed on the Site object.
		expect(site.partials.has('footer.md')).toBe(true);
	});
});
