import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const variantType = ['sidenote', 'footnote', 'tooltip'] as const;

class SidenoteModel extends Model {
	@attribute({ type: String, required: false, matches: variantType.slice() })
	variant: typeof variantType[number] = 'sidenote';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const variantMeta = new Tag('meta', { content: this.variant });
		const bodyDiv = children.wrap('div');

		return createComponentRenderable(schema.Sidenote, {
			tag: 'aside',
			properties: {
				variant: variantMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [variantMeta, bodyDiv.next()],
		});
	}
}

export const sidenote = createSchema(SidenoteModel);
