import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('chart tag', () => {
	it('should transform a table into a chart', () => {
		const result = parse(`{% chart type="bar" title="Sales" %}
| Month | Revenue |
|-------|---------|
| Jan   | 100     |
| Feb   | 200     |
| Mar   | 150     |
{% /chart %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Chart');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('figure');
	});

	it('should pass chart type and title as meta', () => {
		const result = parse(`{% chart type="line" title="Growth" stacked=true %}
| Year | Users |
|------|-------|
| 2023 | 1000  |
| 2024 | 5000  |
{% /chart %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Chart');
		const metas = findAllTags(tag!, t => t.name === 'meta');

		const type = metas.find(m => m.attributes.property === 'type');
		expect(type).toBeDefined();
		expect(type!.attributes.content).toBe('line');

		const title = metas.find(m => m.attributes.property === 'title');
		expect(title).toBeDefined();
		expect(title!.attributes.content).toBe('Growth');

		const stacked = metas.find(m => m.attributes.property === 'stacked');
		expect(stacked).toBeDefined();
		expect(stacked!.attributes.content).toBe('true');
	});

	it('should serialize table data as JSON in refs', () => {
		const result = parse(`{% chart %}
| Month | Revenue |
|-------|---------|
| Jan   | 100     |
{% /chart %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Chart');
		const dataMeta = findTag(tag!, t => t.name === 'meta' && t.attributes['data-name'] === 'data');
		expect(dataMeta).toBeDefined();

		const data = JSON.parse(dataMeta!.attributes.content);
		expect(data.headers).toBeDefined();
		expect(data.rows).toBeDefined();
	});
});
