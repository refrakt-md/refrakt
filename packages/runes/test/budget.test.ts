import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

const SOURCE = `{% budget currency="JPY" duration="5 days" %}
# Tokyo Trip

## Accommodation

- Hotel in Shinjuku: ¥15000
- Ryokan in Hakone: ¥25000

## Transportation

- Japan Rail Pass: ¥29650
{% /budget %}`;

const text = (t: any) => String(t.children?.[0] ?? '');

describe('budget tag', () => {
	// SPEC-102/WORK-414 regression — the category header reads the field bag
	// (createComponentRenderable moves label/subtotal there), so it shows the
	// real label and computed subtotal rather than an empty label / ¥0.
	it('renders category labels and formatted subtotals in the header', () => {
		const result = parse(SOURCE);

		const labels = findAllTags(result as any, t => /rf-budget-category__label/.test(String(t.attributes.class))).map(text);
		expect(labels).toContain('Accommodation');
		expect(labels).toContain('Transportation');

		const subtotals = findAllTags(result as any, t => /rf-budget-category__subtotal/.test(String(t.attributes.class))).map(text);
		expect(subtotals.some(s => /40,000/.test(s))).toBe(true);
		expect(subtotals.every(s => s !== '¥0')).toBe(true);
	});

	it('sums category subtotals into a grand total', () => {
		const result = parse(SOURCE);
		const total = findTag(result as any, t => /rf-budget__total-amount/.test(String(t.attributes.class)));
		expect(total).toBeDefined();
		expect(text(total)).toMatch(/69,650/); // 15000 + 25000 + 29650
	});
});
