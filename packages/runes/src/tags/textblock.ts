import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNodes } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model, createComponentRenderable, createSchema } from '../lib/index.js';

const alignValues = ['left', 'center', 'right', 'justify'] as const;

class TextBlockModel extends Model {
	@attribute({ type: Boolean, required: false })
	dropcap: boolean = false;

	@attribute({ type: Number, required: false })
	columns: number = 1;

	@attribute({ type: Boolean, required: false })
	lead: boolean = false;

	@attribute({ type: String, required: false, matches: alignValues.slice() })
	align: typeof alignValues[number] = 'left';

	transform(): RenderableTreeNodes {
		const children = this.transformChildren();

		const dropcapMeta = this.dropcap ? new Tag('meta', { content: 'true' }) : undefined;
		const columnsMeta = this.columns > 1 ? new Tag('meta', { content: String(this.columns) }) : undefined;
		const leadMeta = this.lead ? new Tag('meta', { content: 'true' }) : undefined;
		const alignMeta = this.align !== 'left' ? new Tag('meta', { content: this.align }) : undefined;

		const body = children.wrap('div');
		const childNodes: any[] = [];
		if (dropcapMeta) childNodes.push(dropcapMeta);
		if (columnsMeta) childNodes.push(columnsMeta);
		if (leadMeta) childNodes.push(leadMeta);
		if (alignMeta) childNodes.push(alignMeta);
		childNodes.push(body.next());

		return createComponentRenderable(schema.TextBlock, {
			tag: 'div',
			properties: {
				...(dropcapMeta ? { dropcap: dropcapMeta } : {}),
				...(columnsMeta ? { columns: columnsMeta } : {}),
				...(leadMeta ? { lead: leadMeta } : {}),
				...(alignMeta ? { align: alignMeta } : {}),
			},
			refs: {
				body: body.tag('div'),
			},
			children: childNodes,
		});
	}
}

export const textblock = createSchema(TextBlockModel);
