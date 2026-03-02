import { describe, it, expect } from 'vitest';
import { parse, findTag, findAllTags } from './helpers.js';

describe('plot tag', () => {
	it('should convert list items to beats', () => {
		const result = parse(`{% plot title="Quest" %}
- First beat
- Second beat
- Third beat
{% /plot %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Plot');
		expect(tag).toBeDefined();
		expect(tag!.name).toBe('section');

		const beats = findAllTags(tag!, t => t.attributes.typeof === 'Beat');
		expect(beats.length).toBe(3);
	});

	it('should emit title as a span property', () => {
		const result = parse(`{% plot title="The Awakening" %}
- A beat
{% /plot %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Plot');
		const titleTag = findTag(tag!, t => t.name === 'span' && t.attributes.property === 'title');
		expect(titleTag).toBeDefined();
		expect(titleTag!.children[0]).toBe('The Awakening');
	});

	it('should pass plotType and structure as meta tags', () => {
		const result = parse(`{% plot title="Arc" type="quest" structure="linear" %}
- Beat one
{% /plot %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Plot');
		const typeMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'plotType');
		expect(typeMeta).toBeDefined();
		expect(typeMeta!.attributes.content).toBe('quest');

		const structMeta = findTag(tag!, t => t.name === 'meta' && t.attributes.property === 'structure');
		expect(structMeta).toBeDefined();
		expect(structMeta!.attributes.content).toBe('linear');
	});

	it('should parse status markers from list items', () => {
		const result = parse(`{% plot title="Quest" %}
- [x] Completed step
- [>] Active step
- [ ] Planned step
- [-] Abandoned step
{% /plot %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Plot');
		const beats = findAllTags(tag!, t => t.attributes.typeof === 'Beat');
		expect(beats.length).toBe(4);

		// Check that status meta tags are present
		const statuses = beats.map(beat => {
			const meta = findTag(beat, t => t.name === 'meta' && t.attributes.property === 'status');
			return meta?.attributes.content;
		});
		expect(statuses).toEqual(['complete', 'active', 'planned', 'abandoned']);
	});

	it('should extract label from bold text in list items', () => {
		const result = parse(`{% plot title="Quest" %}
- [x] **Discovery** — Find the map
{% /plot %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Plot');
		const beat = findTag(tag!, t => t.attributes.typeof === 'Beat');
		expect(beat).toBeDefined();

		const labelTag = findTag(beat!, t => t.name === 'span' && t.attributes.property === 'label');
		expect(labelTag).toBeDefined();
		expect(labelTag!.children[0]).toBe('Discovery');
	});

	it('should work with storyline alias', () => {
		const result = parse(`{% storyline title="Main Arc" %}
- First event
{% /storyline %}`);

		const tag = findTag(result as any, t => t.attributes.typeof === 'Plot');
		expect(tag).toBeDefined();
	});
});
