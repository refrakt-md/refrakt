import type { CleanupFn } from '../types.js';

/**
 * Pagefind search behavior for layouts.
 *
 * Discovers `[data-search-trigger]` buttons and wires up:
 * - Click to open a search dialog (native `<dialog>`)
 * - Cmd/Ctrl+K keyboard shortcut to toggle the dialog
 * - Lazy-loads Pagefind JS on first dialog open
 * - Debounced search with result rendering
 * - Arrow key navigation through results
 * - Escape closes the dialog (native `<dialog>` behavior)
 *
 * Gracefully handles missing Pagefind (dev mode, no index).
 */
export function searchBehavior(container: HTMLElement | Document): CleanupFn {
	const cleanups: Array<() => void> = [];
	const root = container instanceof Document ? container.documentElement : container;

	const triggers = root.querySelectorAll<HTMLElement>('[data-search-trigger]');
	if (triggers.length === 0) return () => {};

	// Platform detection for keyboard shortcut display
	const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? '');
	const shortcutLabel = isMac ? '\u2318K' : 'Ctrl+K';

	// Set shortcut text in trigger kbd elements
	triggers.forEach(trigger => {
		const kbd = trigger.querySelector('.rf-search-trigger__kbd');
		if (kbd && !kbd.textContent) {
			kbd.textContent = shortcutLabel;
		}
	});

	// Pagefind instance (lazy-loaded)
	let pagefind: any = null;
	let pagefindFailed = false;

	// Dialog element (lazy-created)
	let dialog: HTMLDialogElement | null = null;
	let input: HTMLInputElement | null = null;
	let resultsContainer: HTMLElement | null = null;
	let activeIndex = -1;

	function createDialog(): HTMLDialogElement {
		const d = document.createElement('dialog');
		d.className = 'rf-search-dialog';
		d.innerHTML = `
			<div class="rf-search-dialog__header">
				<svg class="rf-search-dialog__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input type="search" class="rf-search-dialog__input" placeholder="Search documentation..." autocomplete="off" spellcheck="false" />
				<kbd class="rf-search-dialog__esc">Esc</kbd>
			</div>
			<div class="rf-search-dialog__body">
				<div class="rf-search-dialog__results"></div>
				<div class="rf-search-dialog__empty" hidden>No results found.</div>
			</div>
			<div class="rf-search-dialog__footer">
				<span class="rf-search-dialog__footer-nav">
					<kbd>\u2191</kbd><kbd>\u2193</kbd> to navigate
				</span>
				<span class="rf-search-dialog__footer-select">
					<kbd>\u21B5</kbd> to select
				</span>
			</div>
		`;

		document.body.appendChild(d);

		input = d.querySelector('.rf-search-dialog__input');
		resultsContainer = d.querySelector('.rf-search-dialog__results');

		// Handle input
		let debounceTimer: ReturnType<typeof setTimeout>;
		const onInput = () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => performSearch(input!.value), 200);
		};
		input!.addEventListener('input', onInput);
		cleanups.push(() => input?.removeEventListener('input', onInput));

		// Handle keydown inside dialog
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				navigateResults(1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				navigateResults(-1);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				selectResult();
			}
		};
		d.addEventListener('keydown', onKeydown);
		cleanups.push(() => d.removeEventListener('keydown', onKeydown));

		// Close on backdrop click
		const onClick = (e: MouseEvent) => {
			if (e.target === d) {
				d.close();
			}
		};
		d.addEventListener('click', onClick);
		cleanups.push(() => d.removeEventListener('click', onClick));

		// Clean up on close
		const onClose = () => {
			document.body.style.overflow = '';
			activeIndex = -1;
		};
		d.addEventListener('close', onClose);
		cleanups.push(() => d.removeEventListener('close', onClose));

		return d;
	}

	async function loadPagefind(): Promise<any> {
		if (pagefind) return pagefind;
		if (pagefindFailed) return null;

		try {
			// Dynamic path prevents TypeScript from resolving the module at compile time.
			// Pagefind generates this file at build time in the site's output directory.
			const path = '/pagefind/pagefind.js';
			pagefind = await (Function('p', 'return import(p)')(path));
			await pagefind.init();
			return pagefind;
		} catch {
			pagefindFailed = true;
			return null;
		}
	}

	async function performSearch(query: string) {
		if (!resultsContainer) return;

		const emptyEl = dialog?.querySelector('.rf-search-dialog__empty') as HTMLElement | null;

		if (!query.trim()) {
			resultsContainer.innerHTML = '';
			if (emptyEl) emptyEl.hidden = true;
			activeIndex = -1;
			return;
		}

		const pf = await loadPagefind();
		if (!pf) {
			resultsContainer.innerHTML = '';
			if (emptyEl) {
				emptyEl.textContent = 'Search is not available.';
				emptyEl.hidden = false;
			}
			return;
		}

		const search = await pf.debouncedSearch(query);
		if (!search || !search.results) return;

		// Load first 8 results
		const results = await Promise.all(
			search.results.slice(0, 8).map((r: any) => r.data()),
		);

		if (results.length === 0) {
			resultsContainer.innerHTML = '';
			if (emptyEl) {
				emptyEl.textContent = 'No results found.';
				emptyEl.hidden = false;
			}
			activeIndex = -1;
			return;
		}

		if (emptyEl) emptyEl.hidden = true;
		activeIndex = -1;

		resultsContainer.innerHTML = results
			.map(
				(r: any) => `<a class="rf-search-result" href="${escapeAttr(r.url)}">
				<span class="rf-search-result__title">${escapeHtml(r.meta?.title ?? r.url)}</span>
				<span class="rf-search-result__excerpt">${r.excerpt ?? ''}</span>
			</a>`,
			)
			.join('');
	}

	function navigateResults(direction: number) {
		if (!resultsContainer) return;
		const items = resultsContainer.querySelectorAll<HTMLElement>('.rf-search-result');
		if (items.length === 0) return;

		// Remove previous active
		if (activeIndex >= 0 && activeIndex < items.length) {
			items[activeIndex].removeAttribute('data-active');
		}

		activeIndex += direction;
		if (activeIndex < 0) activeIndex = items.length - 1;
		if (activeIndex >= items.length) activeIndex = 0;

		items[activeIndex].setAttribute('data-active', '');
		items[activeIndex].scrollIntoView({ block: 'nearest' });
	}

	function selectResult() {
		if (!resultsContainer || activeIndex < 0) return;
		const items = resultsContainer.querySelectorAll<HTMLAnchorElement>('.rf-search-result');
		if (activeIndex < items.length) {
			dialog?.close();
			const url = items[activeIndex].getAttribute('href');
			if (url) window.location.href = url;
		}
	}

	function openDialog() {
		if (!dialog) {
			dialog = createDialog();
		}
		dialog.showModal();
		document.body.style.overflow = 'hidden';
		input?.focus();
		input?.select();
	}

	// Wire up trigger buttons
	for (const trigger of triggers) {
		const handler = () => openDialog();
		trigger.addEventListener('click', handler);
		cleanups.push(() => trigger.removeEventListener('click', handler));
	}

	// Global keyboard shortcut: Cmd/Ctrl+K
	const onGlobalKeydown = (e: KeyboardEvent) => {
		const mod = isMac ? e.metaKey : e.ctrlKey;
		if (mod && e.key === 'k') {
			e.preventDefault();
			if (dialog?.open) {
				dialog.close();
			} else {
				openDialog();
			}
		}
	};
	document.addEventListener('keydown', onGlobalKeydown);
	cleanups.push(() => document.removeEventListener('keydown', onGlobalKeydown));

	return () => {
		document.body.style.overflow = '';
		cleanups.forEach(fn => fn());
		dialog?.remove();
	};
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
