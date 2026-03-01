import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class LoreModel extends Model {
	@attribute({ type: String, required: true })
	title: string = '';

	@attribute({ type: String, required: false })
	category: string = '';

	@attribute({ type: Boolean, required: false })
	spoiler: boolean = false;

	@attribute({ type: String, required: false })
	tags: string = '';

	transform() {
		const titleTag = new Tag('span', {}, [this.title]);
		const categoryMeta = new Tag('meta', { content: this.category });
		const spoilerMeta = new Tag('meta', { content: String(this.spoiler) });
		const tagsMeta = new Tag('meta', { content: this.tags });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.Lore, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				title: titleTag,
				category: categoryMeta,
				spoiler: spoilerMeta,
				tags: tagsMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [titleTag, categoryMeta, spoilerMeta, tagsMeta, body.next()],
		});
	}
}

export const lore = createSchema(LoreModel);
