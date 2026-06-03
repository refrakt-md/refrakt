import { describe, it, expect } from 'vitest';
import { parse, findTag } from './helpers.js';

// SPEC-083: chart emits the rf-chart custom element wrapping the authored data
// `<table>` (the no-JS fallback + the source the web component parses). type /
// stacked ride the data-rune-fields bag (→ data-*); the title is the caption.

describe('chart tag', () => {
	it('should transform a table into an rf-chart element', () => {
		const result = parse(`{% chart type="bar" title="Sales" %}
| Month | Revenue |
|-------|---------|
| Jan   | 100     |
| Feb   | 200     |
| Mar   | 150     |
{% /chart %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'chart');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('rf-chart');
	});

	it('should carry type/stacked in the bag and the title in a caption', () => {
		const result = parse(`{% chart type="line" title="Growth" stacked=true %}
| Year | Users |
|------|-------|
| 2023 | 1000  |
| 2024 | 5000  |
{% /chart %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'chart');

		const fields = JSON.parse(tag!.attributes['data-rune-fields'] as string);
		expect(fields.type).toBe('line');
		expect(fields.stacked).toBe('true');

		const caption = findTag(tag!, t => t.name === 'caption');
		expect(caption).toBeDefined();
		expect(caption!.children).toContain('Growth');
	});

	it('should keep the data table as the source of truth', () => {
		const result = parse(`{% chart %}
| Month | Revenue |
|-------|---------|
| Jan   | 100     |
{% /chart %}`);

		const tag = findTag(result as any, t => t.attributes['data-rune'] === 'chart');
		const table = findTag(tag!, t => t.name === 'table' && t.attributes['data-name'] === 'data');
		expect(table).toBeDefined();
		expect(findTag(table!, t => t.name === 'thead')).toBeDefined();
		expect(findTag(table!, t => t.name === 'tbody')).toBeDefined();
	});
});
