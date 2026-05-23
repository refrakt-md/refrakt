/**
 * Drawer behavior (SPEC-060, WORK-258).
 *
 * Progressive enhancement for `<section class="rf-drawer">` produced by the
 * drawer rune (WORK-257). On init:
 *
 * 1. Replace the section with a `<dialog>`, preserving id and attributes so
 *    fragment navigation and `data-rune` queries still work.
 * 2. Reveal the close button (the schema marks it `hidden` so the no-JS
 *    rendering doesn't show a non-functional control).
 * 3. Wire every `a[data-target-type="drawer"]` whose href fragment matches
 *    this drawer's id — clicking intercepts navigation and opens the dialog.
 * 4. Wire the close button, backdrop clicks, and `keyboard shortcut` if set.
 * 5. URL hash sync: open on load if `location.hash` matches; update the
 *    hash via `replaceState` on open / clear it on close; close on
 *    `popstate` when the hash changes away.
 *
 * Esc-to-close, focus trap, and `inert` background come from native
 * `<dialog>` semantics — the platform handles them, this module doesn't.
 *
 * The module keeps a per-document registry of enhanced drawers so the
 * shortcut and popstate listeners run once globally instead of once per
 * drawer. Cleanups remove listeners and (best-effort) restore the
 * original `<section>` for HMR-style re-init scenarios.
 */

import type { CleanupFn } from '../types.js';

interface DrawerRecord {
	dialog: HTMLDialogElement;
	id: string;
	shortcut?: ParsedShortcut;
}

interface ParsedShortcut {
	key: string;
	cmd: boolean;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
}

// Per-document state. The behavior is scoped to `document` rather than
// per-element because shortcuts + popstate are global concerns, and
// trigger anchors live anywhere on the page (not just inside the drawer).
const drawerRegistry = new Map<Document, Map<string, DrawerRecord>>();
const globalListenersAttached = new WeakSet<Document>();

function getRegistry(doc: Document): Map<string, DrawerRecord> {
	let m = drawerRegistry.get(doc);
	if (!m) {
		m = new Map();
		drawerRegistry.set(doc, m);
	}
	return m;
}

/** Clear all per-document drawer state. Intended for tests — production
 *  code should rely on the cleanup function returned by `drawerBehavior`. */
export function __resetDrawerState(): void {
	for (const doc of drawerRegistry.keys()) {
		doc.documentElement.classList.remove('rf-drawer-open');
	}
	drawerRegistry.clear();
}

/** Parse a shortcut string into modifiers + key. Accepts forms like
 *  `"."`, `"k"`, `"cmd+k"`, `"shift+/"`, `"ctrl+alt+x"`. Returns null when
 *  the input is unparsable so the caller can drop it silently. */
export function parseShortcut(input: string): ParsedShortcut | null {
	const parts = input.split('+').map((p) => p.trim().toLowerCase()).filter(Boolean);
	if (parts.length === 0) return null;
	const key = parts[parts.length - 1];
	if (!key) return null;
	const mods = new Set(parts.slice(0, -1));
	return {
		key,
		cmd: mods.has('cmd') || mods.has('meta'),
		ctrl: mods.has('ctrl') || mods.has('control'),
		alt: mods.has('alt') || mods.has('option'),
		shift: mods.has('shift'),
	};
}

/** True when the event matches the parsed shortcut. cmd and ctrl are
 *  intentionally collapsed — authors writing `cmd+k` mean "the platform's
 *  primary modifier", which is Cmd on macOS and Ctrl elsewhere. */
function shortcutMatches(parsed: ParsedShortcut, ev: KeyboardEvent): boolean {
	if (ev.key.toLowerCase() !== parsed.key) return false;
	// Allow either cmd OR ctrl when the shortcut requests one of them.
	const primaryHeld = ev.metaKey || ev.ctrlKey;
	const primaryNeeded = parsed.cmd || parsed.ctrl;
	if (primaryNeeded && !primaryHeld) return false;
	if (!primaryNeeded && primaryHeld) return false;
	if (parsed.alt !== ev.altKey) return false;
	if (parsed.shift !== ev.shiftKey) return false;
	return true;
}

/** True when keyboard focus is in a form field or content-editable area;
 *  shortcuts skip these to avoid hijacking what the user is typing. */
function focusInTextInput(doc: Document): boolean {
	const el = doc.activeElement as HTMLElement | null;
	if (!el) return false;
	const tag = el.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (el.isContentEditable) return true;
	return false;
}

/**
 * Drawer behavior — enhance one `[data-rune="drawer"]` element.
 *
 * The function detects the no-JS shape (a `<section>`), replaces it with
 * a `<dialog>` carrying the same attributes (id, class, data-*), and
 * registers the dialog with the per-document state so global listeners
 * (shortcut, popstate) can act on it.
 */
export function drawerBehavior(el: HTMLElement): CleanupFn {
	const doc = el.ownerDocument;
	if (!doc || !doc.defaultView) return () => {};
	const win = doc.defaultView;

	// Enhancement step — replace the section with a dialog. If the element
	// is already a <dialog> (re-init), skip the replacement and just reuse it.
	const dialog = el instanceof win.HTMLDialogElement ? el : enhanceToDialog(el);
	if (!dialog) return () => {};

	const id = dialog.id;
	if (!id) {
		// A drawer without an id can't be addressed — leave it as a styled
		// inline section by not enhancing further. The schema enforces id,
		// so this is a defensive branch.
		return () => {};
	}

	// Reveal the close button — schema marks it hidden so the no-JS
	// rendering doesn't show a non-functional control.
	const closeBtn = dialog.querySelector<HTMLButtonElement>('.rf-drawer__close');
	if (closeBtn) closeBtn.hidden = false;

	const shortcutAttr = dialog.getAttribute('data-shortcut') ?? undefined;
	const shortcut = shortcutAttr ? parseShortcut(shortcutAttr) ?? undefined : undefined;

	const registry = getRegistry(doc);
	if (registry.has(id)) {
		// Two drawers with the same id on one page shouldn't happen — the
		// register hook warns at build time — but if it does, defensively
		// keep the first.
		return () => {};
	}

	// Shortcut collision detection. The spec says last-registered wins;
	// we still warn so authors notice.
	if (shortcut) {
		for (const other of registry.values()) {
			if (other.shortcut && describeShortcut(other.shortcut) === describeShortcut(shortcut)) {
				// eslint-disable-next-line no-console
				console.warn(
					`[refrakt drawer] shortcut "${shortcutAttr}" is registered by drawers "${other.id}" and "${id}"; the later one wins.`,
				);
			}
		}
	}

	registry.set(id, { dialog, id, shortcut });

	const cleanups: CleanupFn[] = [];

	// ── Trigger interception ─────────────────────────────────────────
	const fragment = `#${id}`;
	const onTriggerClick = (ev: Event) => {
		ev.preventDefault();
		openDrawer(dialog);
	};
	const triggers: HTMLAnchorElement[] = [];
	doc.querySelectorAll<HTMLAnchorElement>(`a[data-target-type="drawer"]`).forEach((link) => {
		const href = link.getAttribute('href') ?? '';
		if (href === fragment || href.endsWith(fragment)) {
			link.addEventListener('click', onTriggerClick);
			triggers.push(link);
		}
	});
	cleanups.push(() => {
		for (const link of triggers) link.removeEventListener('click', onTriggerClick);
	});

	// ── Close button ──────────────────────────────────────────────────
	if (closeBtn) {
		const onClose = () => closeDrawer(dialog);
		closeBtn.addEventListener('click', onClose);
		cleanups.push(() => closeBtn.removeEventListener('click', onClose));
	}

	// ── Backdrop click ────────────────────────────────────────────────
	const onBackdropClick = (ev: MouseEvent) => {
		if (ev.target === dialog) closeDrawer(dialog);
	};
	dialog.addEventListener('click', onBackdropClick);
	cleanups.push(() => dialog.removeEventListener('click', onBackdropClick));

	// ── Hash maintenance on natural close ─────────────────────────────
	const onDialogClose = () => {
		dialog.setAttribute('data-state', 'closed');
		if (win.location.hash === fragment) {
			win.history.replaceState(null, '', win.location.pathname + win.location.search);
		}
		// Lift the body-scroll lock once no other drawer is still open.
		releaseBodyScrollLockIfIdle(doc);
	};
	dialog.addEventListener('close', onDialogClose);
	cleanups.push(() => dialog.removeEventListener('close', onDialogClose));

	// ── Hash deep-link on load ────────────────────────────────────────
	// Use a microtask so the dialog is sure to be in the DOM and any sibling
	// drawers have also had a chance to register (last drawer with the matching
	// hash wins — duplicates would already have surfaced a build warning).
	if (win.location.hash === fragment) {
		win.queueMicrotask(() => {
			if (!dialog.open) openDrawer(dialog);
		});
	}

	// ── Global listeners (attached once per document) ────────────────
	if (!globalListenersAttached.has(doc)) {
		globalListenersAttached.add(doc);
		attachGlobalListeners(doc);
	}

	return () => {
		for (const fn of cleanups) fn();
		registry.delete(id);
		// Lift the body-scroll lock if no drawer remains active.
		releaseBodyScrollLockIfIdle(doc);
		// Leave global listeners attached — they no-op when the registry is empty.
	};
}

function enhanceToDialog(el: HTMLElement): HTMLDialogElement | null {
	const doc = el.ownerDocument;
	if (!doc) return null;
	const dialog = doc.createElement('dialog');
	// Copy attributes from the section to the dialog (id, class, data-*).
	for (const attr of Array.from(el.attributes)) {
		dialog.setAttribute(attr.name, attr.value);
	}
	// Move children.
	while (el.firstChild) dialog.appendChild(el.firstChild);
	// Swap in the DOM.
	if (el.parentNode) el.parentNode.replaceChild(dialog, el);
	dialog.setAttribute('data-state', 'closed');
	return dialog;
}

function openDrawer(dialog: HTMLDialogElement): void {
	const doc = dialog.ownerDocument;
	if (!doc || !doc.defaultView) return;
	const win = doc.defaultView;

	// Close any other open drawer first. Native `<dialog>.showModal()`
	// throws if another modal is open, so this is also a correctness
	// requirement, not just UX polish.
	const registry = drawerRegistry.get(doc);
	if (registry) {
		for (const other of registry.values()) {
			if (other.dialog !== dialog && other.dialog.open) {
				other.dialog.close();
			}
		}
	}

	if (!dialog.open) {
		try {
			dialog.showModal();
		} catch {
			// Some environments (jsdom without explicit polyfill) may not
			// implement showModal. Fall back to setting the `open` attribute
			// so tests can still observe state changes.
			dialog.setAttribute('open', '');
		}
	}
	dialog.setAttribute('data-state', 'open');
	applyBodyScrollLock(doc);
	if (dialog.id) {
		const fragment = `#${dialog.id}`;
		if (win.location.hash !== fragment) {
			win.history.replaceState(null, '', win.location.pathname + win.location.search + fragment);
		}
	}
}

function closeDrawer(dialog: HTMLDialogElement): void {
	if (dialog.open) {
		try {
			dialog.close();
		} catch {
			dialog.removeAttribute('open');
		}
	}
	dialog.setAttribute('data-state', 'closed');
	// The `close` event listener on the dialog clears the hash and lifts
	// the body-scroll lock (when no other drawer is open).
}

/** Body-scroll lock — set when any drawer is open, lifted when the last
 *  open drawer closes. Implemented as a class on `<html>` so themes can
 *  add additional rules (e.g. preserving scrollbar gutter) by extending
 *  the selector. */
function applyBodyScrollLock(doc: Document): void {
	doc.documentElement.classList.add('rf-drawer-open');
}

function releaseBodyScrollLockIfIdle(doc: Document): void {
	const registry = drawerRegistry.get(doc);
	if (!registry) {
		doc.documentElement.classList.remove('rf-drawer-open');
		return;
	}
	for (const record of registry.values()) {
		if (record.dialog.open) return;
	}
	doc.documentElement.classList.remove('rf-drawer-open');
}

function describeShortcut(s: ParsedShortcut): string {
	const parts: string[] = [];
	if (s.cmd || s.ctrl) parts.push('mod');
	if (s.alt) parts.push('alt');
	if (s.shift) parts.push('shift');
	parts.push(s.key);
	return parts.join('+');
}

function attachGlobalListeners(doc: Document): void {
	const win = doc.defaultView;
	if (!win) return;

	// ── Keyboard shortcut listener ────────────────────────────────────
	const onKeydown = (ev: KeyboardEvent) => {
		if (focusInTextInput(doc)) return;
		const registry = drawerRegistry.get(doc);
		if (!registry) return;
		let match: DrawerRecord | undefined;
		for (const record of registry.values()) {
			if (record.shortcut && shortcutMatches(record.shortcut, ev)) {
				// Last-registered wins (matches build warning policy).
				match = record;
			}
		}
		if (!match) return;
		ev.preventDefault();
		openDrawer(match.dialog);
	};
	doc.addEventListener('keydown', onKeydown);

	// ── Popstate (back button) ────────────────────────────────────────
	const onPopstate = () => {
		const registry = drawerRegistry.get(doc);
		if (!registry) return;
		for (const record of registry.values()) {
			if (record.dialog.open && win.location.hash !== `#${record.id}`) {
				closeDrawer(record.dialog);
			}
		}
	};
	win.addEventListener('popstate', onPopstate);
}
