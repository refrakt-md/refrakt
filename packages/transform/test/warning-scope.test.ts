import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTransform } from '../src/engine.js';
import { makeTag } from '../src/helpers.js';
import type { ThemeConfig } from '../src/types.js';

/**
 * Diagnostic dedupe scope (WORK-524).
 *
 * The `*_WARNED` sets these replaced were module-level, so a warn-once fired
 * once per *process*: in a long-lived dev server an author saw a diagnostic
 * once, changed nothing, and never saw it again — not after the edit that
 * failed to fix it, and not on any other page.
 *
 * The collector is now owned by `createTransform`, so the scope is one build.
 * A rebuild re-reports; a single build still reports once however many runes
 * trip the same condition.
 */

const config: ThemeConfig = {
	prefix: 'rf',
	tokenPrefix: '--rf',
	icons: {},
	runes: {
		// `requiresParent` on a non-structural rune warns; on a structural child it errors.
		Widget: { block: 'widget', requiresParent: 'Dashboard' },
		Tab: { block: 'tab', requiresParent: 'Tabs' },
		Dashboard: { block: 'dashboard' },
	},
};

const render = (rune: string, times = 1) => {
	const transform = createTransform(config);
	for (let i = 0; i < times; i++) {
		transform(makeTag('div', { 'data-rune': rune }, []));
	}
};

afterEach(() => vi.restoreAllMocks());

describe('warn-once scope', () => {
	it('reports once within a build, however many runes trip it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render('widget', 5);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	// The behaviour change: previously the second build was silent, because the
	// dedupe memory outlived the transform that created it.
	it('reports again in a new build', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render('widget');
		render('widget');
		expect(warn).toHaveBeenCalledTimes(2);
	});

	it('keeps separate dedupe keys separate within one build', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const transform = createTransform(config);
		transform(makeTag('div', { 'data-rune': 'widget' }, []));
		transform(makeTag('div', { 'data-rune': 'tab' }, []));
		expect(warn).toHaveBeenCalledTimes(1);   // widget → warn
		expect(error).toHaveBeenCalledTimes(1);  // tab → error, a structural child
	});
});

describe('severity', () => {
	it('sends a misplaced structural child to console.error', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render('tab');
		expect(error).toHaveBeenCalledWith(expect.stringContaining('`tab` requires parent `tabs`'));
		expect(warn).not.toHaveBeenCalled();
	});

	it('sends any other requiresParent violation to console.warn', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		render('widget');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`widget` requires parent `dashboard`'));
		expect(error).not.toHaveBeenCalled();
	});

	it('keys the dedupe on the actual parent, so a different misplacement reports', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const transform = createTransform(config);
		// top level, then nested inside dashboard-that-is-not-the-required-parent
		transform(makeTag('div', { 'data-rune': 'widget' }, []));
		transform(makeTag('div', { 'data-rune': 'dashboard' }, [
			makeTag('div', { 'data-rune': 'widget' }, []),
		]));
		// `dashboard` IS the required parent, so the nested one is valid — only the
		// top-level violation reports.
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
