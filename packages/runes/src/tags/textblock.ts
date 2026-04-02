import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const alignValues = ['left', 'center', 'right', 'justify'] as const;

export const textblock = createContentModelSchema({
	attributes: {
		dropcap: { type: Boolean, required: false, description: 'Style the first letter as a large drop cap' },
		columns: { type: Number, required: false, description: 'Number of text columns' },
		lead: { type: Boolean, required: false, description: 'Style the first paragraph as a lead' },
		align: { type: String, required: false, matches: alignValues.slice(), description: 'Text alignment' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'body', match: 'any', optional: true, greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const children = new RenderableNodeCursor(
			Markdoc.transform(asNodes(resolved.body), config) as RenderableTreeNode[],
		);

		const dropcap = attrs.dropcap ?? false;
		const columns = attrs.columns ?? 1;
		const lead = attrs.lead ?? false;
		const align = attrs.align ?? 'left';

		const dropcapMeta = dropcap ? new Tag('meta', { content: 'dropcap' }) : undefined;
		const columnsMeta = columns > 1 ? new Tag('meta', { content: String(columns) }) : undefined;
		const leadMeta = lead ? new Tag('meta', { content: 'lead' }) : undefined;
		const alignMeta = align !== 'left' ? new Tag('meta', { content: align }) : undefined;

		const body = children.wrap('div');
		const childNodes: any[] = [];
		if (dropcapMeta) childNodes.push(dropcapMeta);
		if (columnsMeta) childNodes.push(columnsMeta);
		if (leadMeta) childNodes.push(leadMeta);
		if (alignMeta) childNodes.push(alignMeta);
		childNodes.push(body.next());

		return createComponentRenderable({ rune: 'text-block',
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
	},
});
