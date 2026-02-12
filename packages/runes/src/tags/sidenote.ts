import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const styleType = ['sidenote', 'footnote', 'tooltip'] as const;

class SidenoteModel extends Model {
	@attribute({ type: String, required: false, matches: styleType.slice() })
	style: typeof styleType[number] = 'sidenote';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const styleMeta = new Tag('meta', { content: this.style });
		const bodyDiv = children.wrap('div');

		return createComponentRenderable(schema.Sidenote, {
			tag: 'aside',
			properties: {
				style: styleMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [styleMeta, bodyDiv.next()],
		});
	}
}

export const sidenote = createSchema(SidenoteModel);
