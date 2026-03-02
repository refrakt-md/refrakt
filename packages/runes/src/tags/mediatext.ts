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

		// Separate image paragraphs from body content.
		// Markdown wraps ![img](url) in <p> tags, so we check for paragraphs
		// containing only an image and extract the <img> from them.
		const mediaChildren: any[] = [];
		const bodyChildren: any[] = [];

		for (const node of children.toArray()) {
			if (Markdoc.Tag.isTag(node) && node.name === 'p' &&
				node.children.length === 1 &&
				Markdoc.Tag.isTag(node.children[0]) && node.children[0].name === 'img') {
				mediaChildren.push(node.children[0]);
			} else if (Markdoc.Tag.isTag(node) && node.name === 'img') {
				mediaChildren.push(node);
			} else {
				bodyChildren.push(node);
			}
		}

		const mediaTag = new Tag('div', {}, mediaChildren);
		const bodyTag = new Tag('div', {}, bodyChildren);

		const childNodes: any[] = [alignMeta, ratioMeta];
		if (wrapMeta) childNodes.push(wrapMeta);
		childNodes.push(mediaTag, bodyTag);

		return createComponentRenderable(schema.MediaText, {
			tag: 'div',
			properties: {
				align: alignMeta,
				ratio: ratioMeta,
				...(wrapMeta ? { wrap: wrapMeta } : {}),
			},
			refs: {
				media: mediaTag,
				body: bodyTag,
			},
			children: childNodes,
		});
	}
}

export const mediatext = createSchema(MediaTextModel);
