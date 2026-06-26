/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { carouselBehavior } from '../src/behaviors/carousel.js';

beforeEach(() => {
	document.body.innerHTML = '';
});

function makeCarousel(opts?: { multiRegion?: boolean }) {
	const host = document.createElement('section');
	host.setAttribute('data-layout', 'carousel');
	const trackWrap = document.createElement('div');
	const track = document.createElement('div');
	track.setAttribute('data-name', 'items');
	for (let i = 0; i < 3; i++) {
		const item = document.createElement('div');
		item.setAttribute('data-name', 'item');
		track.appendChild(item);
	}
	(track as unknown as { scrollBy: unknown }).scrollBy = vi.fn(); // jsdom has no scrollBy

	if (opts?.multiRegion) {
		host.appendChild(document.createElement('header'));
		trackWrap.appendChild(track);
		host.appendChild(trackWrap); // track's parent is the wrap, not the host
	} else {
		host.appendChild(track); // track's parent is the host
	}
	document.body.appendChild(host);
	return { host, track, trackWrap };
}

describe('carousel behavior (SPEC-100)', () => {
	it('injects prev/next nav and scrolls the track on click', () => {
		const { host, track } = makeCarousel();
		carouselBehavior(host);

		const prev = host.querySelector<HTMLElement>('.rf-carousel__nav--prev');
		const next = host.querySelector<HTMLElement>('.rf-carousel__nav--next');
		expect(prev).toBeTruthy();
		expect(next).toBeTruthy();

		next!.click();
		prev!.click();
		expect((track as unknown as { scrollBy: ReturnType<typeof vi.fn> }).scrollBy).toHaveBeenCalledTimes(2);
	});

	it('scrolls by a finite distance even when the track gap computes to "normal"', () => {
		// Regression: an unset flex `gap` computes to "normal" in real browsers, so
		// parseFloat would yield NaN and scrollBy({left: NaN}) was a silent no-op.
		const { host, track } = makeCarousel();
		const realGCS = window.getComputedStyle.bind(window);
		const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
			const style = realGCS(el);
			if (el === track) Object.defineProperty(style, 'columnGap', { value: 'normal', configurable: true });
			return style;
		});

		carouselBehavior(host);
		host.querySelector<HTMLElement>('.rf-carousel__nav--next')!.click();

		const scrollBy = (track as unknown as { scrollBy: ReturnType<typeof vi.fn> }).scrollBy;
		expect(scrollBy).toHaveBeenCalledTimes(1);
		expect(Number.isFinite(scrollBy.mock.calls[0][0].left)).toBe(true);
		spy.mockRestore();
	});

	it('scrolls on ArrowLeft / ArrowRight when focused', () => {
		const { host, track } = makeCarousel();
		carouselBehavior(host);

		host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
		host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
		expect((track as unknown as { scrollBy: ReturnType<typeof vi.fn> }).scrollBy).toHaveBeenCalledTimes(2);
	});

	it('mounts nav in the track container, not the host root (multi-region)', () => {
		const { host, trackWrap } = makeCarousel({ multiRegion: true });
		carouselBehavior(host);

		expect(trackWrap.querySelector('.rf-carousel__nav--prev')).toBeTruthy();
		// nav is NOT a direct child of the rune root
		expect(host.querySelector(':scope > .rf-carousel__nav--prev')).toBeNull();
		expect(getComputedStyle(trackWrap).position).toBe('relative');
	});

	it('cleanup removes nav + tabindex and stops scrolling', () => {
		const { host, track } = makeCarousel();
		const cleanup = carouselBehavior(host);
		expect(host.getAttribute('tabindex')).toBe('0');

		cleanup!();
		expect(host.querySelector('.rf-carousel__nav--prev')).toBeNull();
		expect(host.hasAttribute('tabindex')).toBe(false);

		host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
		expect((track as unknown as { scrollBy: ReturnType<typeof vi.fn> }).scrollBy).not.toHaveBeenCalled();
	});

	it('is a no-op without a track or items', () => {
		const host = document.createElement('section');
		host.setAttribute('data-layout', 'carousel');
		document.body.appendChild(host);
		expect(carouselBehavior(host)).toBeUndefined();
	});
});
