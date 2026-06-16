import { describe, it, expect } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const config: ThemeConfig = {
	prefix: 'rf', tokenPrefix: '--rf', icons: {},
	runes: { Hero: { block: 'hero' } },
};

function asTag(node: any): SerializedTag {
	return node as SerializedTag;
}

function find(node: any, pred: (t: SerializedTag) => boolean): SerializedTag | undefined {
	if (!node || typeof node !== 'object') return undefined;
	if (node.$$mdtype === 'Tag' && pred(node)) return node;
	for (const child of node.children ?? []) {
		const f = find(child, pred);
		if (f) return f;
	}
	return undefined;
}

/** A host carrying a hoisted `data-bg-guest` sandbox (as the bg rune +
 *  injectBgMetasFrom produce it) plus ordinary content. */
function hostWithGuest(extraMeta: SerializedTag[] = []): SerializedTag {
	return makeTag('section', { 'data-rune': 'hero' }, [
		...extraMeta,
		makeTag('rf-sandbox', {
			'data-bg-guest': '', 'data-guest-posture': 'backdrop',
			'data-height': 'fill', 'data-activation': 'eager', 'data-framework': 'three',
		}, []),
		makeTag('h1', {}, ['Title']),
	]) as unknown as SerializedTag;
}

const meta = (field: string, content: string) =>
	makeTag('meta', { 'data-field': field, content }, []) as unknown as SerializedTag;

// SPEC-104 / WORK-428 — the engine relocates a `data-bg-guest` element into the
// bg layer (a sibling of the bg-video branch) and drops the flow copy.
describe('bg sandbox guest relocation (SPEC-104)', () => {
	it('raises the bg layer for a guest-only bg (no other bg facets)', () => {
		const result = asTag(createTransform(config)(hostWithGuest()));
		const bg = find(result, t => t.attributes?.['data-name'] === 'bg');
		expect(bg, 'a guest alone should raise the bg layer').toBeDefined();
		expect(result.attributes.class).toContain('hero--has-bg');
	});

	it('relocates the guest into the bg layer with its backdrop posture + fill height', () => {
		const result = asTag(createTransform(config)(hostWithGuest()));
		const bg = find(result, t => t.attributes?.['data-name'] === 'bg')!;
		const guest = find(bg, t => t.name === 'rf-sandbox');
		expect(guest, 'guest should live inside the bg layer').toBeDefined();
		expect(guest!.attributes['data-guest-posture']).toBe('backdrop');
		expect(guest!.attributes['data-height']).toBe('fill');
	});

	it('drops the flow copy — the guest is not also rendered in content', () => {
		const result = asTag(createTransform(config)(hostWithGuest()));
		const bg = find(result, t => t.attributes?.['data-name'] === 'bg')!;
		// The only rf-sandbox in the tree is the one inside the bg layer.
		const sandboxesOutsideBg = (result.children ?? []).filter(
			c => c !== bg && find(c, t => t.name === 'rf-sandbox'),
		);
		expect(sandboxesOutsideBg).toEqual([]);
	});

	it('layers the guest below an overlay/scrim (overlay appended after the guest)', () => {
		const result = asTag(createTransform(config)(hostWithGuest([meta('bg-overlay', 'dark')])));
		const bg = find(result, t => t.attributes?.['data-name'] === 'bg')!;
		const kids = (bg.children ?? []) as SerializedTag[];
		const guestIdx = kids.findIndex(c => c.name === 'rf-sandbox');
		const overlayIdx = kids.findIndex(c => c.attributes?.['data-name'] === 'bg-overlay');
		expect(guestIdx).toBeGreaterThanOrEqual(0);
		expect(overlayIdx).toBeGreaterThan(guestIdx);
	});

	it('composes with a gradient boot frame (--bg-image behind the guest)', () => {
		const result = asTag(createTransform(config)(hostWithGuest([
			meta('bg-gradient', 'to-b'), meta('bg-from', 'primary'), meta('bg-to', 'surface'),
		])));
		const bg = find(result, t => t.attributes?.['data-name'] === 'bg')!;
		expect(String(bg.attributes.style)).toContain('--bg-image');
		expect(find(bg, t => t.name === 'rf-sandbox')).toBeDefined();
	});
});
