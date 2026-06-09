import { describe, it, expect, vi } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';
import type { SerializedTag } from '@refrakt-md/types';

const asTag = (n: any): SerializedTag => n as SerializedTag;
const meta = (f: string, c: string) => makeTag('meta', { 'data-field': f, content: c }, []);
const config: ThemeConfig = { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes: { Hero: { block: 'hero' } } };

function find(node: any, name: string): SerializedTag | undefined {
	if (node?.attributes?.['data-name'] === name) return node;
	for (const c of node?.children ?? []) { const f = find(c, name); if (f) return f; }
	return undefined;
}

describe('SPEC-088 overlay vocabulary', () => {
	it('dark/light → data-bg-overlay flag', () => {
		const t = createTransform(config);
		const o = find(asTag(t(makeTag('section', { 'data-rune': 'hero' }, [meta('bg-overlay', 'dark')]))), 'bg-overlay')!;
		expect(o.attributes['data-bg-overlay']).toBe('dark');
	});

	it('a token reference → background var(--rf-color-*) wash with opacity', () => {
		const t = createTransform(config);
		const o = find(asTag(t(makeTag('section', { 'data-rune': 'hero' }, [meta('bg-overlay', 'primary'), meta('bg-overlay-opacity', '0.4')]))), 'bg-overlay')!;
		expect(o.attributes.style).toContain('background: var(--rf-color-primary)');
		expect(o.attributes.style).toContain('opacity: 0.4');
	});

	it('raw CSS still applies but warns (deprecated)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const t = createTransform(config);
		const o = find(asTag(t(makeTag('section', { 'data-rune': 'hero' }, [meta('bg-overlay', 'rgba(0,0,0,0.3)')]))), 'bg-overlay')!;
		expect(o.attributes.style).toContain('background: rgba(0,0,0,0.3)');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
		warn.mockRestore();
	});
});

describe('SPEC-088 scrim', () => {
	it('gradient scrim emits the contract + strength, standalone (no bg image)', () => {
		const t = createTransform(config);
		const s = find(asTag(t(makeTag('section', { 'data-rune': 'hero' }, [meta('scrim', 'bottom'), meta('scrim-strength', 'lg')]))), 'scrim')!;
		expect(s.attributes['data-scrim']).toBe('gradient');
		expect(s.attributes['data-scrim-tone']).toBe('dark');
		expect(s.attributes['data-scrim-dir']).toBe('bottom');
		expect(s.attributes.style).toContain('--scrim-strength: 0.8');
	});

	it('frost scrim emits blur + tone', () => {
		const t = createTransform(config);
		const s = find(asTag(t(makeTag('section', { 'data-rune': 'hero' }, [meta('scrim', 'top'), meta('scrim-type', 'frost'), meta('scrim-tone', 'light'), meta('scrim-blur', 'lg')]))), 'scrim')!;
		expect(s.attributes['data-scrim']).toBe('frost');
		expect(s.attributes['data-scrim-tone']).toBe('light');
		expect(s.attributes.style).toContain('--scrim-blur: 16px');
	});

	it('consumes scrim metas', () => {
		const t = createTransform(config);
		const r = asTag(t(makeTag('section', { 'data-rune': 'hero' }, [meta('scrim', 'bottom')])));
		const leaked = (r.children as any[]).some((c) => c?.name === 'meta' && c.attributes?.['data-field'] === 'scrim');
		expect(leaked).toBe(false);
	});
});
