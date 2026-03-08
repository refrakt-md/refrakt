import type { CleanupFn } from '../types.js';

/**
 * Gallery behavior for `[data-rune="gallery"]`.
 *
 * Provides two enhancements:
 * - Carousel: prev/next nav buttons for horizontal scrolling (when layout="carousel")
 * - Lightbox: fullscreen image overlay on click (when lightbox="true")
 */
export function galleryBehavior(el: HTMLElement): CleanupFn {
	const cleanups: Array<() => void> = [];

	// Carousel navigation
	if (el.getAttribute('data-layout') === 'carousel') {
		const cleanup = setupCarousel(el);
		if (cleanup) cleanups.push(cleanup);
	}

	// Lightbox
	if (el.getAttribute('data-lightbox') === 'true') {
		const cleanup = setupLightbox(el);
		if (cleanup) cleanups.push(cleanup);
	}

	return () => cleanups.forEach((fn) => fn());
}

// ─── Carousel ───

function setupCarousel(el: HTMLElement): CleanupFn | void {
	const itemsContainer = el.querySelector<HTMLElement>('[data-name="items"]');
	if (!itemsContainer) return;

	const items = Array.from(itemsContainer.querySelectorAll<HTMLElement>('[data-name="item"]'));
	if (items.length === 0) return;

	// Create nav buttons
	const prevBtn = document.createElement('button');
	prevBtn.className = 'rf-gallery__nav rf-gallery__nav--prev';
	prevBtn.setAttribute('aria-label', 'Previous');
	prevBtn.textContent = '\u2039';

	const nextBtn = document.createElement('button');
	nextBtn.className = 'rf-gallery__nav rf-gallery__nav--next';
	nextBtn.setAttribute('aria-label', 'Next');
	nextBtn.textContent = '\u203A';

	el.appendChild(prevBtn);
	el.appendChild(nextBtn);

	function scrollByItem(direction: number) {
		const firstItem = items[0];
		if (!firstItem || !itemsContainer) return;
		const itemWidth = firstItem.offsetWidth + parseFloat(getComputedStyle(itemsContainer).gap || '0');
		itemsContainer.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
	}

	const onPrev = () => scrollByItem(-1);
	const onNext = () => scrollByItem(1);

	prevBtn.addEventListener('click', onPrev);
	nextBtn.addEventListener('click', onNext);

	// Keyboard navigation when gallery is focused
	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByItem(-1); }
		if (e.key === 'ArrowRight') { e.preventDefault(); scrollByItem(1); }
	};

	el.setAttribute('tabindex', '0');
	el.addEventListener('keydown', onKeydown);

	return () => {
		prevBtn.removeEventListener('click', onPrev);
		nextBtn.removeEventListener('click', onNext);
		el.removeEventListener('keydown', onKeydown);
		prevBtn.remove();
		nextBtn.remove();
		el.removeAttribute('tabindex');
	};
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

		overlay = document.createElement('div');
		overlay.className = 'rf-gallery__lightbox';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-label', 'Image lightbox');

		const img = document.createElement('img');
		img.src = getImageSrc(items[currentIndex]);
		img.alt = getImageAlt(items[currentIndex]);

		const closeBtn = document.createElement('button');
		closeBtn.className = 'rf-gallery__lightbox-close';
		closeBtn.setAttribute('aria-label', 'Close lightbox');
		closeBtn.textContent = '\u00D7';

		const prevBtn = document.createElement('button');
		prevBtn.className = 'rf-gallery__lightbox-nav rf-gallery__lightbox-nav--prev';
		prevBtn.setAttribute('aria-label', 'Previous image');
		prevBtn.textContent = '\u2039';

		const nextBtn = document.createElement('button');
		nextBtn.className = 'rf-gallery__lightbox-nav rf-gallery__lightbox-nav--next';
		nextBtn.setAttribute('aria-label', 'Next image');
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
		currentIndex = (currentIndex + direction + items.length) % items.length;
		const img = overlay.querySelector('img');
		if (img) {
			img.src = getImageSrc(items[currentIndex]);
			img.alt = getImageAlt(items[currentIndex]);
		}
	}

	function close() {
		if (!overlay) return;
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
		item.setAttribute('aria-label', getImageAlt(item) || `View image ${i + 1}`);
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
