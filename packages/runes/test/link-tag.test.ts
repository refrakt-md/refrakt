import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

const anchor = (result: unknown) => findTag(result as any, (t) => t.name === 'a');

describe('{% link %}', () => {
	it('links inline content', () => {
		const a = anchor(parse('See {% link href="/docs" %}the docs{% /link %}.'));
		expect(a?.attributes.href).toBe('/docs');
	});

	it('renders inline content unlinked when href is empty', () => {
		const result = parse('See {% link href="" %}the docs{% /link %}.');
		expect(anchor(result)).toBeUndefined();
		expect(JSON.stringify(result)).toContain('the docs');
	});

	it('renders a block unlinked when href is empty', () => {
		const result = parse('{% link href="" %}\n## Title\n\nBody.\n{% /link %}');
		expect(findTag(result as any, (t) => 'data-link-href' in t.attributes)).toBeUndefined();
		expect(JSON.stringify(result)).toContain('Body.');
	});
});
