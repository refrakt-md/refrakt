import type { CleanupFn } from '../types.js';

/**
 * Mockup fit behavior for `[data-rune="mockup"]`.
 *
 * A media-guest mockup fills its slot's width: the device scales so its width
 * matches the slot, and the cell's fixed height + overflow crops any vertical
 * overflow (a tall phone peeks; a wide laptop fits whole). The scale factor is
 * `slotWidth ÷ deviceWidth`.
 *
 * That factor was previously derived in CSS from container-query units, but
 * iOS WebKit mis-resolves `cqi` here — under `zoom` the value diverges (the
 * device balloons), and even under `transform` it resolves to the wrong size.
 * Measuring the slot in JS sidesteps `cqi` entirely: `clientWidth` /
 * `ResizeObserver` are deterministic across engines. We publish the factor as
 * `--mockup-fit-scale`; the stylesheet applies it (centering + clip stay in
 * CSS). Without JS the property defaults to 1 — the device renders at native
 * size, which degrades gracefully rather than breaking.
 *
 * Only media-guest mockups fill their slot. Standalone mockups (not in a
 * `[data-section="media"]` parent) and `fit="none"` opt out and are left at the
 * stylesheet's own scaling.
 */
export function mockupBehavior(el: HTMLElement): CleanupFn {
	// Mirror the stylesheet's `[data-section="media"] > .rf-mockup` scope: only a
	// direct media-slot child fills its slot.
	if (!el.parentElement?.matches('[data-section="media"]')) return () => {};
	if (el.getAttribute('data-fit') === 'none') return () => {};

	const frame = el.querySelector<HTMLElement>('.rf-mockup__frame');
	if (!frame) return () => {};

	const update = () => {
		// `--mockup-device-width` is the device's native width (e.g. 393px); the
		// browser frame leaves it unset (it's already width:100%) — scale 1 there.
		const deviceWidth = parseFloat(
			getComputedStyle(frame).getPropertyValue('--mockup-device-width'),
		);
		const cs = getComputedStyle(el);
		const inset = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
		const available = el.clientWidth - inset;

		const scale =
			deviceWidth > 0 && available > 0 ? available / deviceWidth : 1;
		frame.style.setProperty('--mockup-fit-scale', String(scale));
	};

	update();
	const observer = new ResizeObserver(update);
	observer.observe(el);

	return () => {
		observer.disconnect();
		frame.style.removeProperty('--mockup-fit-scale');
	};
}
