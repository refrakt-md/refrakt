import { describe, it, expect } from 'vitest';
import { generateStructureContract } from '../src/contracts.js';
import type { ThemeConfig } from '../src/types.js';

function baseConfig(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

describe('contracts: slots', () => {
	it('includes slots in contract', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['eyebrow', 'header', 'content', 'footer'],
				structure: {
					eyebrow: { tag: 'div', slot: 'eyebrow' },
					header: { tag: 'div', slot: 'header' },
					footer: { tag: 'div', slot: 'footer' },
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Card.slots).toEqual(['eyebrow', 'header', 'content', 'footer']);
	});

	it('childOrder reflects slot ordering', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content', 'footer'],
				structure: {
					header: { tag: 'div', slot: 'header' },
					footer: { tag: 'div', slot: 'footer' },
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Card.childOrder).toEqual(['header', '{content}', 'footer']);
	});

	it('childOrder with contentWrapper in slots', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				slots: ['header', 'content'],
				contentWrapper: { tag: 'div', ref: 'body' },
				structure: {
					header: { tag: 'div', slot: 'header' },
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Card.childOrder).toEqual(['header', '{content:body}']);
	});
});

describe('contracts: childDensity', () => {
	it('includes childDensity in contract', () => {
		const config = baseConfig({
			Grid: { block: 'grid', childDensity: 'compact' },
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Grid.childDensity).toBe('compact');
	});

	it('omits childDensity when not set', () => {
		const config = baseConfig({
			Card: { block: 'card' },
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Card.childDensity).toBeUndefined();
	});
});

describe('contracts: projection', () => {
	it('includes projection declarations', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: true },
				},
				projection: {
					hide: ['badge'],
					group: {
						chrome: { tag: 'div', members: ['icon'] },
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Hint.projection!.hide).toEqual(['badge']);
		expect(contract.runes.Hint.projection!.group!.chrome.members).toEqual(['icon']);
	});

	it('adds group wrapper to elements', () => {
		const config = baseConfig({
			Card: {
				block: 'card',
				structure: {
					icon: { tag: 'span', before: true },
				},
				projection: {
					group: {
						chrome: { tag: 'div', members: ['icon'] },
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Card.elements!.chrome).toBeDefined();
		expect(contract.runes.Card.elements!.chrome.selector).toBe('.rf-card__chrome');
		expect(contract.runes.Card.elements!.chrome.source).toBe('projection.group');
	});

	it('warns on invalid data-name references in hide', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				projection: {
					hide: ['nonexistent'],
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Test.warnings).toContain(
			'projection.hide references unknown data-name "nonexistent"'
		);
	});

	it('warns on invalid group member references', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				structure: {
					icon: { tag: 'span', before: true },
				},
				projection: {
					group: {
						chrome: { tag: 'div', members: ['icon', 'missing'] },
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Test.warnings).toContain(
			'projection.group "chrome" references unknown member "missing"'
		);
	});

	it('warns on invalid relocate target', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				structure: {
					icon: { tag: 'span', before: true },
				},
				projection: {
					relocate: {
						icon: { into: 'nonexistent' },
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Test.warnings).toContain(
			'projection.relocate target "nonexistent" is unknown'
		);
	});

	it('allows relocate into a valid slot name', () => {
		const config = baseConfig({
			Test: {
				block: 'test',
				slots: ['header', 'content'],
				structure: {
					icon: { tag: 'span', slot: 'content' },
				},
				projection: {
					relocate: {
						icon: { into: 'header' },
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Test.warnings).toBeUndefined();
	});
});

describe('contracts: valueMap', () => {
	it('includes valueMap and mapTarget in modifier contract', () => {
		const config = baseConfig({
			Beat: {
				block: 'beat',
				modifiers: {
					status: {
						source: 'meta',
						default: 'planned',
						valueMap: { complete: 'checked' },
						mapTarget: 'data-checked',
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Beat.modifiers!.status.valueMap).toEqual({ complete: 'checked' });
		expect(contract.runes.Beat.modifiers!.status.mapTarget).toBe('data-checked');
	});
});

describe('contracts: repeat', () => {
	it('collects repeat template elements', () => {
		const config = baseConfig({
			Rating: {
				block: 'rating',
				modifiers: {
					total: { source: 'meta', noBemClass: true, default: '5' },
				},
				structure: {
					stars: {
						tag: 'div',
						repeat: {
							count: 'total',
							element: { tag: 'span', ref: 'star' },
						},
					},
				},
			},
		});
		const contract = generateStructureContract(config);
		expect(contract.runes.Rating.elements!.star).toBeDefined();
		expect(contract.runes.Rating.elements!.star.selector).toBe('.rf-rating__star');
		expect(contract.runes.Rating.elements!.star.parent).toBe('stars');
	});
});
