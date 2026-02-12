import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const layoutType = ['side-by-side', 'stacked'] as const;

class CompareModel extends Model {
	@attribute({ type: String, required: false, matches: layoutType.slice() })
	layout: typeof layoutType[number] = 'side-by-side';

	@attribute({ type: String, required: false })
	labels: string = '';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();
		const layoutMeta = new Tag('meta', { content: this.layout });

		// Collect all <pre> code blocks from children
		const panels: any[] = [];
		const customLabels = this.labels ? this.labels.split(',').map(l => l.trim()) : [];

		let panelIndex = 0;
		for (const node of children.toArray()) {
			if (Tag.isTag(node) && node.name === 'pre') {
				// Get label from custom labels or from code block's data-language attribute
				const label = customLabels[panelIndex]
					|| node.attributes['data-language']
					|| `Panel ${panelIndex + 1}`;

				const labelTag = new Tag('span', { 'data-label': true }, [label]);
				panels.push(new Tag('div', { 'data-panel': true }, [labelTag, node]));
				panelIndex++;
			}
		}

		const panelsDiv = new Tag('div', { 'data-panels': true }, panels);

		return createComponentRenderable(schema.Compare, {
			tag: 'div',
			properties: {
				layout: layoutMeta,
			},
			refs: {
				panels: panelsDiv,
			},
			children: [layoutMeta, panelsDiv],
		});
	}
}

export const compare = createSchema(CompareModel);
