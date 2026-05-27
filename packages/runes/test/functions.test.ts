import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { functions, humanize } from '../src/functions.js';

function run(src: string, variables: Record<string, unknown> = {}): string {
	const rendered = Markdoc.transform(Markdoc.parse(src), { functions, variables } as never);
	return JSON.stringify(rendered);
}

describe('formatter functions', () => {
	it('currency formats a number with a currency code', () => {
		expect(functions.currency.transform!({ 0: 20, 1: 'USD' } as never, {} as never)).toBe('$20.00');
		expect(functions.currency.transform!({ 0: 1234.5, 1: 'EUR' } as never, {} as never)).toBe('€1,234.50');
	});

	it('date formats an ISO date', () => {
		expect(functions.date.transform!({ 0: '2024-01-15' } as never, {} as never)).toBe('Jan 15, 2024');
	});

	it('number adds grouping separators', () => {
		expect(functions.number.transform!({ 0: 1234567 } as never, {} as never)).toBe('1,234,567');
	});

	it('join joins arrays with a separator', () => {
		expect(functions.join.transform!({ 0: ['a', 'b', 'c'], 1: ' · ' } as never, {} as never)).toBe('a · b · c');
	});

	it('concat stringifies and joins positional args (no separator)', () => {
		expect(functions.concat.transform!({ 0: 'milestone:', 1: 'v0.16.0' } as never, {} as never)).toBe('milestone:v0.16.0');
		expect(functions.concat.transform!({ 0: 'a', 1: 'b', 2: 'c' } as never, {} as never)).toBe('abc');
		expect(functions.concat.transform!({ 0: 'n=', 1: 42 } as never, {} as never)).toBe('n=42');
		expect(functions.concat.transform!({ 0: 'x:', 1: null, 2: 'y' } as never, {} as never)).toBe('x:y');
	});

	it('concat composes dynamic attribute values with variables', () => {
		const blob = run('Filter: {% concat("milestone:", $id) %}', { id: 'v0.16.0' });
		expect(blob).toContain('milestone:v0.16.0');
	});

	it('formatters degrade gracefully on bad input', () => {
		expect(functions.currency.transform!({ 0: 'n/a' } as never, {} as never)).toBe('n/a');
		expect(functions.date.transform!({ 0: 'nope' } as never, {} as never)).toBe('nope');
	});

	it('are usable inside markdoc interpolation with variables', () => {
		const blob = run('Price: {% currency($p, "USD") %}', { p: 9 });
		expect(blob).toContain('$9.00');
	});

	it('humanize title-cases slugs, snake_case and camelCase', () => {
		expect(humanize('blocked-by')).toBe('Blocked By');
		expect(humanize('depends-on')).toBe('Depends On');
		expect(humanize('in-progress')).toBe('In Progress');
		expect(humanize('prepTime')).toBe('Prep Time');
		expect(humanize('status')).toBe('Status');
		expect(humanize('')).toBe('');
	});

	it('humanize is exposed as a markdoc function', () => {
		expect(functions.humanize.transform!({ 0: 'blocked-by' } as never, {} as never)).toBe('Blocked By');
		expect(run('{% humanize($k) %}', { k: 'in-progress' })).toContain('In Progress');
	});
});
