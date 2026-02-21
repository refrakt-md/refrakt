import type { RendererNode } from '@refrakt-md/types';
import { isTag } from './helpers.js';

/**
 * Extract all CSS selectors a theme developer could target from a transformed tag tree.
 *
 * Collects:
 * - Class selectors matching the BEM prefix (e.g., .rf-hint, .rf-hint--warning, .rf-hint__icon)
 * - Data attribute selectors (e.g., [data-hint-type="warning"], [data-rune="hint"])
 *
 * Returns a deduplicated, sorted array of selector strings.
 */
export function extractSelectors(node: RendererNode, prefix: string): string[] {
	const selectors = new Set<string>();
	walk(node, prefix, selectors);
	return [...selectors].sort(selectorSort);
}

function walk(node: RendererNode, prefix: string, selectors: Set<string>): void {
	if (node === null || node === undefined) return;
	if (typeof node === 'string' || typeof node === 'number') return;
	if (Array.isArray(node)) {
		for (const child of node) walk(child, prefix, selectors);
		return;
	}
	if (!isTag(node)) return;

	const attrs = node.attributes;

	// Collect class selectors matching prefix
	if (attrs.class && typeof attrs.class === 'string') {
		for (const cls of attrs.class.split(/\s+/)) {
			if (cls.startsWith(`${prefix}-`)) {
				selectors.add(`.${cls}`);
			}
		}
	}

	// Collect data-* attribute selectors
	for (const [key, value] of Object.entries(attrs)) {
		if (key.startsWith('data-') && value !== undefined && value !== null) {
			selectors.add(`[${key}="${value}"]`);
		}
	}

	// Recurse into children
	for (const child of node.children) {
		walk(child, prefix, selectors);
	}
}

/** Sort selectors: block first, then modifiers, then elements, then data attributes */
function selectorSort(a: string, b: string): number {
	const typeA = selectorType(a);
	const typeB = selectorType(b);
	if (typeA !== typeB) return typeA - typeB;
	return a.localeCompare(b);
}

function selectorType(s: string): number {
	if (s.startsWith('[')) return 3; // data attribute
	if (s.includes('__')) return 2; // BEM element
	if (s.includes('--')) return 1; // BEM modifier
	return 0; // BEM block
}
