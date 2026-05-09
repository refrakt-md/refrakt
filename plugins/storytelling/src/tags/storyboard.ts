import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';

const variantType = ['comic', 'clean', 'polaroid'] as const;

export const storyboardPanel = createContentModelSchema({
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

		const image = children.tag('img').limit(1);
		const caption = children.tag('p').limit(1);
		const body = children.wrap('div');

		return createComponentRenderable({ rune: 'storyboard-panel',
			tag: 'div',
			refs: {
				image,
				caption,
				body: body.tag('div'),
			},
			children: [body.next()],
		});
	},
});

// Group nodes into panels: each image starts a new panel
function convertStoryboardChildren(nodes: unknown[]): unknown[] {
	const converted: Node[] = [];
	let currentPanelChildren: Node[] = [];

	const flushPanel = () => {
		if (currentPanelChildren.length > 0) {
			converted.push(new Ast.Node('tag', {}, currentPanelChildren, 'storyboard-panel'));
			currentPanelChildren = [];
		}
	};

	for (const node of nodes as Node[]) {
		if (node.type === 'image' || (node.type === 'paragraph' && Array.from(node.walk()).some(n => n.type === 'image'))) {
			// Image starts a new panel
			flushPanel();
			currentPanelChildren.push(node);
		} else if (currentPanelChildren.length > 0) {
			// Non-image after an image: add to current panel as caption
			currentPanelChildren.push(node);
		} else {
			// Content before first image: start a panel anyway
			currentPanelChildren.push(node);
		}
	}
	flushPanel();

	return converted;
}

export const storyboard = createContentModelSchema({
	attributes: {
		columns: { type: Number, required: false, description: 'Number of panel columns in the grid layout.' },
		variant: { type: String, required: false, matches: variantType.slice(), description: 'Visual style: comic (speech bubbles), clean (minimal), or polaroid (photo frame).' },
	},
	contentModel: {
		type: 'custom',
		processChildren: convertStoryboardChildren,
		description: 'Image-triggered panel accumulator. Each image starts a new panel; '
			+ 'subsequent non-image content becomes the panel caption.',
	},
	transform(resolved, attrs, config) {
		const allChildren = asNodes(resolved.children);
		const body = new RenderableNodeCursor(
			Markdoc.transform(allChildren, config) as RenderableTreeNode[],
		);

		const variantMeta = new Tag('meta', { content: attrs.variant ?? 'clean' });
		const columnsMeta = new Tag('meta', { content: String(attrs.columns ?? 3) });

		const panels = body.tag('div').typeof('StoryboardPanel');
		const panelsContainer = panels.wrap('div');

		return createComponentRenderable({ rune: 'storyboard',
			tag: 'div',
			properties: {
				panel: panels,
				variant: variantMeta,
				columns: columnsMeta,
			},
			refs: { panels: panelsContainer },
			children: [variantMeta, columnsMeta, panelsContainer.next()],
		});
	},
});
