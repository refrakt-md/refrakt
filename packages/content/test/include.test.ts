import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadContent } from '../src/site.js';

/**
 * `include` through the real content pipeline (SPEC-129).
 *
 * The unit tests in `packages/runes/test/include-pipeline.test.ts` stub the
 * preprocess context. These assert the two things only a real build can: that
 * the partial map is actually threaded into that context by `loadContent`, and
 * that it is the *same* map `{% partial %}` reads — the `_partials/` directory
 * and the registered `namespace:file` roots.
 */
describe('include through a real build', () => {
	let root: string;
	let contentDir: string;
	let sharedDir: string;

	beforeEach(() => {
		root = mkdtempSync(path.join(tmpdir(), 'refrakt-include-'));
		contentDir = path.join(root, 'content');
		sharedDir = path.join(root, 'shared-partials');
		mkdirSync(path.join(contentDir, '_partials'), { recursive: true });
		mkdirSync(sharedDir, { recursive: true });
		writeFileSync(
			path.join(root, 'people.csv'),
			'name,role\nAda,Engineer\nGrace,Admiral\n',
		);
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	const build = (fileRoots?: Record<string, string>) =>
		loadContent(
			contentDir, '/', undefined, undefined, undefined, undefined,
			undefined, undefined, /* projectRoot */ root, undefined, fileRoots,
		);

	const html = (site: Awaited<ReturnType<typeof loadContent>>, url = '/') =>
		JSON.stringify(site.pages.find((p) => p.route.url === url)!.renderable);

	it('resolves a {% data %} inside an included partial', async () => {
		writeFileSync(
			path.join(contentDir, '_partials', 'rows.md'),
			'{% data src="people.csv" %}\n## {% $row.name %}\n{% /data %}\n',
		);
		writeFileSync(
			path.join(contentDir, 'index.md'),
			'---\ntitle: Home\n---\n\n{% include file="rows.md" /%}\n',
		);

		const site = await build();
		expect(html(site)).toContain('Ada');
		expect(html(site)).toContain('Grace');
		expect(html(site)).not.toContain('include error');
	});

	it('carries a binding into the {% data %} attribute', async () => {
		writeFileSync(
			path.join(contentDir, '_partials', 'rows.md'),
			'{% data src="people.csv" where=$q %}\n## {% $row.name %}\n{% /data %}\n',
		);
		writeFileSync(
			path.join(contentDir, 'index.md'),
			'---\ntitle: Home\n---\n\n{% include file="rows.md" variables={q: "role:Admiral"} /%}\n',
		);

		const site = await build();
		// Assert on the row that must be *absent*: an unresolved `where` is an
		// empty one, which filters nothing and would pass a "did Grace render?"
		// check while rendering the whole source (BUG-010).
		expect(html(site)).toContain('Grace');
		expect(html(site)).not.toContain('Ada');
	});

	it('reads the same namespaced file roots {% partial %} does', async () => {
		writeFileSync(
			path.join(sharedDir, 'rows.md'),
			'{% data src="people.csv" %}\n## {% $row.name %}\n{% /data %}\n',
		);
		writeFileSync(
			path.join(contentDir, 'index.md'),
			'---\ntitle: Home\n---\n\n{% include file="shared:rows.md" /%}\n',
		);

		const site = await build({ shared: sharedDir });
		expect(html(site)).toContain('Ada');
		expect(html(site)).not.toContain('include error');
	});

	it('gives two pages including one file independent copies', async () => {
		// The partial ASTs are parsed once per build and shared by every page.
		// Nesting the `data` inside a container puts the preprocessor's in-place
		// splice inside a *pasted* node, which is where a missing clone writes one
		// page's result into the next page's source.
		writeFileSync(
			path.join(contentDir, '_partials', 'rows.md'),
			'{% div %}\n{% data src="people.csv" where=$q %}\n## {% $row.name %}\n{% /data %}\n{% /div %}\n',
		);
		writeFileSync(
			path.join(contentDir, 'one.md'),
			'---\ntitle: One\n---\n\n{% include file="rows.md" variables={q: "role:Engineer"} /%}\n',
		);
		writeFileSync(
			path.join(contentDir, 'two.md'),
			'---\ntitle: Two\n---\n\n{% include file="rows.md" variables={q: "role:Admiral"} /%}\n',
		);

		const site = await build();
		expect(html(site, '/one')).toContain('Ada');
		expect(html(site, '/one')).not.toContain('Grace');
		expect(html(site, '/two')).toContain('Grace');
		expect(html(site, '/two')).not.toContain('Ada');
	});

	it('reports a missing include on the page without failing the build', async () => {
		writeFileSync(
			path.join(contentDir, 'index.md'),
			'---\ntitle: Home\n---\n\n# Title\n\n{% include file="nope.md" /%}\n',
		);

		const site = await build();
		expect(html(site)).toContain('include error');
		expect(html(site)).toContain('Title');
	});
});
