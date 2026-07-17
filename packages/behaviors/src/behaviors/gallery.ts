import type { CleanupFn } from '../types.js';
import { bstr } from '../i18n.js';

/**
 * Gallery behavior for `[data-rune="gallery"]`.
 *
 * Owns the lightbox (fullscreen image overlay on click, when `lightbox="true"`).
 * Carousel is no longer gallery-specific — it is the shared `carousel` layout-mode
 * behavior bound on `[data-layout="carousel"]` (SPEC-100), which gallery emits and
 * therefore gets for free.
 */
export function galleryBehavior(el: HTMLElement): CleanupFn {
	const cleanups: Array<() => void> = [];

	// Lightbox
	if (el.getAttribute('data-lightbox') === 'true') {
		const cleanup = setupLightbox(el);
		if (cleanup) cleanups.push(cleanup);
	}

	return () => cleanups.forEach((fn) => fn());
}

// ─── Lightbox ───

function setupLightbox(el: HTMLElement): CleanupFn | void {
	const items = Array.from(el.querySelectorAll<HTMLElement>('[data-name="item"]'));
	if (items.length === 0) return;

	let overlay: HTMLElement | null = null;
	let currentIndex = 0;

	function getImageSrc(item: HTMLElement): string {
		const img = item.querySelector('img');
		return img?.getAttribute('src') || '';
	}

	function getImageAlt(item: HTMLElement): string {
		const img = item.querySelector('img');
		return img?.getAttribute('alt') || '';
	}

	function open(index: number) {
		currentIndex = index;
		items[currentIndex]?.setAttribute('data-state', 'selected');

		overlay = document.createElement('div');
		overlay.className = 'rf-gallery__lightbox';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-label', bstr('behavior.gallery.lightbox'));

		const img = document.createElement('img');
		img.src = getImageSrc(items[currentIndex]);
		img.alt = getImageAlt(items[currentIndex]);

		const closeBtn = document.createElement('button');
		closeBtn.className = 'rf-gallery__lightbox-close';
		closeBtn.setAttribute('aria-label', bstr('behavior.gallery.close'));
		closeBtn.textContent = '\u00D7';

		const prevBtn = document.createElement('button');
		prevBtn.className = 'rf-gallery__lightbox-nav rf-gallery__lightbox-nav--prev';
		prevBtn.setAttribute('aria-label', bstr('behavior.gallery.previous'));
		prevBtn.textContent = '\u2039';

		const nextBtn = document.createElement('button');
		nextBtn.className = 'rf-gallery__lightbox-nav rf-gallery__lightbox-nav--next';
		nextBtn.setAttribute('aria-label', bstr('behavior.gallery.next'));
		nextBtn.textContent = '\u203A';

		overlay.appendChild(img);
		overlay.appendChild(closeBtn);
		if (items.length > 1) {
			overlay.appendChild(prevBtn);
			overlay.appendChild(nextBtn);
		}

		closeBtn.addEventListener('click', close);
		prevBtn.addEventListener('click', () => navigate(-1));
		nextBtn.addEventListener('click', () => navigate(1));
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) close();
		});

		document.body.appendChild(overlay);
		document.addEventListener('keydown', onOverlayKeydown);
		closeBtn.focus();
	}

	function navigate(direction: number) {
		if (!overlay) return;
		items[currentIndex]?.removeAttribute('data-state');
		currentIndex = (currentIndex + direction + items.length) % items.length;
		items[currentIndex]?.setAttribute('data-state', 'selected');
		const img = overlay.querySelector('img');
		if (img) {
			img.src = getImageSrc(items[currentIndex]);
			img.alt = getImageAlt(items[currentIndex]);
		}
	}

	function close() {
		if (!overlay) return;
		items[currentIndex]?.removeAttribute('data-state');
		document.removeEventListener('keydown', onOverlayKeydown);
		overlay.remove();
		overlay = null;
		// Restore focus to the item that was clicked
		items[currentIndex]?.focus();
	}

	function onOverlayKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { e.preventDefault(); close(); }
		if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
		if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
	}

	const itemHandlers: Array<[HTMLElement, () => void]> = [];
	items.forEach((item, i) => {
		const handler = () => open(i);
		item.addEventListener('click', handler);
		item.setAttribute('tabindex', '0');
		item.setAttribute('role', 'button');
		item.setAttribute('aria-label', getImageAlt(item) || bstr('behavior.gallery.viewImage', i + 1));
		itemHandlers.push([item, handler]);
	});

	// Keyboard enter/space on items
	const onItemKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const target = e.currentTarget as HTMLElement;
			const idx = items.indexOf(target);
			if (idx >= 0) open(idx);
		}
	};
	items.forEach((item) => item.addEventListener('keydown', onItemKeydown));

	return () => {
		close();
		for (const [item, handler] of itemHandlers) {
			item.removeEventListener('click', handler);
			item.removeAttribute('tabindex');
			item.removeAttribute('role');
			item.removeAttribute('aria-label');
		}
		items.forEach((item) => item.removeEventListener('keydown', onItemKeydown));
	};
}
