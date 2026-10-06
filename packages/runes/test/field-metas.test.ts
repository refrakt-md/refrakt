import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import type { Config } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { fieldMetas, type FieldMetaSpec } from '../src/lib/field-metas.js';
import { createComponentRenderable } from '../src/lib/component.js';
import { bodyOnly } from '../src/lib/index.js';
import { groupByHeading } from '../src/lib/node.js';

const config = (file?: Record<string, unknown>): Config => ({ variables: file ? { file } : {} });
const contents = (metas: Record<string, InstanceType<typeof Tag>>) =>
	Object.fromEntries(Object.entries(metas).map(([k, t]) => [k, t.attributes.content]));

describe('fieldMetas', () => {
	const spec: FieldMetaSpec = {
		id: '',
		status: 'draft',
		created: { from: ['attrs.created', 'file.created'], default: '' },
	};

	it('is data: the spec round-trips through JSON unchanged', () => {
		expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
	});

	it('reads a bare-string entry as the same-named attribute, defaulting when absent', () => {
		expect(contents(fieldMetas({ id: 'WORK-1' }, config(), spec))).toEqual({
			id: 'WORK-1',
			status: 'draft',
			created: '',
		});
	});

	it('takes the first non-empty source, in order, then the literal default', () => {
		const file = { created: '2026-01-01' };
		expect(
			fieldMetas({ created: '2025-12-31' }, config(file), spec).created.attributes.content,
		).toBe('2025-12-31');
		expect(fieldMetas({ created: '' }, config(file), spec).created.attributes.content).toBe(
			'2026-01-01',
		);
		expect(fieldMetas({}, config(), spec).created.attributes.content).toBe('');
	});

	it('keeps declaration order, which is the order of the data-rune-fields bag', () => {
		expect(Object.keys(fieldMetas({}, config(), spec))).toEqual(['id', 'status', 'created']);
	});

	it('rejects an unknown root at call time instead of resolving to empty', () => {
		const bad = { x: { from: ['page.title'], default: '' } } as unknown as FieldMetaSpec;
		expect(() => fieldMetas({}, config(), bad)).toThrow(/unknown source "page\.title"/);
	});

	it('rejects a bad source even when an earlier source already has a value', () => {
		const bad = { x: { from: ['attrs.x', 'nope.x'], default: '' } } as unknown as FieldMetaSpec;
		expect(() => fieldMetas({ x: 'set' }, config(), bad)).toThrow(/unknown source "nope\.x"/);
	});

	it('still trips the ADR-008 collision check when the properties object is computed', () => {
		expect(() =>
			createComponentRenderable({
				rune: 'probe',
				tag: 'div',
				properties: fieldMetas({}, config(), { title: '' }),
				refs: { title: new Tag('h1', {}, ['T']) },
				children: [],
			}),
		).toThrow('Rune "probe" has naming collisions between properties and refs: title');
	});
});

describe('bodyOnly', () => {
	it('returns a fresh object per call', () => {
		const a = bodyOnly();
		(a as { fields: unknown[] }).fields.push('mutated');
		expect(bodyOnly()).toEqual({
			type: 'sequence',
			fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
		});
	});
});

describe('groupByHeading', () => {
	it('runs a heading-set group over list items and passes other nodes through in order', () => {
		const ast = Markdoc.parse('Intro\n\n- a\n\n## One\n\n- b\n- c\n\nMiddle\n\n## Two\n\n- d\n');
		const items: string[] = [];
		const others: string[] = [];
		const text = (n: (typeof ast.children)[number]) =>
			Array.from(n.walk())
				.filter((c) => c.type === 'text')
				.map((c) => c.attributes.content)
				.join('');
		groupByHeading(ast.children, {
			initial: '-',
			heading: (h) => text(h),
			item: (item, group) => items.push(`${group}:${text(item)}`),
			other: (node) => others.push(text(node)),
		});
		expect(items).toEqual(['-:a', 'One:b', 'One:c', 'Two:d']);
		expect(others).toEqual(['Intro', 'Middle']);
	});
});
