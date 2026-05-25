import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Markdoc from '@markdoc/markdoc';
import { loadContent } from '../src/site.js';
import plan, { planPipelineHooks } from '@refrakt-md/plan';

// End-to-end proof of the SPEC-071 dogfood mechanism: plan entities (scanned
// from plan/) become detail pages via entityRoutes ({% expand $item.id /%}),
// and a collection lists them. Verifies the SPEC-069 + SPEC-070 chain.

let root: string;
const blob = (n: unknown) => JSON.stringify(n);

beforeEach(() => {
	root = join(tmpdir(), `refrakt-dogfood-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	// Plan entity sources (registry sources, not content pages).
	mkdirSync(join(root, 'plan', 'specs'), { recursive: true });
	mkdirSync(join(root, 'plan', 'work'), { recursive: true });
	writeFileSync(join(root, 'plan', 'specs', 'SPEC-001-foo.md'), `{% spec id="SPEC-001" status="accepted" %}\n\n# Foo spec\n\nThe foo specification body.\n\n{% /spec %}\n`);
	writeFileSync(join(root, 'plan', 'work', 'WORK-001-bar.md'), `{% work id="WORK-001" status="ready" priority="high" %}\n\n# Bar work\n\nWork body.\n\n{% /work %}\n`);
	writeFileSync(join(root, 'plan', 'work', 'WORK-002-baz.md'), `{% work id="WORK-002" status="done" priority="low" %}\n\n# Baz work\n\nDone body.\n\n{% /work %}\n`);
	// Plan-site content dir: a dashboard listing work via collection.
	mkdirSync(join(root, 'plan-site'), { recursive: true });
	writeFileSync(join(root, 'plan-site', 'index.md'), `---\ntitle: Plan\n---\n\n# Plan dashboard\n\n{% collection type="work" filter="status:ready" sort="priority" layout="cards" fields="status,priority" /%}\n`);
});

afterEach(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });

describe('plan-site dogfood (SPEC-071)', () => {
	it('generates entity detail pages via entityRoutes and lists them via collection', async () => {
		// configure() is normally driven by the adapter; call it so the plan
		// plugin knows its plan.dir (and registers `plan:` file-root).
		await planPipelineHooks.configure!({ config: { plan: { dir: 'plan' } }, configDir: root } as never);

		const siteConfig = {
			contentDir: './plan-site',
			theme: 'lumina',
			entityRoutes: [
				{ type: 'spec', url: '/specs/{id}/', title: '{title}', render: '{% expand $item.id /%}' },
				{ type: 'work', url: '/work/{id}/', title: '{id} — {title}', render: '{% expand $item.id /%}' },
			],
		};
		// loadContent(dirPath, basePath, icons, additionalTags, packages, sandboxExamplesDir,
		//   variables, securityPolicy, projectRoot, xrefPatterns, fileRoots, siteConfig)
		const site = await loadContent(
			join(root, 'plan-site'), '/', undefined, undefined, [plan],
			undefined, undefined, undefined, root, undefined, undefined, siteConfig,
		);

		const urls = site.pages.map((p) => p.route.url).sort();
		// entityRoutes generated one detail page per entity, plus the file-backed index
		expect(urls).toContain('/specs/SPEC-001/');
		expect(urls).toContain('/work/WORK-001/');
		expect(urls).toContain('/work/WORK-002/');

		// the spec detail page rendered the expanded entity body (via expand + sourceFile)
		const specPage = site.pages.find((p) => p.route.url === '/specs/SPEC-001/');
		expect(specPage).toBeDefined();
		expect(specPage!.source?.type).toBe('contributed');
		expect(blob(specPage!.renderable)).toContain('The foo specification body.');

		// the dashboard collection listed only the ready work item
		const index = site.pages.find((p) => p.route.url === '/');
		const indexBlob = blob(index!.renderable);
		expect(indexBlob).toContain('Bar work');   // WORK-001 ready
		expect(indexBlob).not.toContain('Baz work'); // WORK-002 done, filtered out
	});
});
