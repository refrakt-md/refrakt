import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { NodeStream } from '../lib/node.js';
import { attribute, group, Model, createComponentRenderable, createSchema } from '../lib/index.js';
import { pageSectionProperties } from './common.js';

class EventModel extends Model {
	@attribute({ type: String, required: false })
	date: string = '';

	@attribute({ type: String, required: false })
	endDate: string = '';

	@attribute({ type: String, required: false })
	location: string = '';

	@attribute({ type: String, required: false })
	url: string = '';

	@group({ include: ['heading', 'paragraph', 'image'] })
	header: NodeStream;

	@group({ include: ['list', 'blockquote', 'tag'] })
	body: NodeStream;

	transform(): RenderableTreeNodes {
		const header = this.header.transform();
		const body = this.body.transform();

		const dateMeta = new Tag('meta', { content: this.date });
		const endDateMeta = new Tag('meta', { content: this.endDate });
		const locationMeta = new Tag('meta', { content: this.location });
		const urlMeta = new Tag('meta', { content: this.url });

		const bodyDiv = body.wrap('div');

		return createComponentRenderable(schema.Event, {
			tag: 'article',
			property: 'contentSection',
			properties: {
				...pageSectionProperties(header),
				date: dateMeta,
				endDate: endDateMeta,
				location: locationMeta,
				url: urlMeta,
			},
			refs: {
				body: bodyDiv,
			},
			children: [
				dateMeta,
				endDateMeta,
				locationMeta,
				urlMeta,
				header.wrap('header').next(),
				bodyDiv.next(),
			],
		});
	}
}

export const event = createSchema(EventModel);
