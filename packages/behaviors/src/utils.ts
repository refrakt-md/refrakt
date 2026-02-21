/**
 * Check if a theme framework (Alpine.js, Stimulus, etc.) has claimed
 * interactivity for this element. The base behavior library steps aside
 * to avoid double-binding.
 */
export function isFrameworkManaged(el: HTMLElement): boolean {
	return el.hasAttribute('x-data') || el.hasAttribute('data-controller');
}

let idCounter = 0;

/** Generate a unique ID for ARIA wiring (aria-controls, aria-labelledby, etc.) */
export function uniqueId(prefix: string): string {
	return `${prefix}-${++idCounter}`;
}

/** Reset the ID counter (for testing) */
export function resetIdCounter(): void {
	idCounter = 0;
}
