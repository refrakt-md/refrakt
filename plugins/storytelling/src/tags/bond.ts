import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;
import {
	createContentModelSchema,
	bodyOnly,
	createComponentRenderable,
	renderNodes,
} from '@refrakt-md/runes';

// SPEC-125 Phase 2 — join tables the rune declares about itself. Referenced
// from the theme config rather than owned by it: a theme may not redefine
// what a section *is* (ADR-028).
export const bondSections = { body: 'body' } as const;

export const bond = createContentModelSchema({
	// SPEC-144 — a bond is an edge between two entities, registered as a `bond`
	// entry (id `from→to`) and contributed to the relationship graph (WORK-612).
	registers: {
		edge: {
			from: 'from',
			to: 'to',
			kind: { field: 'bondType' },
			bidirectional: { field: 'bidirectional' },
			data: ['bondType', 'status', 'bidirectional'],
		},
	},
	sections: bondSections,
	provides: ['prose'],
	attributes: {
		from: {
			type: String,
			required: true,
			description: 'Name of the first character or entity in this bond.',
		},
		to: {
			type: String,
			required: true,
			description: 'Name of the second character or entity in this bond.',
		},
		type: {
			type: String,
			required: false,
			description: 'Kind of relationship (e.g. ally, rival, mentor, sibling).',
		},
		status: {
			type: String,
			required: false,
			description: 'Current state of the bond (e.g. active, broken, strained).',
		},
		bidirectional: {
			type: Boolean,
			required: false,
			description: 'Enable/disable mutual connection between both entities.',
		},
	},
	contentModel: bodyOnly(),
	transform(resolved, attrs, config) {
		const fromTag = new Tag('span', {}, [attrs.from ?? '']);
		const toTag = new Tag('span', {}, [attrs.to ?? '']);
		const connector = new Tag('div', { 'data-name': 'connector' }, [
			new Tag('span', { 'data-name': 'arrow' }),
		]);
		const bondTypeMeta = new Tag('meta', { content: attrs.type ?? '' });
		const statusMeta = new Tag('meta', { content: attrs.status ?? 'active' });
		const bidirectionalMeta = new Tag('meta', { content: String(attrs.bidirectional ?? true) });
		const body = renderNodes(resolved.body, config).wrap('div');

		return createComponentRenderable({
			rune: 'bond',
			tag: 'div',
			properties: {
				bondType: bondTypeMeta,
				status: statusMeta,
				bidirectional: bidirectionalMeta,
			},
			refs: {
				from: fromTag,
				to: toTag,
				connector,
				body: body.tag('div'),
			},
			children: [fromTag, connector, toTag, body.next()],
		});
	},
});
