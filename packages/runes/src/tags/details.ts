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

		const summaryTag = new Tag('summary', {}, [summaryText || 'Details']);
		const body = children.wrap('div');

		const tag = createComponentRenderable(schema.Details, {
			tag: 'details',
			properties: {
				summary: summaryTag,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [summaryTag, body.next()],
		});

		if (this.open) (tag.attributes as Record<string, unknown>).open = true;

		return tag;
	}
}

export const details = createSchema(DetailsModel);
