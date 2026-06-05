import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';

function cfg(runes: ThemeConfig['runes']): ThemeConfig {
	return { prefix: 'rf', tokenPrefix: '--rf', icons: {}, runes };
}
const rune = (name: string, children: any[] = []) =>
	makeTag('div', { 'data-rune': name }, children);

describe('requiresParent validation (WORK-337 / SPEC-084)', () => {
	let warn: ReturnType<typeof vi.spyOn>;
	let error: ReturnType<typeof vi.spyOn>;
	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		error = vi.spyOn(console, 'error').mockImplementation(() => {});
	});
	afterEach(() => { warn.mockRestore(); error.mockRestore(); });

	it('a child nested inside its required parent is not flagged', () => {
		const t = createTransform(cfg({
			WidgetA: { block: 'widget-a' },
			WidgetAItem: { block: 'widget-a-item', requiresParent: 'WidgetA' },
		}));
		t(rune('widget-a', [rune('widget-a-item')]));
		expect(error).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});

	it('a structurally-meaningless child stranded is an ERROR', () => {
		const t = createTransform(cfg({
			TabGroup: { block: 'tab-group' },
			Tab: { block: 'tab', requiresParent: 'TabGroup' },
		}));
		t(rune('tab')); // top-level — wrong
		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0][0]).toContain('`tab` requires parent `tab-group`');
	});

	it('a non-structural child stranded is a WARNING', () => {
		const t = createTransform(cfg({
			Holder: { block: 'holder' },
			SoftChild: { block: 'soft-child', requiresParent: 'Holder' },
		}));
		t(rune('soft-child'));
		expect(warn).toHaveBeenCalledTimes(1);
		expect(error).not.toHaveBeenCalled();
	});

	it('a third-party-style child requiring a known parent works when nested', () => {
		const t = createTransform(cfg({
			Map: { block: 'map' },
			ThirdPartyPin: { block: 'third-party-pin', requiresParent: 'Map' },
		}));
		t(rune('map', [rune('third-party-pin')]));
		expect(error).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});

	it('an unconstrained rune nested freely is never flagged', () => {
		const t = createTransform(cfg({
			Hint: { block: 'hint' },
		}));
		t(rune('hint'));
		expect(error).not.toHaveBeenCalled();
		expect(warn).not.toHaveBeenCalled();
	});
});
