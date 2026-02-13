import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const styleType = ['comic', 'clean', 'polaroid'] as const;

class StoryboardPanelModel extends Model {
	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const image = children.tag('img').limit(1);
		const caption = children.tag('p').limit(1);
		const body = children.wrap('div');

		return createComponentRenderable(schema.StoryboardPanel, {
			tag: 'div',
			properties: {
				image,
				caption,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [body.next()],
		});
	}
}

class StoryboardModel extends Model {
	@attribute({ type: Number, required: false })
	columns: number = 3;

	@attribute({ type: String, required: false, matches: styleType.slice() })
	style: typeof styleType[number] = 'clean';

	@group({ include: ['tag'] })
	body: NodeStream;

	processChildren(nodes: Node[]) {
		// Group nodes into panels: each image starts a new panel
		const converted: Node[] = [];
		let currentPanelChildren: Node[] = [];

		const flushPanel = () => {
			if (currentPanelChildren.length > 0) {
				converted.push(new Ast.Node('tag', {}, currentPanelChildren, 'storyboard-panel'));
				currentPanelChildren = [];
			}
		};

		for (const node of nodes) {
			if (node.type === 'image' || (node.type === 'paragraph' && node.children.some(c => c.type === 'image'))) {
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

		return super.processChildren(converted);
	}

	transform(): RenderableTreeNodes {
		const body = this.body.transform();
		const styleMeta = new Tag('meta', { content: this.style });
		const columnsMeta = new Tag('meta', { content: String(this.columns) });

		const panels = body.tag('div').typeof('StoryboardPanel');
		const panelsContainer = panels.wrap('div');

		return createComponentRenderable(schema.Storyboard, {
			tag: 'div',
			properties: {
				panel: panels,
				style: styleMeta,
				columns: columnsMeta,
			},
			refs: { panels: panelsContainer },
			children: [styleMeta, columnsMeta, panelsContainer.next()],
		});
	}
}

export const storyboardPanel = createSchema(StoryboardPanelModel);
export const storyboard = createSchema(StoryboardModel);
