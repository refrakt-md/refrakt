import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const layoutType = ['side-by-side', 'stacked'] as const;

export const compare = createContentModelSchema({
	attributes: {
		layout: { type: String, required: false, matches: layoutType.slice(), description: 'Display panels side-by-side or stacked' },
		labels: { type: String, required: false, description: 'Comma-separated custom labels for each panel' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const layout = attrs.layout ?? 'side-by-side';
		const labels = attrs.labels ?? '';

		const layoutMeta = new Tag('meta', { content: layout });

		// Collect all <pre> code blocks from children
		const panels: any[] = [];
		const customLabels = labels ? labels.split(',').map((l: string) => l.trim()) : [];

		let panelIndex = 0;
		for (const node of children.toArray()) {
			// Match <pre> directly or <div class="rf-codeblock"> wrapper around <pre>
			let preNode: typeof node | undefined;
			if (Tag.isTag(node) && node.name === 'pre') {
				preNode = node;
			} else if (Tag.isTag(node) && node.name === 'div' && node.attributes.class === 'rf-codeblock') {
				const inner = node.children.find((c: any) => Tag.isTag(c) && c.name === 'pre');
				if (inner) preNode = inner as typeof node;
			}

			if (preNode && Tag.isTag(preNode)) {
				const label = customLabels[panelIndex]
					|| preNode.attributes['data-language']
					|| `Panel ${panelIndex + 1}`;

				const labelTag = new Tag('span', { 'data-label': true }, [label]);
				panels.push(new Tag('div', { 'data-panel': true }, [labelTag, node]));
				panelIndex++;
			}
		}

		const panelsDiv = new Tag('div', { 'data-panels': true }, panels);

		return createComponentRenderable({ rune: 'compare',
			tag: 'div',
			properties: {
				layout: layoutMeta,
			},
			refs: {
				panels: panelsDiv,
			},
			children: [layoutMeta, panelsDiv],
		});
	},
});
