import { describe, it, expect } from 'vitest';
import { makeTag, parseFields, readField } from '../src/helpers.js';

describe('SPEC-082 field channel helpers', () => {
	describe('parseFields', () => {
		it('parses the data-rune-fields JSON object', () => {
			const tag = makeTag('article', { 'data-rune-fields': JSON.stringify({ status: 'done', rating: 4 }) }, []);
			expect(parseFields(tag)).toEqual({ status: 'done', rating: 4 });
		});

		it('returns {} for absent or malformed JSON', () => {
			expect(parseFields(makeTag('article', {}, []))).toEqual({});
			expect(parseFields(makeTag('article', { 'data-rune-fields': '{not json' }, []))).toEqual({});
			expect(parseFields(makeTag('article', { 'data-rune-fields': '["array"]' }, []))).toEqual({});
		});
	});

	describe('readField', () => {
		it('reads from the bag first (camelCase key), coercing scalars to string', () => {
			const tag = makeTag('article', {
				'data-rune-fields': JSON.stringify({ status: 'done', servings: 4 }),
			}, []);
			expect(readField(tag, 'status')).toBe('done');
			expect(readField(tag, 'servings')).toBe('4'); // number → string
		});

		it('falls back to the <meta data-field> child (kebab match) when not in the bag', () => {
			const tag = makeTag('article', {}, [
				makeTag('meta', { 'data-field': 'end-date', content: '2026-03-17' }),
			]);
			expect(readField(tag, 'endDate')).toBe('2026-03-17'); // kebab fallback
		});

		it('prefers the bag over a legacy meta when both are present', () => {
			const tag = makeTag('article', {
				'data-rune-fields': JSON.stringify({ status: 'done' }),
			}, [
				makeTag('meta', { 'data-field': 'status', content: 'ready' }),
			]);
			expect(readField(tag, 'status')).toBe('done');
		});

		it('returns undefined when neither channel has the field', () => {
			expect(readField(makeTag('article', {}, []), 'status')).toBeUndefined();
		});

		it('accepts a pre-parsed bag to avoid re-parsing per field', () => {
			const tag = makeTag('article', {
				'data-rune-fields': JSON.stringify({ a: '1', b: '2' }),
			}, []);
			const bag = parseFields(tag);
			expect(readField(tag, 'a', bag)).toBe('1');
			expect(readField(tag, 'b', bag)).toBe('2');
		});
	});
});
