import { vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import {
	baseConfig,
	composedPluginRune,
	defineRune,
	mergePlugins,
	runes as coreRunes,
	serializeTree,
} from '@refrakt-md/runes';
import type { LoadedPlugin } from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { EntityRegistration, Plugin } from '@refrakt-md/types';
import { storytelling } from '../../../plugins/storytelling/src/index.js';
import { EntityRegistryImpl } from '../src/registry.js';
import { assembleMarkdocSchemas, loadContent } from '../src/site.js';

/**
 * Shared machinery for the composed storytelling runes (SPEC-147): the
 * definitions in `fixtures/composed-storytelling/runes/`, exercised through a
 * fixture plugin beside the shipping one (D1), and compared against the
 * plugin's registry snapshot and rendered output (D2).
 */

const here = dirname(fileURLToPath(import.meta.url));
export const composedDir = join(here, 'fixtures', 'composed-storytelling');
export const storyTests = join(
	here,
	'..',
	'..',
	'..',
	'plugins',
	'storytelling',
	'test',
	'fixtures',
);
export const siteDir = join(storyTests, 'registry-site');
export const snapshotPath = join(storyTests, 'registry-snapshot.json');

/** A composed rune's definition, as stored. */
export const definitionOf = (rune: string) =>
	readFileSync(join(composedDir, 'runes', `${rune}.md`), 'utf-8');

/** One of a composed rune's own fixtures, `<rune>.<scenario>.md`. */
export const fixtureOf = (rune: string, scenario: string) =>
	readFileSync(join(composedDir, 'fixtures', `${rune}.${scenario}.md`), 'utf-8');

/** PascalCase config key of a kebab-case rune name. */
const typeName = (rune: string) =>
	rune
		.split('-')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join('');

/**
 * The storytelling plugin with the named runes composed — a fixture, not a
 * shipping plugin. The name stays `storytelling`: the cross-linking
 * `postProcess` reads the index from that aggregated slot. Each composed rune's
 * theme entry goes with its transform: its config is generated (D2a), and
 * `validatePlugin` rejects a hand-written one.
 */
export function composedStorytelling(composed: Record<string, string>): Plugin {
	const themeRunes = { ...storytelling.theme!.runes };
	for (const rune of Object.keys(composed)) delete themeRunes[typeName(rune)];
	const runes = { ...storytelling.runes };
	for (const [rune, template] of Object.entries(composed)) runes[rune] = { template };
	return { ...storytelling, runes, theme: { ...storytelling.theme!, runes: themeRunes } };
}

/** A plugin as the loader would merge it, built from source. */
export function merge(pkg: Plugin) {
	const runes = Object.fromEntries(
		Object.entries(pkg.runes).map(([name, entry]) => {
			if (entry.template !== undefined) {
				const { rune } = composedPluginRune(name, entry);
				return [name, defineRune({ ...rune, name, schema: rune.schema })];
			}
			return [name, defineRune({ name, schema: entry.transform as never, aliases: entry.aliases })];
		}),
	);
	const loaded: LoadedPlugin = {
		pkg,
		npmName: '@refrakt-md/storytelling',
		runes,
		fixtures: {},
		fileRoots: {},
	};
	return mergePlugins([loaded], new Set(Object.keys(coreRunes)));
}

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
export type Json = any;

const STORY_TYPES = new Set(['character', 'realm', 'faction', 'lore', 'plot', 'bond']);

/** Build the storytelling registry site with `pkg`, captured in the shape of the
 *  plugin's own snapshot test (`plugins/storytelling/test/registry-snapshot.test.ts`).
 *  `dir` builds another site the same way. */
export async function capture(pkg: Plugin, dir = siteDir) {
	const spy = vi.spyOn(EntityRegistryImpl.prototype, 'register');
	const merged = merge(pkg);
	const site = await loadContent(dir, {
		plugins: merged.plugins,
		additionalTags: merged.tags,
		reporter: () => {},
	});
	const registry = spy.mock.contexts[0] as EntityRegistryImpl;
	const registrations = spy.mock.calls
		.map(([entry]) => entry as EntityRegistration)
		.filter((e) => STORY_TYPES.has(e.type));
	spy.mockRestore();
	const index = (site.aggregated.storytelling as { entityByName: Map<string, EntityRegistration> })
		.entityByName;
	const links: Record<string, string[]> = {};
	for (const page of site.pages) {
		const found: string[] = [];
		collectLinks(page.renderable, found);
		if (found.length > 0) links[page.route.url] = found;
	}
	return {
		registry,
		index,
		site,
		// The same JSON round-trip as the plugin's snapshot test.
		snapshot: JSON.parse(
			JSON.stringify({
				types: registry.getTypes().filter((t) => STORY_TYPES.has(t)),
				registrations,
				entityByName: [...index].map(([name, e]) => [name, e.type, e.id, e.sourceUrl]),
				links,
				warnings: site.pipelineWarnings
					.filter((w) => w.pluginName === 'storytelling')
					.map((w) => `${w.phase} ${w.severity} ${w.url ?? ''}: ${w.message}`),
			}),
		),
	};
}

function collectLinks(node: Json, out: string[]): void {
	if (Array.isArray(node)) {
		for (const c of node) collectLinks(c, out);
		return;
	}
	if (!node || typeof node !== 'object') return;
	const first = node.children?.[0];
	if (node.name === 'a' && first?.name === 'strong') {
		out.push(`${String(first.children?.join(''))} -> ${String(node.attributes?.href)}`);
	}
	for (const c of node.children ?? []) collectLinks(c, out);
}

/** The per-page assembly with `pkg`: the tag map and the identity transform. */
export function pageContext(pkg: Plugin) {
	const merged = merge(pkg);
	const { config: theme } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		pluginIcons: {},
		pluginBackgrounds: {},
		extensions: {},
		provenance: merged.provenance,
		presetMap: {},
	} as never);
	const schemas = assembleMarkdocSchemas(merged.tags);
	return { schemas, tags: schemas.tags, identity: createTransform(theme) };
}

/** One page through the whole per-page assembly: schemas, theme, engine. */
export function renderPage(pkg: Plugin, source: string): Json {
	const { schemas, identity } = pageContext(pkg);
	const rendered = Markdoc.transform(Markdoc.parse(source), {
		...schemas,
		variables: { generatedIds: new Set<string>(), path: '/p', headings: [] },
	} as never);
	return identity(serializeTree(rendered) as never);
}

/** HTML as a renderer emits it: an attribute left `undefined` is not written. */
export function html(node: Json): string {
	const clean = (n: Json): Json => {
		if (Array.isArray(n)) return n.map(clean);
		if (!n || typeof n !== 'object') return n;
		const attributes = Object.fromEntries(
			Object.entries(n.attributes ?? {}).filter(([, v]) => v !== undefined),
		);
		return { ...n, attributes, children: clean(n.children ?? []) };
	};
	return Markdoc.renderers.html(clean(node));
}

export function find(node: Json, pred: (n: Json) => boolean): Json | undefined {
	if (Array.isArray(node)) {
		for (const c of node) {
			const hit = find(c, pred);
			if (hit) return hit;
		}
		return undefined;
	}
	if (!node || typeof node !== 'object') return undefined;
	if (pred(node)) return node;
	return find(node.children ?? [], pred);
}

export function all(node: Json, pred: (n: Json) => boolean, out: Json[] = []): Json[] {
	if (Array.isArray(node)) {
		for (const c of node) all(c, pred, out);
		return out;
	}
	if (!node || typeof node !== 'object') return out;
	if (pred(node)) out.push(node);
	all(node.children ?? [], pred, out);
	return out;
}

export function text(node: Json): string {
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(text).join('');
	return text(node?.children ?? []);
}

/** Drop one attribute everywhere in a tree. */
export function without(node: Json, attr: string): Json {
	if (Array.isArray(node)) return node.map((c) => without(c, attr));
	if (!node || typeof node !== 'object') return node;
	const { [attr]: _drop, ...attributes } = node.attributes ?? {};
	return { ...node, attributes, children: without(node.children ?? [], attr) };
}
