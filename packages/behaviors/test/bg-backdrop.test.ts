/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RfSandbox } from '../src/elements/sandbox.js';
import { initRuneBehaviors, registerBehaviors } from '../src/index.js';

beforeEach(() => {
	document.body.innerHTML = '';
	if (!customElements.get('rf-sandbox')) customElements.define('rf-sandbox', RfSandbox);
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>).matchMedia;
	delete (globalThis as Record<string, unknown>).IntersectionObserver;
	vi.restoreAllMocks();
});

type IOCb = (entries: Array<{ isIntersecting: boolean }>) => void;
let ioCb: IOCb | undefined;
function stubIO(): void {
	ioCb = undefined;
	(globalThis as Record<string, unknown>).IntersectionObserver = class {
		constructor(cb: IOCb) { ioCb = cb; }
		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() { return []; }
	};
}
const setReduce = (m: boolean) => {
	(globalThis as Record<string, unknown>).matchMedia = () => ({ matches: m });
};

function mountBackdrop(): HTMLElement {
	const el = document.createElement('rf-sandbox');
	el.setAttribute('data-source-content', '<p>scene</p>');
	el.setAttribute('data-bg-guest', '');
	el.setAttribute('data-guest-posture', 'backdrop');
	el.setAttribute('data-height', 'fill');
	el.setAttribute('data-activation', 'eager');
	document.body.appendChild(el);
	return el;
}

// SPEC-104 / WORK-428 §7 — a bg-layer backdrop sandbox: never mounts under
// reduced motion (boot frame stands in), mounts on-screen, suspends off-screen.
describe('bg backdrop sandbox (SPEC-104 §7)', () => {
	it('does NOT mount under prefers-reduced-motion (boot frame stands in)', () => {
		setReduce(true);
		stubIO();
		const el = mountBackdrop();
		expect(el.querySelector('iframe')).toBeNull();
	});

	it('mounts when scrolled on-screen, suspends (tears the iframe down) off-screen', () => {
		setReduce(false);
		stubIO();
		const el = mountBackdrop();
		// Not mounted until the observer reports it on-screen.
		expect(el.querySelector('iframe')).toBeNull();

		ioCb!([{ isIntersecting: true }]);
		expect(el.querySelector('iframe')).toBeTruthy();

		ioCb!([{ isIntersecting: false }]);
		expect(el.querySelector('iframe')).toBeNull();

		// …and re-mounts when it returns to view.
		ioCb!([{ isIntersecting: true }]);
		expect(el.querySelector('iframe')).toBeTruthy();
	});

	it('mounts immediately where IntersectionObserver is unavailable (motion allowed)', () => {
		setReduce(false);
		const el = mountBackdrop();
		expect(el.querySelector('iframe')).toBeTruthy();
	});
});

// The posture distinction at the enhancement layer: a `presentational` guest is
// skipped by initRuneBehaviors; a `backdrop` guest is NOT (it must run).
describe('backdrop vs presentational enhancement (SPEC-104 §2)', () => {
	function rune(posture: string): HTMLElement {
		const wrap = document.createElement('div');
		wrap.setAttribute('data-guest-posture', posture);
		const el = document.createElement('div');
		el.setAttribute('data-rune', 'spec104-probe');
		wrap.appendChild(el);
		document.body.appendChild(wrap);
		return el;
	}

	it('enhances a backdrop guest but skips a presentational one', () => {
		const enhanced: string[] = [];
		registerBehaviors({ 'spec104-probe': (el) => { enhanced.push(el.parentElement!.getAttribute('data-guest-posture')!); return () => {}; } });

		rune('presentational');
		rune('backdrop');
		initRuneBehaviors(document);

		expect(enhanced).toContain('backdrop');
		expect(enhanced).not.toContain('presentational');
	});
});
