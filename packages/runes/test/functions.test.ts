import { describe, it, expect } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { functions } from '../src/functions.js';

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

	it('formatters degrade gracefully on bad input', () => {
		expect(functions.currency.transform!({ 0: 'n/a' } as never, {} as never)).toBe('n/a');
		expect(functions.date.transform!({ 0: 'nope' } as never, {} as never)).toBe('nope');
	});

	it('are usable inside markdoc interpolation with variables', () => {
		const blob = run('Price: {% currency($p, "USD") %}', { p: 9 });
		expect(blob).toContain('$9.00');
	});
});
