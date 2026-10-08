import { describe, it, expect } from 'vitest';
import { memoryProjectFiles } from '@refrakt-md/types/project-files';
import type { EntityRegistration, Plugin } from '@refrakt-md/types';
import { pluginRuneSchema, SLOT_ATTR } from '@refrakt-md/runes';
import { ContentTree } from '../src/content-tree.js';
import { loadContentFromTree } from '../src/site.js';

/**
 * SPEC-145 — a composed rune through a real site build: the cross-page
 * pipeline, the breadcrumb resolution and the structured-data harvest read the
 * composed rune, never the primitives it is built from (WORK-622).
 *
 * The rune reaches the build as a plugin entry carrying a template and no
 * `transform` (SPEC-153 D11) — the delivery path this milestone gives it.
 */

const DOSSIER = `---
tag: article
attributes:
  role: { type: string, matches: [ally, rival], default: ally }
content:
  type: sequence
  fields:
    name: { match: heading }
    body: { match: any, optional: true, greedy: true }
schema:
  type: Person
  properties: { name: name, role: jobTitle }
registers:
  entity: { type: person, idFrom: name, data: [role] }
---

{% breadcrumb auto=true /%}

{% card %}
{% slot name="name" /%}

{% slot name="body" /%}
{% /card %}
`;

const plugin: Plugin = {
	name: 'composed-fixture',
	version: '0.0.0',
	runes: { dossier: { template: DOSSIER } },
};

const FILES = new Map<string, string>([
	['content/index.md', '---\ntitle: Home\n---\n\n# Home\n'],
	['content/people/index.md', '---\ntitle: People\n---\n\n# People\n'],
	[
		'content/people/veshra.md',
		'---\ntitle: Veshra\n---\n\n{% dossier role="rival" %}\n## Veshra\n\nA necromancer.\n{% /dossier %}\n',
	],
]);

async function build() {
	const tree = ContentTree.fromContentMap(FILES, { contentDir: 'content' });
	return loadContentFromTree(tree, {
		projectFiles: memoryProjectFiles(FILES),
		projectRoot: '/virtual',
		plugins: [plugin],
		additionalTags: { dossier: pluginRuneSchema('dossier', plugin.runes.dossier)! },
	});
}

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
type Json = any;

function runes(node: Json, out: string[] = []): string[] {
	if (Array.isArray(node)) {
		for (const c of node) runes(c, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (node.attributes?.['data-rune']) out.push(node.attributes['data-rune']);
	for (const c of node.children ?? []) runes(c, out);
	return out;
}

describe('a composed rune through the cross-page pipeline (SPEC-145)', () => {
	it('is the rune the page carries; its primitives sit inside it', async () => {
		const site = await build();
		const page = site.pages.find((p) => p.route.url === '/people/veshra')!;
		const found = runes(page.renderable);
		expect(found[0]).toBe('dossier');
		expect(found).toContain('card');
		expect(found.indexOf('card')).toBeGreaterThan(found.indexOf('dossier'));
	});

	it('registers the composed rune in the cross-page registry, not a primitive', async () => {
		const site = await build();
		const index = (site.aggregated['composed-fixture'] as { entityByName: Map<string, unknown> })
			.entityByName;
		const veshra = index.get('Veshra') as EntityRegistration;
		expect(veshra).toMatchObject({
			type: 'person',
			id: 'Veshra',
			sourceUrl: '/people/veshra',
			data: { role: 'rival' },
		});
		expect(site.pipelineWarnings).toEqual([]);
	});

	it('resolves a `breadcrumb auto` the template places, in Phase 4', async () => {
		const site = await build();
		const page = site.pages.find((p) => p.route.url === '/people/veshra')!;
		const trail = page.seo.jsonLd.find(
			(e) => (e as Record<string, unknown>)['@type'] === 'BreadcrumbList',
		) as Record<string, unknown> | undefined;
		expect(trail).toBeDefined();
		expect((trail!.itemListElement as Array<{ name: string }>).map((i) => i.name)).toEqual([
			'Home',
			'People',
			'Veshra',
		]);
	});

	it('publishes the composed rune’s type, with its slot-placed name, and no primitive’s', async () => {
		const site = await build();
		const page = site.pages.find((p) => p.route.url === '/people/veshra')!;
		const person = page.seo.jsonLd.find(
			(e) => (e as Record<string, unknown>)['@type'] === 'Person',
		);
		expect(person).toMatchObject({ '@type': 'Person', name: 'Veshra', jobTitle: 'rival' });
		const types = page.seo.jsonLd.map((e) => (e as Record<string, unknown>)['@type']);
		expect(types.sort()).toEqual(['BreadcrumbList', 'Person']);
		// The heading keeps its published slot name in the output.
		expect(JSON.stringify(page.renderable)).toContain(`"${SLOT_ATTR}":"name"`);
	});
});
