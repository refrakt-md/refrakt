import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

class BondModel extends Model {
	@attribute({ type: String, required: true })
	from: string = '';

	@attribute({ type: String, required: true })
	to: string = '';

	@attribute({ type: String, required: false })
	type: string = '';

	@attribute({ type: String, required: false })
	status: string = 'active';

	@attribute({ type: Boolean, required: false })
	bidirectional: boolean = true;

	transform() {
		const fromTag = new Tag('span', {}, [this.from]);
		const toTag = new Tag('span', {}, [this.to]);
		const bondTypeMeta = new Tag('meta', { content: this.type });
		const statusMeta = new Tag('meta', { content: this.status });
		const bidirectionalMeta = new Tag('meta', { content: String(this.bidirectional) });
		const body = this.transformChildren().wrap('div');

		return createComponentRenderable(schema.Bond, {
			tag: 'div',
			properties: {
				from: fromTag,
				to: toTag,
				bondType: bondTypeMeta,
				status: statusMeta,
				bidirectional: bidirectionalMeta,
			},
			refs: {
				body: body.tag('div'),
			},
			children: [fromTag, toTag, bondTypeMeta, statusMeta, bidirectionalMeta, body.next()],
		});
	}
}

export const bond = createSchema(BondModel);
