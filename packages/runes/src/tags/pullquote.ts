import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const alignValues = ['left', 'center', 'right'] as const;
const styleValues = ['default', 'accent', 'editorial'] as const;

class PullQuoteModel extends Model {
	@attribute({ type: String, required: false, matches: alignValues.slice() })
	align: typeof alignValues[number] = 'center';

	@attribute({ type: String, required: false, matches: styleValues.slice() })
	style: typeof styleValues[number] = 'default';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const alignMeta = new Tag('meta', { content: this.align });
		const styleMeta = new Tag('meta', { content: this.style });

		// Extract blockquote or use all children as the quote text
		const blockquote = children.tag('blockquote');
		const quoteChildren = blockquote.count() > 0
			? blockquote.limit(1).toArray()
			: children.tag('p').toArray();

		const childNodes: any[] = [...quoteChildren, alignMeta, styleMeta];

		return createComponentRenderable(schema.PullQuote, {
			tag: 'blockquote',
			properties: {
				align: alignMeta,
				style: styleMeta,
			},
			children: childNodes,
		});
	}
}

export const pullquote = createSchema(PullQuoteModel);
