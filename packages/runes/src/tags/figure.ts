import { Tag } from '@markdoc/markdoc';
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const sizeValues = ['small', 'medium', 'large', 'full'] as const;
const alignValues = ['left', 'center', 'right'] as const;

class FigureModel extends Model {
	@attribute({ type: String, required: false, matches: sizeValues.slice() })
	size: string = '';

	@attribute({ type: String, required: false, matches: alignValues.slice() })
	align: string = '';

	@attribute({ type: String, required: false })
	caption: string = '';

	transform() {
		const children = this.transformChildren();

		const captionContent = this.caption || undefined;
		const captionTag = captionContent
			? new Tag('figcaption', {}, [captionContent])
			: children.tag('p').count() > 0
				? new Tag('figcaption', {}, children.tag('p').limit(1).toArray())
				: undefined;

		const sizeMeta = this.size ? new Tag('meta', { content: this.size }) : undefined;
		const alignMeta = this.align ? new Tag('meta', { content: this.align }) : undefined;

		const childNodes: any[] = [...children.tag('img').toArray()];
		if (captionTag) childNodes.push(captionTag);
		if (sizeMeta) childNodes.push(sizeMeta);
		if (alignMeta) childNodes.push(alignMeta);

		return createComponentRenderable(schema.Figure, {
			tag: 'figure',
			properties: {
				...(captionTag ? { caption: captionTag } : {}),
				...(sizeMeta ? { size: sizeMeta } : {}),
				...(alignMeta ? { align: alignMeta } : {}),
			},
			children: childNodes,
		});
	}
}

export const figure = createSchema(FigureModel);
