import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const alignValues = ['left', 'center', 'right'] as const;
const variantValues = ['default', 'accent', 'editorial'] as const;

class PullQuoteModel extends Model {
	@attribute({ type: String, required: false, matches: alignValues.slice() })
	align: typeof alignValues[number] = 'center';

	@attribute({ type: String, required: false, matches: variantValues.slice() })
	variant: typeof variantValues[number] = 'default';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const alignMeta = new Tag('meta', { content: this.align });
		const variantMeta = new Tag('meta', { content: this.variant });

		// Extract blockquote or use all children as the quote text
		const blockquote = children.tag('blockquote');
		const quoteChildren = blockquote.count() > 0
			? blockquote.limit(1).toArray()
			: children.tag('p').toArray();

		const childNodes: any[] = [...quoteChildren, alignMeta, variantMeta];

		return createComponentRenderable(schema.PullQuote, {
			tag: 'blockquote',
			properties: {
				align: alignMeta,
				variant: variantMeta,
			},
			children: childNodes,
		});
	}
}

export const pullquote = createSchema(PullQuoteModel);
