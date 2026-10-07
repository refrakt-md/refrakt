import Markdoc from '@markdoc/markdoc';
import { textContent } from '@refrakt-md/runes';
import type { RegistersIndex } from '@refrakt-md/runes';
import type { PluginPipelineHooks } from '@refrakt-md/types';

const { Tag } = Markdoc;

/** Tags where cross-links should not resolve */
const EXCLUDED_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code']);

/**
 * What `postProcess` reads from this plugin's `aggregated` slot.
 *
 * SPEC-144 / WORK-612 — `character`, `realm`, `faction`, `lore`, `plot` and
 * `bond` declare what they register (`registers` in each tag module), and the
 * core participant performs it: Phase 2 registers them, Phase 3 builds this name
 * index (ids, then `character` aliases, first alias wins) into the slot the
 * deleted `aggregate` hook used to fill, and contributes `bond` edges to the
 * relationship graph, where `getRelated` answers for them.
 */
export type StorytellingAggregatedData = RegistersIndex;

/**
 * Cross-linking stays a plugin hook: it rewrites `**Name**` in prose this
 * plugin's runes did not emit, which SPEC-144 D2 keeps imperative.
 */
export const storytellingPipelineHooks: PluginPipelineHooks = {
	postProcess(page, aggregated) {
		const maybeStoryData = aggregated['storytelling'] as StorytellingAggregatedData | undefined;
		if (!maybeStoryData || !maybeStoryData.entityByName || maybeStoryData.entityByName.size === 0)
			return page;
		const storyData = maybeStoryData;

		const linkedNames = new Set<string>();
		let modified = false;

		function mapNode(node: unknown, insideRuneDepth: number): unknown {
			if (typeof node === 'string') return node;
			if (Array.isArray(node)) {
				const mapped = node.map((n) => mapNode(n, insideRuneDepth));
				return mapped.some((n, i) => n !== node[i]) ? mapped : node;
			}
			if (!Markdoc.Tag.isTag(node)) return node;

			// Skip headings and code blocks entirely
			if (EXCLUDED_TAGS.has(node.name)) return node;

			// Skip nested runes (allow the page's top-level rune through)
			if (node.attributes['data-rune'] != null && insideRuneDepth > 0) return node;

			const newDepth = node.attributes['data-rune'] != null ? insideRuneDepth + 1 : insideRuneDepth;

			// Check for strong tags to cross-link
			if (node.name === 'strong') {
				const text = textContent(node);
				if (text && !linkedNames.has(text)) {
					const entity = storyData.entityByName.get(text);
					if (entity && entity.sourceUrl !== page.url) {
						linkedNames.add(text);
						modified = true;
						return new Tag('a', { href: entity.sourceUrl }, [node]);
					}
				}
			}

			// Recurse children
			const newChildren = node.children.map((c: unknown) => mapNode(c, newDepth));
			const changed = newChildren.some((c: unknown, i: number) => c !== node.children[i]);
			if (changed) {
				return new Tag(node.name, node.attributes, newChildren as any[]);
			}
			return node;
		}

		const newRenderable = mapNode(page.renderable, 0);
		if (!modified) return page;
		return { ...page, renderable: newRenderable as typeof page.renderable };
	},
};
