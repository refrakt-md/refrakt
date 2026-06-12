/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RfSandbox } from '../src/elements/sandbox.js';

beforeEach(() => {
	document.body.innerHTML = '';
	if (!customElements.get('rf-sandbox')) customElements.define('rf-sandbox', RfSandbox);
});

afterEach(() => {
	// Tests below install global stubs for matchMedia / IntersectionObserver
	// (absent in jsdom). Remove them so they can't leak between cases.
	delete (globalThis as Record<string, unknown>).matchMedia;
	delete (globalThis as Record<string, unknown>).IntersectionObserver;
});

function mount(attrs: Record<string, string>, content = '<p>hi</p>'): HTMLElement {
	const el = document.createElement('rf-sandbox');
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	el.setAttribute('data-source-content', content);
	document.body.appendChild(el);
	return el;
}

describe('rf-sandbox deferred activation (WORK-381)', () => {
	it('eager (default) mounts the iframe immediately — no poster', () => {
		const el = mount({});
		expect(el.querySelector('iframe')).toBeTruthy();
		expect(el.querySelector('.rf-sandbox__poster')).toBeNull();
	});

	it('click activation defers the iframe until the control is pressed', () => {
		const el = mount({ 'data-activation': 'click', 'data-poster': '/p.png', 'data-height': '300' });
		// No iframe (and therefore none of its dependency tags) before activation.
		expect(el.querySelector('iframe')).toBeNull();
		expect(el.querySelector('.rf-sandbox__poster-image')?.getAttribute('src')).toBe('/p.png');
		// Poster reserves the configured height (no layout shift on mount).
		expect((el.querySelector('.rf-sandbox__poster') as HTMLElement).style.height).toBe('300px');

		const btn = el.querySelector('.rf-sandbox__activate') as HTMLButtonElement;
		expect(btn).toBeTruthy();
		btn.click();

		expect(el.querySelector('iframe')).toBeTruthy();
		expect(el.querySelector('.rf-sandbox__poster')).toBeNull();
	});

	it('visible activation mounts when scrolled into view (motion allowed)', () => {
		let cb: ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined;
		const observe = vi.fn();
		const disconnect = vi.fn();
		(globalThis as Record<string, unknown>).IntersectionObserver = class {
			constructor(c: typeof cb) { cb = c; }
			observe = observe;
			disconnect = disconnect;
			unobserve() {}
			takeRecords() { return []; }
		};
		(globalThis as Record<string, unknown>).matchMedia = () => ({ matches: false });

		const el = mount({ 'data-activation': 'visible' });
		expect(el.querySelector('iframe')).toBeNull();
		expect(observe).toHaveBeenCalledWith(el);

		cb!([{ isIntersecting: true }]);
		expect(el.querySelector('iframe')).toBeTruthy();
		expect(disconnect).toHaveBeenCalled();
	});

	it('does not auto-activate under prefers-reduced-motion; the control is shown', () => {
		const observe = vi.fn();
		(globalThis as Record<string, unknown>).IntersectionObserver = class {
			observe = observe;
			disconnect() {}
			unobserve() {}
			takeRecords() { return []; }
		};
		(globalThis as Record<string, unknown>).matchMedia = () => ({ matches: true });

		const el = mount({ 'data-activation': 'visible', 'data-poster': '/p.png' });
		// Reduced motion: no observer wired, no iframe — visitor opts in via the control.
		expect(observe).not.toHaveBeenCalled();
		expect(el.querySelector('iframe')).toBeNull();
		const btn = el.querySelector('.rf-sandbox__activate') as HTMLButtonElement;
		expect(btn).toBeTruthy();

		btn.click();
		expect(el.querySelector('iframe')).toBeTruthy();
	});

	it('an unknown activation value falls back to eager', () => {
		const el = mount({ 'data-activation': 'whenever' });
		expect(el.querySelector('iframe')).toBeTruthy();
		expect(el.querySelector('.rf-sandbox__poster')).toBeNull();
	});
});

describe('rf-sandbox fill height mode (SPEC-101)', () => {
	it('fill pins the iframe to 100% height', () => {
		const el = mount({ 'data-height': 'fill' });
		const iframe = el.querySelector('iframe') as HTMLIFrameElement;
		expect(iframe).toBeTruthy();
		expect(iframe.style.height).toBe('100%');
	});

	it('fill ignores resize messages — the host owns the height', () => {
		const el = mount({ 'data-height': 'fill' });
		const iframe = el.querySelector('iframe') as HTMLIFrameElement;
		window.dispatchEvent(new MessageEvent('message', {
			data: { type: 'rf-sandbox-resize', height: 432 },
		}));
		expect(iframe.style.height).toBe('100%');
	});

	it('auto (default) starts at the 150px floor pending resize negotiation', () => {
		const el = mount({});
		const iframe = el.querySelector('iframe') as HTMLIFrameElement;
		expect(iframe.style.height).toBe('150px');
	});

	it('fill poster fills the host instead of the 150px floor', () => {
		const el = mount({ 'data-activation': 'click', 'data-height': 'fill' });
		const poster = el.querySelector('.rf-sandbox__poster') as HTMLElement;
		expect(poster.style.height).toBe('100%');
	});

	it('fixed numeric height is untouched by fill handling', () => {
		const el = mount({ 'data-height': '320' });
		const iframe = el.querySelector('iframe') as HTMLIFrameElement;
		expect(iframe.style.height).toBe('320px');
	});
});
