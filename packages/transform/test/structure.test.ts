import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function baseConfig(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}

// The legacy `slots + structure` shim was removed in WORK-313. The
// `structure`-only before/after assembly survives for non-meta-projecting
// runes that just inject icons or badges around the content.
describe('structure before/after assembly', () => {
	it('injects before-entries ahead of content and after-entries behind it', () => {
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					icon: { tag: 'span', before: true },
					badge: { tag: 'span', before: false },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, ['Content']);

		const result = asTag(transform(tag));
		const iconIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'icon');
		const textIdx = result.children.findIndex((c: any) => c === 'Content');
		const badgeIdx = result.children.findIndex((c: any) => c?.attributes?.['data-name'] === 'badge');

		expect(iconIdx).toBeLessThan(textIdx);
		expect(textIdx).toBeLessThan(badgeIdx);
	});

	it('does not add a universal .rf-badge class to meta-typed structure entries', () => {
		// WORK-313: runes that emit meta-typed structure entries directly are
		// responsible for picking their own class — the engine no longer
		// auto-applies `.rf-badge`.
		const config = baseConfig({
			Hint: {
				block: 'hint',
				structure: {
					status: { tag: 'span', before: true, metaType: 'status' },
				},
			},
		});
		const transform = createTransform(config);
		const tag = makeTag('section', { 'data-rune': 'hint' }, ['Content']);

		const result = asTag(transform(tag));
		const status = result.children.find((c: any) => c?.attributes?.['data-name'] === 'status') as SerializedTag;
		expect(status).toBeDefined();
		expect(status.attributes['data-meta-type']).toBe('status');
		expect(status.attributes.class ?? '').not.toContain('rf-badge');
	});
});
