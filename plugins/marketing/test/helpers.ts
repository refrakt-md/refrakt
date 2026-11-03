import 'reflect-metadata';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	tags as coreTags,
	nodes as coreNodes,
	composedPluginRune,
	declareSlotMarkers,
	declareSlotMarkersOnNodes,
	extractHeadings,
	runeTagMap,
	defineRune,
} from '@refrakt-md/runes';
import { marketing } from '../src/index.js';

// Create Rune instances from the package: its `runes` entries, and the
// composed runes in its `runeDir` (SPEC-153 D2), as `loadPlugin` reads them.
const pluginRunes: Record<string, any> = {};
for (const [name, entry] of Object.entries(marketing.runes)) {
	pluginRunes[name] = defineRune({ name, schema: entry.transform as any, aliases: entry.aliases });
}
const runeDir = join(import.meta.dirname, '..', marketing.runeDir!);
for (const file of readdirSync(runeDir).filter((f) => f.endsWith('.md'))) {
	const name = file.slice(0, -'.md'.length);
	const { rune } = composedPluginRune(name, {
		template: readFileSync(join(runeDir, file), 'utf-8'),
	});
	pluginRunes[name] = defineRune({ ...rune, name, schema: rune.schema });
}
// The slot markers a composition sets are declared at config assembly
// (SPEC-145 D10a), so they survive the transform.
const tags = declareSlotMarkers({
	...coreTags,
	...runeTagMap(pluginRunes),
	...Markdoc.tags,
} as any);
const nodes = declareSlotMarkersOnNodes(coreNodes as any);

export function parse(content: string, variables: Record<string, any> = {}) {
	const ast = Markdoc.parse(content);
	const headings = extractHeadings(ast);
	const config = {
		tags,
		nodes,
		variables: {
			generatedIds: new Set<string>(),
			path: '/test.md',
			headings,
			__source: content,
			...variables,
		},
	};
	return Markdoc.transform(ast, config);
}

export function findTag(node: any, predicate: (tag: Tag) => boolean): Tag | undefined {
	if (Tag.isTag(node)) {
		if (predicate(node)) return node;
		for (const child of node.children) {
			const found = findTag(child, predicate);
			if (found) return found;
		}
	}
	return undefined;
}

export function findAllTags(node: any, predicate: (tag: Tag) => boolean): Tag[] {
	const results: Tag[] = [];
	if (Tag.isTag(node)) {
		if (predicate(node)) results.push(node);
		for (const child of node.children) {
			results.push(...findAllTags(child, predicate));
		}
	}
	return results;
}

export function fields(tag: any): Record<string, any> {
	try {
		return JSON.parse(tag?.attributes?.['data-rune-fields'] ?? '{}');
	} catch {
		return {};
	}
}
