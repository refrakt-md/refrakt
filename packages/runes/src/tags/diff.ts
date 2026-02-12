import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const modeType = ['unified', 'split', 'inline'] as const;

class DiffModel extends Model {
	@attribute({ type: String, required: false, matches: modeType.slice() })
	mode: typeof modeType[number] = 'unified';

	@attribute({ type: String, required: false })
	language: string = '';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const modeMeta = new Tag('meta', { content: this.mode });
		const languageMeta = new Tag('meta', { content: this.language });

		// Collect code blocks (pre tags) — first is "before", second is "after"
		const codeBlocks = children.tag('pre');
		const beforeBlock = codeBlocks.count() > 0 ? codeBlocks.nodes[0] : new Tag('pre', {}, []);
		const afterBlock = codeBlocks.count() > 1 ? codeBlocks.nodes[1] : new Tag('pre', {}, []);

		return createComponentRenderable(schema.Diff, {
			tag: 'div',
			properties: {
				mode: modeMeta,
				language: languageMeta,
			},
			refs: {
				before: beforeBlock,
				after: afterBlock,
			},
			children: [modeMeta, languageMeta, beforeBlock, afterBlock],
		});
	}
}

export const diff = createSchema(DiffModel);
