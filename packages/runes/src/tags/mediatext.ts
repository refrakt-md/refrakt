import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const alignValues = ['left', 'right'] as const;
const ratioValues = ['1:2', '1:1', '2:1'] as const;

class MediaTextModel extends Model {
	@attribute({ type: String, required: false, matches: alignValues.slice() })
	align: typeof alignValues[number] = 'left';

	@attribute({ type: String, required: false, matches: ratioValues.slice() })
	ratio: typeof ratioValues[number] = '1:1';

	@attribute({ type: Boolean, required: false })
	wrap: boolean = false;

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const alignMeta = new Tag('meta', { content: this.align });
		const ratioMeta = new Tag('meta', { content: this.ratio });
		const wrapMeta = this.wrap ? new Tag('meta', { content: 'true' }) : undefined;

		// First image(s) become the media portion
		const images = children.tag('img');
		// Also catch images wrapped in paragraphs
		const imgParagraphs = children.tag('p');
		const mediaChildren: any[] = [];

		if (images.count() > 0) {
			mediaChildren.push(...images.toArray());
		}

		const mediaTag = new Tag('div', {}, mediaChildren);
		const bodyTag = children.wrap('div');

		const childNodes: any[] = [alignMeta, ratioMeta];
		if (wrapMeta) childNodes.push(wrapMeta);
		childNodes.push(mediaTag, bodyTag.next());

		return createComponentRenderable(schema.MediaText, {
			tag: 'div',
			properties: {
				align: alignMeta,
				ratio: ratioMeta,
				...(wrapMeta ? { wrap: wrapMeta } : {}),
			},
			refs: {
				media: mediaTag,
				body: bodyTag.tag('div'),
			},
			children: childNodes,
		});
	}
}

export const mediatext = createSchema(MediaTextModel);
