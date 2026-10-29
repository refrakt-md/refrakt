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
	parse,
} from '@refrakt-md/runes';
import type { LoadedPlugin } from '@refrakt-md/runes';
import { assembleThemeConfig, createTransform } from '@refrakt-md/transform';
import type { Plugin } from '@refrakt-md/types';
import { marketing } from '../../../plugins/marketing/src/index.js';
import { assembleMarkdocSchemas } from '../src/site.js';

/**
 * Shared machinery for the composed marketing runes (SPEC-160 D7): the
 * definitions in `packages/runes/test/fixtures/composed/`, exercised through a
 * fixture copy of the marketing plugin beside the shipping one (SPEC-147 D1),
 * and compared with it rune for rune (D2).
 */

const here = dirname(fileURLToPath(import.meta.url));
const composedDir = join(here, '..', '..', 'runes', 'test', 'fixtures', 'composed');

/** A composed rune's definition, as stored. */
export const definitionOf = (rune: string) =>
	readFileSync(join(composedDir, `${rune}.md`), 'utf-8');

/** The marketing plugin with the named runes composed — a fixture, never the
 *  shipping plugin. Each composed rune's hand-written theme entry goes with its
 *  transform: its config is generated (SPEC-145 D2a). */
export function composedMarketing(composed: Record<string, string>, drop: string[]): Plugin {
	const themeRunes = { ...marketing.theme!.runes };
	for (const key of drop) delete themeRunes[key];
	const runes = { ...marketing.runes };
	for (const [rune, template] of Object.entries(composed)) {
		// The composition declares its own aliases, if any (`review`); the
		// plugin's `call-to-action` belongs to the plugin's own `cta`.
		const { aliases: _a, transform: _t, ...rest } = runes[rune];
		runes[rune] = { ...rest, template };
	}
	return { ...marketing, runes, theme: { ...marketing.theme!, runes: themeRunes } };
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
		npmName: '@refrakt-md/marketing',
		runes,
		fixtures: {},
		fileRoots: {},
	};
	return mergePlugins([loaded], new Set(Object.keys(coreRunes)));
}

// biome-ignore lint/suspicious/noExplicitAny: rendered trees are untyped JSON
export type Json = any;

/** The per-page assembly with `pkg`: the tag map and the identity transform. */
export function pageContext(pkg: Plugin) {
	const merged = merge(pkg);
	const { config: theme } = assembleThemeConfig({
		coreConfig: baseConfig,
		pluginRunes: merged.themeRunes,
		provenance: merged.provenance,
	});
	const schemas = assembleMarkdocSchemas(merged.tags);
	return { schemas, tags: schemas.tags, identity: createTransform(theme) };
}

/** One page through the per-page assembly with `pkg`: schemas, theme, engine. */
export function renderPage(pkg: Plugin, source: string): Json {
	const { schemas, identity } = pageContext(pkg);
	const rendered = Markdoc.transform(parse(source), {
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

export const byRune = (tree: Json, rune: string) =>
	all(tree, (n) => n.attributes?.['data-rune'] === rune);
export const byName = (tree: Json, name: string) =>
	all(tree, (n) => n.attributes?.['data-name'] === name);
