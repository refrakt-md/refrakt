import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class DetailsModel extends Model {
	@attribute({ type: String, required: false })
	summary: string | undefined = undefined;

	@attribute({ type: Boolean, required: false })
	open: boolean = false;

	transform() {
		const children = this.transformChildren();

		let summaryText = this.summary;

		if (!summaryText) {
			// Extract from first heading or strong text
			const heading = children.headings();
			if (heading.count() > 0) {
				summaryText = 'Details';
			}
		}

		const summaryTag = new Tag('span', {}, [summaryText || 'Details']);
		const openTag = new Tag('meta', { content: this.open });
		const body = children.wrap('div');

		return createComponentRenderable(schema.Details, {
			tag: 'section',
			properties: {
				summary: summaryTag,
				open: openTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [summaryTag, openTag, body.next()],
		});
	}
}

export const details = createSchema(DetailsModel);
