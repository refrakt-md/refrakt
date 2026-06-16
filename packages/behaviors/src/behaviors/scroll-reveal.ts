import type { CleanupFn } from '../types.js';

/** Containers the motion dimension animates — every author-opted reveal except
 *  the explicit `none` opt-out. */
const REVEAL_SELECTOR = '[data-reveal]:not([data-reveal="none"])';

/**
 * Scroll-reveal behavior (SPEC-105) — the timing trigger for the motion
 * dimension. **JS owns *when*, CSS owns *how*.** Theme- and framework-agnostic:
 * it sets only a root `data-animate` flag and per-container `data-in-view`.
 *
 * Enhancement gating (the cardinal rule): the pre-entrance (hidden) CSS is
 * scoped under the root `data-animate` flag this adds on boot. Without JS the
 * flag is absent, so SSR / no-JS / crawler render the fully-visible final state
 * and nothing is ever hidden — no `opacity:0` that only JS can remove.
 *
 * Each `[data-reveal]:not([data-reveal="none"])` container is observed once; on
 * first intersection it gets `data-in-view` and is unobserved (a one-shot
 * entrance, not a scroll-linked toggle). Under `prefers-reduced-motion` — or
 * where `IntersectionObserver` is unavailable — every container is marked
 * in-view immediately (belt-and-braces with the WORK-352 global reduced-motion
 * reset), so the final state is reached without animation.
 */
export function scrollRevealBehavior(container: HTMLElement | Document): CleanupFn {
	const targets = Array.from(container.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
	if (targets.length === 0) return () => {};

	// The gate lives on the document root so it is an ancestor of every reveal
	// container regardless of where the scan started.
	const root = container instanceof Document
		? container.documentElement
		: (container.ownerDocument?.documentElement ?? container);
	root.setAttribute('data-animate', '');

	const reducedMotion = typeof matchMedia === 'function'
		&& matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Reduced motion (or no IO support): reveal everything now — same final state,
	// no entrance animation.
	if (reducedMotion || typeof IntersectionObserver === 'undefined') {
		for (const el of targets) el.setAttribute('data-in-view', '');
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries, obs) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.setAttribute('data-in-view', '');
				obs.unobserve(entry.target);
			}
		},
		// Fire a little before the container is fully on screen so the entrance
		// reads as it scrolls in, not after it has already arrived.
		{ rootMargin: '0px 0px -10% 0px' },
	);

	for (const el of targets) observer.observe(el);

	return () => observer.disconnect();
}
