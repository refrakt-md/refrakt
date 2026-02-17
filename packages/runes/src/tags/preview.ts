import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class PreviewModel extends Model {
	@attribute({ type: String, required: false })
	title: string = '';

	@attribute({ type: String, required: false, matches: ['auto', 'light', 'dark'] })
	theme: string = 'auto';

	@attribute({ type: String, required: false, matches: ['narrow', 'medium', 'wide', 'full'] })
	width: string = 'wide';

	transform() {
		const children = this.transformChildren();

		const titleMeta = this.title ? new Tag('meta', { content: this.title }) : undefined;
		const themeMeta = new Tag('meta', { content: this.theme });
		const widthMeta = new Tag('meta', { content: this.width });

		const childNodes = [
			...(titleMeta ? [titleMeta] : []),
			themeMeta,
			widthMeta,
			...children.toArray(),
		];

		return createComponentRenderable(schema.Preview, {
			tag: 'div',
			properties: {
				...(titleMeta ? { title: titleMeta } : {}),
				theme: themeMeta,
				width: widthMeta,
			},
			children: childNodes,
		});
	}
}

export const preview = createSchema(PreviewModel);
