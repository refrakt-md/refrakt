/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRuneBehaviors, registerLayoutModeBehaviors, getLayoutModeBehaviorNames } from '../src/index.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('attribute-triggered layout-mode dispatch (SPEC-100)', () => {
	it('mounts a registered behavior on every [data-layout] host once, regardless of data-rune, with cleanup', () => {
		const cleanup = vi.fn();
		const mount = vi.fn(() => cleanup);
		registerLayoutModeBehaviors({ 'test-mode': mount });

		const c = document.createElement('div');
		c.innerHTML = `
			<section data-rune="gallery" data-layout="test-mode" id="a"></section>
			<section data-rune="feature" data-layout="test-mode" id="b"></section>
			<div data-layout="test-mode" id="c"></div>
			<section data-rune="gallery" data-layout="grid" id="d"></section>
		`;
		document.body.appendChild(c);

		const teardown = initRuneBehaviors(c);

		// Every `test-mode` host (gallery, feature, no-rune) mounts exactly once;
		// the `grid` host (no registered layout-mode behavior) does not.
		expect(mount).toHaveBeenCalledTimes(3);
		const ids = mount.mock.calls.map(([el]) => (el as HTMLElement).id).sort();
		expect(ids).toEqual(['a', 'b', 'c']);

		teardown();
		expect(cleanup).toHaveBeenCalledTimes(3);
	});

	it('exposes registered layout-mode names and is add-only', () => {
		const first = vi.fn(() => () => {});
		const second = vi.fn(() => () => {});
		registerLayoutModeBehaviors({ 'test-addonly': first });
		registerLayoutModeBehaviors({ 'test-addonly': second }); // must NOT overwrite

		expect(getLayoutModeBehaviorNames().has('test-addonly')).toBe(true);

		const c = document.createElement('div');
		c.innerHTML = `<div data-layout="test-addonly"></div>`;
		document.body.appendChild(c);
		initRuneBehaviors(c);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});
});
