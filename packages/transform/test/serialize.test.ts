import { describe, it, expect } from 'vitest';
import { serialize, serializeTree } from '../src/serialize.js';

// Create a mock Markdoc Tag-like instance (has $$mdtype: 'Tag')
function mockTag(name: string, attributes: Record<string, any> = {}, children: any[] = []): any {
	return { $$mdtype: 'Tag', name, attributes, children };
}

describe('serialize', () => {
	it('should pass through null', () => {
		expect(serialize(null)).toBeNull();
	});

	it('should pass through undefined', () => {
		expect(serialize(undefined)).toBeUndefined();
	});

	it('should pass through strings', () => {
		expect(serialize('hello')).toBe('hello');
	});

	it('should pass through numbers', () => {
		expect(serialize(42)).toBe(42);
	});

	it('should convert a Tag to a plain object with $$mdtype marker', () => {
		const tag = mockTag('div', { class: 'test' }, ['content']);
		const result = serialize(tag) as any;

		expect(result.$$mdtype).toBe('Tag');
		expect(result.name).toBe('div');
		expect(result.attributes).toEqual({ class: 'test' });
		expect(result.children).toEqual(['content']);
	});

	it('should recursively serialize nested Tags', () => {
		const child = mockTag('span', {}, ['text']);
		const parent = mockTag('div', {}, [child]);
		const result = serialize(parent) as any;

		expect(result.children[0].$$mdtype).toBe('Tag');
		expect(result.children[0].name).toBe('span');
		expect(result.children[0].children).toEqual(['text']);
	});

	it('should handle mixed children (Tags and strings)', () => {
		const tag = mockTag('p', {}, ['before ', mockTag('strong', {}, ['bold']), ' after']);
		const result = serialize(tag) as any;

		expect(result.children).toHaveLength(3);
		expect(result.children[0]).toBe('before ');
		expect(result.children[1].name).toBe('strong');
		expect(result.children[2]).toBe(' after');
	});
});

describe('serializeTree', () => {
	it('should serialize an array of nodes', () => {
		const nodes = [
			mockTag('p', {}, ['first']),
			'text between',
			mockTag('p', {}, ['second']),
		];
		const result = serializeTree(nodes) as any[];

		expect(result).toHaveLength(3);
		expect(result[0].$$mdtype).toBe('Tag');
		expect(result[1]).toBe('text between');
		expect(result[2].$$mdtype).toBe('Tag');
	});

	it('should serialize a single node', () => {
		const tag = mockTag('section', {}, []);
		const result = serializeTree(tag) as any;

		expect(result.$$mdtype).toBe('Tag');
		expect(result.name).toBe('section');
	});
});
