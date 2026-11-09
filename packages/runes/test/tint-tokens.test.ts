import { describe, it, expect, vi } from 'vitest';
import { TINT_TOKENS as FACET_TOKENS } from '@refrakt-md/transform';
import { TINT_TOKENS } from '../src/tags/tint.js';
import { parse, findAllTags } from './helpers.js';

/** The `tint-*` fields an inline tint hands to its parent rune. */
function tintFields(body: string): Record<string, string> {
	const result = parse(`{% hint %}\n{% tint %}\n${body}\n{% /tint %}\nText.\n{% /hint %}`);
	const out: Record<string, string> = {};
	for (const meta of findAllTags(result, (t) => t.name === 'meta')) {
		const field = String(meta.attributes['data-field'] ?? '');
		if (field.startsWith('tint-')) out[field] = String(meta.attributes.content);
	}
	const hint = findAllTags(result, (t) => t.attributes['data-rune'] === 'hint')[0];
	const bag = hint?.attributes['data-rune-fields'];
	if (bag) {
		for (const [k, v] of Object.entries(typeof bag === 'string' ? JSON.parse(bag) : bag)) {
			if (k.startsWith('tint-')) out[k] = String(v);
		}
	}
	return out;
}

describe('inline tint tokens', () => {
	it('reads the same tokens the tint axis applies', () => {
		expect([...TINT_TOKENS]).toEqual([...FACET_TOKENS]);
	});

	it('passes every token through, light and dark', () => {
		const light = FACET_TOKENS.map((t) => `- ${t}: #${t.length}11111`).join('\n');
		const dark = FACET_TOKENS.map((t) => `- ${t}: #${t.length}22222`).join('\n');
		const fields = tintFields(`${light}\n\n## Dark\n\n${dark}`);
		for (const t of FACET_TOKENS) {
			expect(fields[`tint-${t}`], t).toBe(`#${t.length}11111`);
			expect(fields[`tint-dark-${t}`], t).toBe(`#${t.length}22222`);
		}
	});

	it('reads `background` as `bg`, with a warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(tintFields('- background: #fdf6e3')['tint-bg']).toBe('#fdf6e3');
		warn.mockRestore();
	});

	it('ignores a name the tint axis does not apply', () => {
		expect(tintFields('- accent: #ff0000')).not.toHaveProperty('tint-accent');
	});
});
