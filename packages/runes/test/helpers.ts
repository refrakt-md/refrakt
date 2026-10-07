import 'reflect-metadata';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { tags, nodes, extractHeadings, preprocessTree } from '../src/index.js';
import type { Node as MarkdocNode } from '@markdoc/markdoc';
import type { PreprocessContext, PreprocessPage } from '@refrakt-md/types';

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

/**
 * Run the preprocess phase over a page AST — the one tree-order walk the core
 * pipeline hook runs (SPEC-141), dispatching over every core rune's hook.
 */
export function preprocess(
	ast: MarkdocNode,
	page: PreprocessPage,
	ctx: PreprocessContext,
): MarkdocNode | void {
	return preprocessTree(ast, page, ctx, tags);
}
