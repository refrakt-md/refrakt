import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { createContentModelSchema } from '../src/lib/index.js';
import { captureDeferredBodies, readDeferredBody, transformDeferredTemplate, DEFERRED_BODY_ATTR } from '../src/deferred-body.js';

const { Tag } = Markdoc;

// A minimal deferBody rune that stashes the captured source onto a sentinel attr.
const collectionLike = createContentModelSchema({
	attributes: { type: { type: String, required: false } },
	deferBody: true,
	contentModel: { type: 'sequence', fields: [] },
	transform(_resolved, attrs) {
		const src = readDeferredBody(attrs) ?? '';
		return new Tag('section', { 'data-template': src }, []);
	},
});

const source = `{% collectionLike type="product" %}
### {% $item.data.title %}

Price: {% $item.data.price %} (id: {% $item.id %})
{% /collectionLike %}`;

describe('deferred-body capture', () => {
	it('marks the schema deferBody and declares the stash attribute', () => {
		expect((collectionLike as { deferBody?: boolean }).deferBody).toBe(true);
		expect(collectionLike.attributes?.[DEFERRED_BODY_ATTR]).toBeDefined();
	});

	it('captures the body as source and empties it before transform', () => {
		const ast = Markdoc.parse(source);
		captureDeferredBodies(ast, (n) => n === 'collectionLike');
		const tag = ast.children[0];
		expect(tag.children).toHaveLength(0);
		const stashed = tag.attributes[DEFERRED_BODY_ATTR] as string;
		expect(stashed).toContain('$item.data.title');
		expect(stashed).toContain('$item.id');
	});

	it('transform of the captured page does not resolve $item (no error, source preserved)', () => {
		const ast = Markdoc.parse(source);
		captureDeferredBodies(ast, (n) => n === 'collectionLike');
		const rendered = Markdoc.transform(ast, { tags: { collectionLike }, variables: {} });
		const blob = JSON.stringify(rendered);
		expect(blob).toContain('$item.data.title'); // still source, not resolved
	});

	it('per-entity reparse produces independent, correct renderables', () => {
		const ast = Markdoc.parse(source);
		captureDeferredBodies(ast, (n) => n === 'collectionLike');
		const stashed = ast.children[0].attributes[DEFERRED_BODY_ATTR] as string;

		const entities = [
			{ id: 'P-1', data: { title: 'Widget', price: '$20' } },
			{ id: 'P-2', data: { title: 'Gadget', price: '$35' } },
		];
		const outs = entities.map((item) => JSON.stringify(transformDeferredTemplate(stashed, {}, { item })));

		expect(outs[0]).toContain('Widget');
		expect(outs[0]).not.toContain('Gadget');
		expect(outs[1]).toContain('Gadget');
		expect(outs[1]).not.toContain('Widget');
		expect(outs[0]).toContain('P-1');
		expect(outs[1]).toContain('P-2');
	});
});
