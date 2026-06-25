import type { CleanupFn } from '../types.js';

/**
 * Carousel layout-mode behavior (SPEC-100).
 *
 * Block-agnostic: bound on `[data-layout="carousel"]` regardless of the host's
 * rune (dispatched via `registerLayoutModeBehaviors`). Enhances the shared
 * track/item contract —
 *
 *   host[data-layout="carousel"]  …  [data-name="items"] (track)  >  [data-name="item"] …
 *
 * — with prev/next nav buttons and arrow-key scrolling. The CSS scroll-snap
 * track is the baseline; this adds the explicit-desktop affordances. Generalised
 * from gallery's original `setupCarousel`; gallery now consumes it.
 */
export function carouselBehavior(el: HTMLElement): CleanupFn | void {
	const track = el.querySelector<HTMLElement>('[data-name="items"]');
	if (!track) return;

	// Scope to the track's direct children so nested `data-name="item"` elements
	// (a rune's own item internals) aren't mistaken for slides.
	const items = Array.from(track.querySelectorAll<HTMLElement>(':scope > [data-name="item"]'));
	if (items.length === 0) return;

	// Mount nav relative to the track's container, not the rune root — multi-region
	// hosts (e.g. feature: header + item band) would otherwise misposition the
	// buttons. Ensure that container is a positioning context.
	const mount = track.parentElement ?? el;
	let restorePosition: (() => void) | undefined;
	const mountPosition = getComputedStyle(mount).position;
	if (mountPosition === 'static' || mountPosition === '') {
		const prev = mount.style.position;
		mount.style.position = 'relative';
		restorePosition = () => { mount.style.position = prev; };
	}

	const prevBtn = document.createElement('button');
	prevBtn.className = 'rf-carousel__nav rf-carousel__nav--prev';
	prevBtn.setAttribute('aria-label', 'Previous');
	prevBtn.textContent = '‹';

	const nextBtn = document.createElement('button');
	nextBtn.className = 'rf-carousel__nav rf-carousel__nav--next';
	nextBtn.setAttribute('aria-label', 'Next');
	nextBtn.textContent = '›';

	mount.appendChild(prevBtn);
	mount.appendChild(nextBtn);

	function scrollByItem(direction: number) {
		const first = items[0];
		if (!first) return;
		const itemWidth = first.offsetWidth + parseFloat(getComputedStyle(track!).gap || '0');
		track!.scrollBy({ left: direction * itemWidth, behavior: 'smooth' });
	}

	const onPrev = () => scrollByItem(-1);
	const onNext = () => scrollByItem(1);
	prevBtn.addEventListener('click', onPrev);
	nextBtn.addEventListener('click', onNext);

	// Keyboard navigation when the carousel host is focused.
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
		restorePosition?.();
	};
}
