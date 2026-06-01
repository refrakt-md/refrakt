import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { mergeThemeConfig } from '../src/merge.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig, RuneConfig, LayoutPrimitive } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function baseConfig(runes: ThemeConfig['runes'], zoneLayouts?: Record<string, LayoutPrimitive>): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes, zoneLayouts };
}

/** Recursively find first descendant element by data-name. */
function findByName(node: SerializedTag, name: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child === 'object' && child !== null && '$$mdtype' in child) {
			const tag = child as SerializedTag;
			if (tag.attributes?.['data-name'] === name) return tag;
			const found = findByName(tag, name);
			if (found) return found;
		}
	}
	return undefined;
}

/** Find first descendant with data-zone attribute matching. */
function findByZone(node: SerializedTag, zoneName: string): SerializedTag | undefined {
	for (const child of node.children) {
		if (typeof child === 'object' && child !== null && '$$mdtype' in child) {
			const tag = child as SerializedTag;
			if (tag.attributes?.['data-zone'] === zoneName) return tag;
			const found = findByZone(tag, zoneName);
			if (found) return found;
		}
	}
	return undefined;
}

/** Tag with id + status meta and authored title/body for a `work`-shaped rune. */
function makeWorkTag(workConfig: Partial<RuneConfig> & { block: string }, attrs: { id?: string; status?: string; priority?: string; complexity?: string; assignee?: string } = {}) {
	const metaChildren: SerializedTag[] = [];
	for (const [field, value] of Object.entries(attrs)) {
		if (value !== undefined) {
			metaChildren.push(makeTag('meta', { 'data-field': field, content: value }));
		}
	}
	const titleEl = makeTag('header', { 'data-name': 'title' }, [makeTag('h1', {}, ['My Work'])]);
	const bodyEl = makeTag('div', { 'data-name': 'body' }, [makeTag('p', {}, ['Body content'])]);
	return makeTag('article', { 'data-rune': 'work' }, [...metaChildren, titleEl, bodyEl]);
}

describe('SPEC-079 engine zone dispatcher', () => {
	const workConfig: RuneConfig = {
		block: 'work',
		modifiers: {
			id: { source: 'meta' },
			status: { source: 'meta', default: 'draft' },
			priority: { source: 'meta', default: 'medium' },
			complexity: { source: 'meta', default: 'unknown' },
			assignee: { source: 'meta', noBemClass: true },
		},
		metaFields: {
			id: { metaType: 'id' },
			status: {
				metaType: 'status',
				sentimentMap: { draft: 'neutral', done: 'positive', blocked: 'negative' },
			},
			priority: {
				metaType: 'category', label: 'Priority',
				sentimentMap: { high: 'caution', medium: 'neutral' },
			},
			complexity: { metaType: 'quantity', label: 'Complexity' },
			assignee: { metaType: 'tag', label: 'Assignee', condition: 'assignee' },
		},
		zones: {
			eyebrow: { left: ['id'], right: ['status'] },
			metadata: { fields: ['priority', 'complexity', 'assignee'] },
		},
		contentSlots: { title: 'title', body: 'body' },
	};

	describe('split layout (eyebrow)', () => {
		it('emits two-slot DOM with data-eyebrow-slot attributes', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', status: 'done' })));

			const eyebrow = findByZone(result, 'eyebrow')!;
			expect(eyebrow).toBeDefined();
			expect(eyebrow.attributes['data-zone-layout']).toBe('split');
			expect(eyebrow.children.length).toBe(2);
			const left = eyebrow.children[0] as SerializedTag;
			const right = eyebrow.children[1] as SerializedTag;
			expect(left.attributes['data-eyebrow-slot']).toBe('left');
			expect(right.attributes['data-eyebrow-slot']).toBe('right');
		});

		it('left slot renders id as plain text (no .rf-badge class)', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', status: 'done' })));

			const left = (findByZone(result, 'eyebrow')!.children[0] as SerializedTag);
			const idEl = left.children[0] as SerializedTag;
			expect(idEl.attributes.class).toBeUndefined();
			expect(idEl.attributes['data-meta-type']).toBe('id');
			expect(idEl.children[0]).toBe('WORK-1');
		});

		it('right slot renders sentiment-mapped status as a chip (.rf-badge)', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', status: 'done' })));

			const right = (findByZone(result, 'eyebrow')!.children[1] as SerializedTag);
			const statusEl = right.children[0] as SerializedTag;
			expect(statusEl.attributes.class).toBe('rf-badge');
			expect(statusEl.attributes['data-meta-type']).toBe('status');
			expect(statusEl.attributes['data-meta-sentiment']).toBe('positive');
		});
	});

	describe('chip-row layout (metadata)', () => {
		it('emits one .rf-badge chip per field', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', priority: 'high', complexity: 'moderate' })));

			const metadata = findByZone(result, 'metadata')!;
			expect(metadata.attributes['data-zone-layout']).toBe('chip-row');
			// priority + complexity (no assignee due to condition)
			expect(metadata.children.length).toBe(2);
			const [priority, complexity] = metadata.children as SerializedTag[];
			expect(priority.attributes.class).toBe('rf-badge');
			expect(priority.attributes['data-meta-sentiment']).toBe('caution');
			expect(complexity.attributes.class).toBe('rf-badge');
			expect(complexity.attributes['data-meta-type']).toBe('quantity');
		});

		it('chip-row chips carry inline label + value spans when label is set', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', priority: 'high', complexity: 'moderate' })));
			const metadata = findByZone(result, 'metadata')!;
			const priority = metadata.children[0] as SerializedTag;
			const [labelEl, valueEl] = priority.children as SerializedTag[];
			expect(labelEl.attributes['data-meta-label']).toBe('');
			expect(labelEl.children[0]).toBe('Priority');
			expect(valueEl.attributes['data-meta-value']).toBe('');
			expect(valueEl.children[0]).toBe('high');
		});
	});

	describe('definition-list layout (metadata)', () => {
		it('emits <dl> with dt/dd pairs wrapped in data-name="row" divs', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'definition-list' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', priority: 'high', complexity: 'moderate' })));

			const metadata = findByZone(result, 'metadata')!;
			expect(metadata.name).toBe('dl');
			expect(metadata.attributes['data-zone-layout']).toBe('definition-list');
			expect(metadata.children.length).toBe(2);
			const row = metadata.children[0] as SerializedTag;
			expect(row.attributes['data-name']).toBe('row');
			expect(row.attributes['data-field']).toBe('priority');
			const [dt, dd] = row.children as SerializedTag[];
			expect(dt.name).toBe('dt');
			expect(dt.children[0]).toBe('Priority');
			expect(dd.name).toBe('dd');
		});

		it('sentiment-mapped field renders chip inside <dd>', () => {
			const config = baseConfig({ Work: workConfig }, { metadata: 'definition-list' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', priority: 'high', complexity: 'moderate' })));
			const metadata = findByZone(result, 'metadata')!;
			const priorityRow = metadata.children[0] as SerializedTag;
			const dd = priorityRow.children[1] as SerializedTag;
			expect((dd.children[0] as SerializedTag).attributes.class).toBe('rf-badge');
		});

		it('non-sentiment field renders plain text <dd> with data-meta-type for typography', () => {
			const config = baseConfig({ Work: workConfig }, { metadata: 'definition-list' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', priority: 'high', complexity: 'moderate' })));
			const metadata = findByZone(result, 'metadata')!;
			const complexityRow = metadata.children[1] as SerializedTag;
			const dd = complexityRow.children[1] as SerializedTag;
			expect(dd.attributes['data-meta-type']).toBe('quantity');
			expect(dd.children[0]).toBe('moderate');
		});
	});

	describe('canonical ordering + preamble wrapper', () => {
		it('emits header positions (eyebrow + title + metadata) inside an auto-derived preamble', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', status: 'done', priority: 'high' })));

			const preamble = findByName(result, 'preamble')!;
			expect(preamble).toBeDefined();
			expect(preamble.attributes['data-section']).toBe('preamble');
			// preamble holds eyebrow + title + metadata (in canonical order)
			const childNames = preamble.children
				.filter((c): c is SerializedTag => typeof c === 'object' && c !== null && '$$mdtype' in c)
				.map(c => c.attributes['data-name']);
			expect(childNames).toEqual(['eyebrow', 'title', 'metadata']);
		});

		it('body renders outside preamble', () => {
			const config = baseConfig({ Work: workConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', status: 'done', priority: 'high' })));
			const body = findByName(result, 'body')!;
			expect(body).toBeDefined();
			// body's parent should be the root, not preamble
			const preamble = findByName(result, 'preamble')!;
			const preambleHasBody = preamble.children.some(c =>
				typeof c === 'object' && c !== null && '$$mdtype' in c &&
				(c as SerializedTag).attributes['data-name'] === 'body',
			);
			expect(preambleHasBody).toBe(false);
		});

		it('sparse positions render without empty wrappers', () => {
			const sparseConfig: RuneConfig = {
				block: 'card',
				metaFields: { id: { metaType: 'id' } },
				zones: { eyebrow: { left: ['id'], right: [] } },
				contentSlots: { body: 'body' },
				modifiers: { id: { source: 'meta' } },
			};
			const config = baseConfig({ Card: sparseConfig }, { eyebrow: 'split' });
			const transform = createTransform(config);
			const result = asTag(transform(makeTag('article', { 'data-rune': 'card' }, [
				makeTag('meta', { 'data-field': 'id', content: 'C-1' }),
				makeTag('div', { 'data-name': 'body' }, ['Body']),
			])));
			// No metadata zone, no title — preamble holds only eyebrow
			const preamble = findByName(result, 'preamble')!;
			const inPreamble = preamble.children
				.filter((c): c is SerializedTag => typeof c === 'object' && c !== null && '$$mdtype' in c)
				.map(c => c.attributes['data-name']);
			expect(inPreamble).toEqual(['eyebrow']);
		});

		it('honours explicit `order` override', () => {
			const orderedConfig: RuneConfig = {
				...workConfig,
				order: ['metadata', 'eyebrow', 'title', 'body'],
			};
			const config = baseConfig({ Work: orderedConfig }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(orderedConfig, { id: 'WORK-1', status: 'done', priority: 'high' })));
			// preamble's children should match the override order
			const preamble = findByName(result, 'preamble')!;
			const inPreamble = preamble.children
				.filter((c): c is SerializedTag => typeof c === 'object' && c !== null && '$$mdtype' in c)
				.map(c => c.attributes['data-name']);
			expect(inPreamble).toEqual(['metadata', 'eyebrow', 'title']);
		});
	});

	describe('zoneLayouts resolution chain', () => {
		it('per-rune zoneLayouts overrides theme-wide default', () => {
			const overriding: RuneConfig = { ...workConfig, zoneLayouts: { metadata: 'definition-list' } };
			const config = baseConfig({ Work: overriding }, { eyebrow: 'split', metadata: 'chip-row' });
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(overriding, { id: 'WORK-1', priority: 'high', complexity: 'moderate' })));
			const metadata = findByZone(result, 'metadata')!;
			expect(metadata.attributes['data-zone-layout']).toBe('definition-list');
		});

		it('falls back to engine default when neither theme nor rune set a layout', () => {
			const config = baseConfig({ Work: workConfig }); // no zoneLayouts
			const transform = createTransform(config);
			const result = asTag(transform(makeWorkTag(workConfig, { id: 'WORK-1', status: 'done', priority: 'high' })));
			const eyebrow = findByZone(result, 'eyebrow')!;
			const metadata = findByZone(result, 'metadata')!;
			expect(eyebrow.attributes['data-zone-layout']).toBe('split');
			expect(metadata.attributes['data-zone-layout']).toBe('chip-row');
		});
	});

	describe('splitOn — multi-value fields fan into per-item chips', () => {
		const tagsConfig: RuneConfig = {
			block: 'card',
			modifiers: { tags: { source: 'meta' } },
			metaFields: {
				tags: { metaType: 'tag', label: 'Tags', splitOn: ',' },
			},
			zones: { tags: { fields: ['tags'] } },
			contentSlots: { body: 'body' },
			order: ['tags', 'body'],
			zoneLayouts: { tags: 'chip-row' },
		};

		it('chip-row emits one chip per split item', () => {
			const config = baseConfig({ Card: tagsConfig });
			const transform = createTransform(config);
			const result = asTag(transform(makeTag('article', { 'data-rune': 'card' }, [
				makeTag('meta', { 'data-field': 'tags', content: 'plan,plugin,runes' }),
				makeTag('div', { 'data-name': 'body' }, ['Body']),
			])));
			const zone = findByZone(result, 'tags')!;
			expect(zone.attributes['data-zone-layout']).toBe('chip-row');
			expect(zone.children.length).toBe(3);
			const chips = zone.children as SerializedTag[];
			expect(chips.map(c => c.children[0])).toEqual(['plan', 'plugin', 'runes']);
			for (const chip of chips) {
				expect(chip.attributes.class).toBe('rf-badge');
				expect(chip.attributes['data-meta-type']).toBe('tag');
			}
		});

		it('trims whitespace and drops empty parts', () => {
			const config = baseConfig({ Card: tagsConfig });
			const transform = createTransform(config);
			const result = asTag(transform(makeTag('article', { 'data-rune': 'card' }, [
				makeTag('meta', { 'data-field': 'tags', content: '  plan , , plugin ,runes ,' }),
				makeTag('div', { 'data-name': 'body' }, ['Body']),
			])));
			const zone = findByZone(result, 'tags')!;
			expect(zone.children.length).toBe(3);
			expect((zone.children as SerializedTag[]).map(c => c.children[0])).toEqual(['plan', 'plugin', 'runes']);
		});

		it('definition-list emits multi-value dd with one chip per item', () => {
			const config = baseConfig({ ...{ Card: { ...tagsConfig, zoneLayouts: { tags: 'definition-list' } } } });
			const transform = createTransform(config);
			const result = asTag(transform(makeTag('article', { 'data-rune': 'card' }, [
				makeTag('meta', { 'data-field': 'tags', content: 'a,b,c' }),
				makeTag('div', { 'data-name': 'body' }, ['Body']),
			])));
			const zone = findByZone(result, 'tags')!;
			const row = zone.children[0] as SerializedTag;
			const dd = row.children[1] as SerializedTag;
			expect(dd.name).toBe('dd');
			expect(dd.attributes['data-multi-value']).toBe('');
			expect(dd.children.length).toBe(3);
		});
	});

	describe('mutual-exclusion validation at mergeThemeConfig', () => {
		it('throws when a slot name appears in both zones and contentSlots', () => {
			const base: ThemeConfig = {
				prefix: 'rf', tokenPrefix: '--rf', icons: {},
				runes: {
					Conflicting: {
						block: 'card',
						zones: { eyebrow: { left: ['id'], right: [] } },
						contentSlots: { eyebrow: 'eyebrow' },
					},
				},
			};
			expect(() => mergeThemeConfig(base, {})).toThrow(/`Conflicting`.*`eyebrow`.*pick one source/);
		});

		it('does not throw when zones and contentSlots are disjoint', () => {
			const base: ThemeConfig = {
				prefix: 'rf', tokenPrefix: '--rf', icons: {},
				runes: {
					Card: {
						block: 'card',
						zones: { eyebrow: { left: ['id'], right: [] } },
						contentSlots: { body: 'body' },
					},
				},
			};
			expect(() => mergeThemeConfig(base, {})).not.toThrow();
		});

		it('null zone suppression frees the slot name for contentSlots', () => {
			const base: ThemeConfig = {
				prefix: 'rf', tokenPrefix: '--rf', icons: {},
				runes: {
					Card: {
						block: 'card',
						zones: { eyebrow: null },
						contentSlots: { eyebrow: 'eyebrow' },
					},
				},
			};
			expect(() => mergeThemeConfig(base, {})).not.toThrow();
		});
	});

	describe('zone overrides at merge time', () => {
		it('theme override replaces a specific zone wholesale', () => {
			const baseRune: RuneConfig = {
				block: 'work',
				zones: {
					eyebrow: { left: ['id'], right: ['status'] },
					metadata: { fields: ['priority'] },
				},
			};
			const base: ThemeConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: { Work: baseRune } };
			const merged = mergeThemeConfig(base, {
				runes: { Work: { zones: { metadata: { fields: ['priority', 'complexity'] } } } },
			});
			// eyebrow preserved
			const eyebrow = merged.runes.Work.zones!.eyebrow as { left: string[]; right: string[] };
			expect(eyebrow.left).toEqual(['id']);
			// metadata replaced
			const metadata = merged.runes.Work.zones!.metadata as { fields: string[] };
			expect(metadata.fields).toEqual(['priority', 'complexity']);
		});

		it('null zone in override suppresses inherited zone', () => {
			const baseRune: RuneConfig = {
				block: 'work',
				zones: { eyebrow: { left: ['id'], right: [] } },
			};
			const base: ThemeConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: { Work: baseRune } };
			const merged = mergeThemeConfig(base, {
				runes: { Work: { zones: { eyebrow: null } } },
			});
			expect(merged.runes.Work.zones!.eyebrow).toBeNull();
		});
	});
});
