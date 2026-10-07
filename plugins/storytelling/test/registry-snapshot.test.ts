import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EntityRegistryImpl, loadContent } from '@refrakt-md/content';
import { defineRune, mergePlugins, runes as coreRunes } from '@refrakt-md/runes';
import type { EntityRegistration } from '@refrakt-md/types';
import { storytelling } from '../src/index.js';

/**
 * SPEC-144 D4 — the gate for migrating storytelling's registration onto
 * `registers` (WORK-612).
 *
 * The snapshot was captured from the hand-written `register` / `aggregate` hooks
 * *before* the migration, over the fixture site beside this file, and is
 * committed. The migrated code must reproduce it exactly: every registration —
 * type, id, scope, sourceUrl and data bag — in the same order, because order
 * decides last-write-wins on a site-scoped collision. The name index the
 * plugin's `postProcess` reads (ids plus character aliases, first alias wins)
 * and the cross-links that `postProcess` produces from it are held to the same
 * standard.
 *
 * Never regenerate the snapshot to make this pass. Set
 * `REFRAKT_WRITE_REGISTRY_SNAPSHOT=1` only when the registry is *meant* to
 * change, and review the diff.
 */

const here = dirname(fileURLToPath(import.meta.url));
const siteDir = join(here, 'fixtures', 'registry-site');
const snapshotPath = join(here, 'fixtures', 'registry-snapshot.json');
const relationshipsPath = join(here, 'fixtures', 'bond-relationships.json');

/** The plugin as the loader would merge it, built from *source* — `loadPlugin`
 *  imports the package's `dist/`, which would test the last build. */
function mergedPlugin() {
	const runes = Object.fromEntries(
		Object.entries(storytelling.runes).map(([name, entry]) => [
			name,
			defineRune({ name, schema: entry.transform as never, aliases: entry.aliases }),
		]),
	);
	return mergePlugins(
		[
			{
				pkg: storytelling,
				npmName: '@refrakt-md/storytelling',
				runes,
				fixtures: {},
				fileRoots: {},
			},
		],
		new Set(Object.keys(coreRunes)),
	);
}

const STORY_TYPES = new Set(['character', 'realm', 'faction', 'lore', 'plot', 'bond']);

interface Capture {
	registry: EntityRegistryImpl;
	aggregated: Record<string, unknown>;
	snapshot: Record<string, unknown>;
}

async function capture(): Promise<Capture> {
	const spy = vi.spyOn(EntityRegistryImpl.prototype, 'register');
	const merged = mergedPlugin();
	const site = await loadContent(siteDir, {
		plugins: merged.plugins,
		additionalTags: merged.tags,
		reporter: () => {},
	});

	const registry = spy.mock.contexts[0] as EntityRegistryImpl;
	const registrations = spy.mock.calls
		.map(([entry]) => entry as EntityRegistration)
		.filter((e) => STORY_TYPES.has(e.type));

	const index = (site.aggregated.storytelling as { entityByName: Map<string, EntityRegistration> })
		.entityByName;
	const entityByName = [...index].map(([name, e]) => [name, e.type, e.id, e.sourceUrl]);

	const links: Record<string, string[]> = {};
	for (const page of site.pages) {
		const found: string[] = [];
		collectLinks(page.renderable, found);
		if (found.length > 0) links[page.route.url] = found;
	}

	const warnings = site.pipelineWarnings
		.filter((w) => w.pluginName === 'storytelling')
		.map((w) => `${w.phase} ${w.severity} ${w.url ?? ''}: ${w.message}`);

	return {
		registry,
		aggregated: site.aggregated,
		snapshot: {
			types: registry.getTypes().filter((t) => STORY_TYPES.has(t)),
			// JSON round-trip: what is compared is exactly what serialises, key
			// order included.
			registrations: JSON.parse(JSON.stringify(registrations)),
			entityByName,
			links,
			warnings,
		},
	};
}

/** Every `<a href>` wrapping a `<strong>` — the cross-links `postProcess` adds. */
function collectLinks(node: unknown, out: string[]): void {
	if (Array.isArray(node)) {
		for (const c of node) collectLinks(c, out);
		return;
	}
	if (!node || typeof node !== 'object') return;
	const n = node as { name?: string; attributes?: Record<string, unknown>; children?: unknown[] };
	const first = n.children?.[0] as { name?: string; children?: unknown[] } | undefined;
	if (n.name === 'a' && first?.name === 'strong') {
		out.push(`${String(first.children?.join(''))} -> ${String(n.attributes?.href)}`);
	}
	for (const c of n.children ?? []) collectLinks(c, out);
}

/** The committed file, re-serialised compactly: Biome owns its layout, and
 *  parsing keeps key order, so formatting cannot pass or fail the gate. */
function committed(path: string): string {
	return JSON.stringify(JSON.parse(readFileSync(path, 'utf-8')));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('storytelling registry snapshot (SPEC-144 D4)', () => {
	it('matches the registry captured before the migration', async () => {
		const { snapshot } = await capture();
		const serialised = `${JSON.stringify(snapshot, null, 2)}\n`;
		if (process.env.REFRAKT_WRITE_REGISTRY_SNAPSHOT === '1')
			writeFileSync(snapshotPath, serialised);
		expect(existsSync(snapshotPath), 'the committed snapshot is missing').toBe(true);
		// Compared as compact text, so key order inside every data bag counts.
		expect(JSON.stringify(snapshot)).toBe(committed(snapshotPath));
	});

	// SPEC-144: `bond` edges resolve as they did. Before the migration the bond
	// graph lived in the plugin's own aggregate output, keyed by the raw strings
	// a bond was written with; `bond-relationships.json` is that graph, captured
	// then. It now lives in the registry's relationship graph, keyed by entity
	// id. Every recorded edge whose endpoints name an entity (by id or alias)
	// must come back from `getRelated`, and nothing else may.
	it('resolves the recorded bond relationships through getRelated', async () => {
		const { registry, aggregated } = await capture();
		const index = (aggregated.storytelling as { entityByName: Map<string, EntityRegistration> })
			.entityByName;
		const recorded = JSON.parse(readFileSync(relationshipsPath, 'utf-8')) as [string, string][];

		const expected = recorded
			.filter(([from, to]) => index.has(from) && index.has(to))
			.map(([from, to]) => `${index.get(from)!.id} -> ${index.get(to)!.id}`)
			.sort();
		const actual = [...new Set([...index.values()].map((e) => e.id))]
			.flatMap((id) => registry.getRelated(id).map((edge) => `${edge.fromId} -> ${edge.toId}`))
			.sort();

		expect(actual).toEqual(expected);
		// The alias-written bond lands on the entity it names.
		expect(registry.getRelated('Veshra', { kind: 'enemy' }).map((e) => e.target.id)).toEqual([
			'King Edric',
		]);
		// The edge kind is the bond's `type`.
		expect(registry.getRelated('Veshra').map((e) => e.kind)).toEqual(['rival', 'enemy']);
	});
});
