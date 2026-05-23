/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { drawerBehavior, parseShortcut, __resetDrawerState } from '../src/behaviors/drawer.js';

// JSDOM doesn't implement `<dialog>.showModal()`; provide minimal stubs
// that flip the `open` attribute and fire the `close` event so behavior
// can be tested deterministically without polyfill surface.
function patchDialogPrototype() {
	const proto = HTMLDialogElement.prototype as unknown as {
		showModal: () => void;
		close: () => void;
	};
	if (!('__refraktPatched' in proto)) {
		proto.showModal = function (this: HTMLDialogElement) {
			this.setAttribute('open', '');
			(this as unknown as { open: boolean }).open = true;
		};
		proto.close = function (this: HTMLDialogElement) {
			this.removeAttribute('open');
			(this as unknown as { open: boolean }).open = false;
			this.dispatchEvent(new Event('close'));
		};
		Object.defineProperty(proto, '__refraktPatched', { value: true });
	}
}

beforeEach(() => {
	document.body.innerHTML = '';
	// Reset URL so location.hash is empty.
	window.history.replaceState(null, '', '/');
	patchDialogPrototype();
	__resetDrawerState();
});

function createDrawerSection(opts: {
	id: string;
	title?: string;
	side?: string;
	size?: string;
	shortcut?: string;
}): HTMLElement {
	const section = document.createElement('section');
	section.id = `drawer-${opts.id}`;
	section.className = 'rf-drawer';
	section.setAttribute('data-rune', 'drawer');
	section.setAttribute('data-drawer-id', opts.id);
	if (opts.side) section.setAttribute('data-side', opts.side);
	if (opts.size) section.setAttribute('data-size', opts.size);
	if (opts.shortcut) section.setAttribute('data-shortcut', opts.shortcut);

	const header = document.createElement('header');
	header.className = 'rf-drawer__header';
	if (opts.title) {
		const h = document.createElement('h3');
		h.className = 'rf-drawer__title';
		h.textContent = opts.title;
		header.appendChild(h);
	}
	const close = document.createElement('button');
	close.className = 'rf-drawer__close';
	close.type = 'button';
	close.setAttribute('aria-label', 'Close');
	close.hidden = true;
	close.textContent = '×';
	header.appendChild(close);
	section.appendChild(header);

	const body = document.createElement('div');
	body.className = 'rf-drawer__body';
	body.textContent = 'Body content';
	section.appendChild(body);

	document.body.appendChild(section);
	return section;
}

function createTrigger(drawerId: string, opts?: { href?: string }): HTMLAnchorElement {
	const a = document.createElement('a');
	a.href = opts?.href ?? `#drawer-${drawerId}`;
	a.setAttribute('data-target-type', 'drawer');
	a.setAttribute('data-xref-id', drawerId);
	a.textContent = 'trigger';
	document.body.appendChild(a);
	return a;
}

describe('drawerBehavior', () => {
	describe('enhancement', () => {
		it('replaces the <section> with a <dialog> preserving attributes and children', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth', side: 'right', size: 'md' });
			drawerBehavior(section);

			expect(document.querySelector('section.rf-drawer')).toBeNull();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog).not.toBeNull();
			expect(dialog.id).toBe('drawer-auth');
			expect(dialog.getAttribute('data-rune')).toBe('drawer');
			expect(dialog.getAttribute('data-side')).toBe('right');
			expect(dialog.querySelector('.rf-drawer__title')?.textContent).toBe('Auth');
			expect(dialog.querySelector('.rf-drawer__body')?.textContent).toBe('Body content');
		});

		it('reveals the close button on enhancement', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			drawerBehavior(section);
			const close = document.querySelector('.rf-drawer__close') as HTMLButtonElement;
			expect(close.hidden).toBe(false);
		});

		it('sets data-state="closed" on the enhanced dialog', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			drawerBehavior(section);
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.getAttribute('data-state')).toBe('closed');
		});
	});

	describe('trigger interception', () => {
		it('opens the dialog when a matching trigger is clicked', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth');
			drawerBehavior(section);
			trigger.click();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(true);
			expect(dialog.getAttribute('data-state')).toBe('open');
		});

		it('handles triggers with absolute hrefs that end in the matching fragment', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth', { href: '/page/path#drawer-auth' });
			drawerBehavior(section);
			trigger.click();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(true);
		});

		it('ignores triggers without matching href fragments', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('something-else', { href: '#drawer-something-else' });
			drawerBehavior(section);
			trigger.click();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(false);
		});
	});

	describe('close behavior', () => {
		it('closes the dialog when the close button is clicked', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth');
			drawerBehavior(section);
			trigger.click();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			const close = dialog.querySelector('.rf-drawer__close') as HTMLButtonElement;
			close.click();
			expect(dialog.open).toBe(false);
			expect(dialog.getAttribute('data-state')).toBe('closed');
		});

		it('closes the dialog on a backdrop click (target === dialog)', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth');
			drawerBehavior(section);
			trigger.click();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			expect(dialog.open).toBe(false);
		});
	});

	describe('hash sync', () => {
		it('updates location.hash via replaceState when the drawer opens', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth');
			drawerBehavior(section);
			trigger.click();
			expect(window.location.hash).toBe('#drawer-auth');
		});

		it('clears the hash when the drawer closes', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth');
			drawerBehavior(section);
			trigger.click();
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			(dialog.querySelector('.rf-drawer__close') as HTMLButtonElement).click();
			expect(window.location.hash).toBe('');
		});

		it('opens the drawer automatically when the page loads with a matching hash', async () => {
			window.history.replaceState(null, '', '/#drawer-auth');
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			drawerBehavior(section);
			await new Promise<void>((resolve) => queueMicrotask(resolve));
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(true);
		});
	});

	describe('keyboard shortcut', () => {
		it('opens the drawer when the configured shortcut is pressed', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth', shortcut: '.' });
			drawerBehavior(section);
			document.dispatchEvent(new KeyboardEvent('keydown', { key: '.' }));
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(true);
		});

		it('skips the shortcut when focus is in an input', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth', shortcut: '.' });
			drawerBehavior(section);
			const input = document.createElement('input');
			document.body.appendChild(input);
			input.focus();
			document.dispatchEvent(new KeyboardEvent('keydown', { key: '.' }));
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(false);
		});

		it('respects modifier prefixes (cmd+k)', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth', shortcut: 'cmd+k' });
			drawerBehavior(section);
			// Plain "k" should not match.
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
			let dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(false);
			// With metaKey it should.
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
			dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(true);
		});

		it('warns when two drawers register the same shortcut', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			drawerBehavior(createDrawerSection({ id: 'a', title: 'A', shortcut: '.' }));
			drawerBehavior(createDrawerSection({ id: 'b', title: 'B', shortcut: '.' }));
			expect(warn).toHaveBeenCalled();
			expect(warn.mock.calls[0]?.[0]).toContain('"."');
			warn.mockRestore();
		});
	});

	describe('multiple drawers', () => {
		it('closes the previously open drawer when another opens (single-modal)', () => {
			const a = createDrawerSection({ id: 'a', title: 'A' });
			const b = createDrawerSection({ id: 'b', title: 'B' });
			const triggerA = createTrigger('a');
			const triggerB = createTrigger('b');
			drawerBehavior(a);
			drawerBehavior(b);
			triggerA.click();
			triggerB.click();
			const dialogs = document.querySelectorAll('dialog.rf-drawer');
			expect((dialogs[0] as HTMLDialogElement).open).toBe(false);
			expect((dialogs[1] as HTMLDialogElement).open).toBe(true);
		});
	});

	describe('popstate (back button)', () => {
		it('closes an open drawer when popstate fires with a non-matching hash', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth' });
			const trigger = createTrigger('auth');
			drawerBehavior(section);
			trigger.click();
			// Simulate back-button: hash changes to something else.
			window.history.replaceState(null, '', '/');
			window.dispatchEvent(new PopStateEvent('popstate'));
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(false);
		});
	});

	describe('cleanup', () => {
		it('removes the drawer from the registry on cleanup', () => {
			const section = createDrawerSection({ id: 'auth', title: 'Auth', shortcut: 'k' });
			const cleanup = drawerBehavior(section);
			cleanup?.();
			// After cleanup, the shortcut no longer opens the drawer.
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
			const dialog = document.querySelector('dialog.rf-drawer') as HTMLDialogElement;
			expect(dialog.open).toBe(false);
		});
	});
});

describe('parseShortcut', () => {
	it('parses bare key', () => {
		expect(parseShortcut('.')).toMatchObject({ key: '.', cmd: false, ctrl: false, alt: false, shift: false });
	});

	it('parses cmd+k', () => {
		expect(parseShortcut('cmd+k')).toMatchObject({ key: 'k', cmd: true });
	});

	it('parses ctrl+shift+/', () => {
		expect(parseShortcut('ctrl+shift+/')).toMatchObject({ key: '/', ctrl: true, shift: true });
	});

	it('normalizes case', () => {
		expect(parseShortcut('CMD+K')).toMatchObject({ key: 'k', cmd: true });
	});

	it('returns null for empty input', () => {
		expect(parseShortcut('')).toBeNull();
	});
});
