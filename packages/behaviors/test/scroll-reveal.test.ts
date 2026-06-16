/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scrollRevealBehavior } from '../src/behaviors/scroll-reveal.js';

type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>, obs: any) => void;

let ioCallback: IOCallback | undefined;
let observed: Element[];
let unobserved: Element[];
let disconnected: boolean;

/** Install a controllable IntersectionObserver stub (jsdom has none). */
function stubIO(): void {
	observed = [];
	unobserved = [];
	disconnected = false;
	(globalThis as Record<string, unknown>).IntersectionObserver = class {
		constructor(cb: IOCallback) { ioCallback = cb; }
		observe = (el: Element) => { observed.push(el); };
		unobserve = (el: Element) => { unobserved.push(el); };
		disconnect = () => { disconnected = true; };
		takeRecords() { return []; }
	};
}

function setReducedMotion(reduce: boolean): void {
	(globalThis as Record<string, unknown>).matchMedia = (q: string) => ({ matches: reduce, media: q });
}

beforeEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('data-animate');
	ioCallback = undefined;
	stubIO();
	setReducedMotion(false);
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>).IntersectionObserver;
	delete (globalThis as Record<string, unknown>).matchMedia;
	vi.restoreAllMocks();
});

function reveal(value = 'fade'): HTMLElement {
	const el = document.createElement('section');
	el.setAttribute('data-rune', 'feature');
	el.setAttribute('data-reveal', value);
	document.body.appendChild(el);
	return el;
}

describe('scroll-reveal behaviour (SPEC-105)', () => {
	it('sets the root data-animate gate on boot', () => {
		reveal();
		scrollRevealBehavior(document);
		expect(document.documentElement.hasAttribute('data-animate')).toBe(true);
	});

	it('does nothing (no gate) when there are no reveal containers', () => {
		scrollRevealBehavior(document);
		expect(document.documentElement.hasAttribute('data-animate')).toBe(false);
	});

	it('ignores reveal="none" opt-outs', () => {
		reveal('none');
		scrollRevealBehavior(document);
		expect(document.documentElement.hasAttribute('data-animate')).toBe(false);
		expect(observed).toEqual([]);
	});

	it('observes each container, reveals on first intersection, then unobserves', () => {
		const a = reveal();
		const b = reveal('slide');
		scrollRevealBehavior(document);

		expect(observed).toEqual([a, b]);
		expect(a.hasAttribute('data-in-view')).toBe(false);

		// `a` scrolls into view.
		ioCallback!([{ isIntersecting: true, target: a }], { unobserve: (el: Element) => unobserved.push(el) });
		expect(a.getAttribute('data-in-view')).toBe('');
		expect(unobserved).toContain(a);
		// `b` not yet intersecting → still hidden, still observed.
		expect(b.hasAttribute('data-in-view')).toBe(false);
		expect(unobserved).not.toContain(b);
	});

	it('does not reveal on a non-intersecting entry', () => {
		const a = reveal();
		scrollRevealBehavior(document);
		ioCallback!([{ isIntersecting: false, target: a }], { unobserve: (el: Element) => unobserved.push(el) });
		expect(a.hasAttribute('data-in-view')).toBe(false);
	});

	it('under prefers-reduced-motion marks everything in-view immediately (no observer)', () => {
		setReducedMotion(true);
		const a = reveal();
		const b = reveal('scale');
		scrollRevealBehavior(document);

		expect(a.getAttribute('data-in-view')).toBe('');
		expect(b.getAttribute('data-in-view')).toBe('');
		// No IntersectionObserver wired in the reduced-motion path.
		expect(observed).toEqual([]);
		// The gate is still set so the final (visible) state is identical.
		expect(document.documentElement.hasAttribute('data-animate')).toBe(true);
	});

	it('reveals everything immediately when IntersectionObserver is unavailable', () => {
		delete (globalThis as Record<string, unknown>).IntersectionObserver;
		const a = reveal();
		scrollRevealBehavior(document);
		expect(a.getAttribute('data-in-view')).toBe('');
	});

	it('cleanup disconnects the observer', () => {
		reveal();
		const cleanup = scrollRevealBehavior(document);
		cleanup();
		expect(disconnected).toBe(true);
	});

	it('SSR/no-JS guarantee: without the behaviour, nothing is hidden (no gate, no data-in-view)', () => {
		// Simulate the served DOM before enhancement runs.
		const el = reveal();
		expect(document.documentElement.hasAttribute('data-animate')).toBe(false);
		expect(el.hasAttribute('data-in-view')).toBe(false);
		// The pre-entrance CSS is scoped under [data-animate]; with no gate the
		// element renders in its natural (fully-visible) state.
	});
});
