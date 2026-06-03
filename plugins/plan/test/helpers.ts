import 'reflect-metadata';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { tags as coreTags, nodes, extractHeadings, runeTagMap, defineRune } from '@refrakt-md/runes';
import { plan } from '../src/index.js';

// Create Rune instances from the package
const pluginRunes: Record<string, any> = {};
for (const [name, entry] of Object.entries(plan.runes)) {
	pluginRunes[name] = defineRune({ name, schema: entry.transform as any, aliases: entry.aliases });
}
const tags = { ...coreTags, ...runeTagMap(pluginRunes), ...Markdoc.tags };

export function parse(content: string, variables: Record<string, any> = {}) {
	const ast = Markdoc.parse(content);
	const headings = extractHeadings(ast);
	const config = { tags, nodes, variables: { generatedIds: new Set<string>(), path: '/test.md', headings, __source: content, ...variables } };
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
	try { return JSON.parse(tag?.attributes?.['data-rune-fields'] ?? '{}'); } catch { return {}; }
}
