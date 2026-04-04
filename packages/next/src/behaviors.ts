import type { RendererNode, SerializedTag } from '@refrakt-md/types';
import { getBehaviorNames } from '@refrakt-md/behaviors';

/**
 * Check whether a renderable tree contains any interactive runes
 * that need client-side behavior initialization.
 *
 * Queries the behavior registry to determine which rune types are interactive.
 * Use this to conditionally include the BehaviorInit client component
 * only on pages that need it.
 */
export function hasInteractiveRunes(node: RendererNode): boolean {
	const interactiveRunes = getBehaviorNames();
	return _hasInteractive(node, interactiveRunes);
}

function _hasInteractive(node: RendererNode, interactiveRunes: Set<string>): boolean {
	if (node === null || node === undefined || typeof node === 'string' || typeof node === 'number') {
		return false;
	}
	if (Array.isArray(node)) {
		return node.some(child => _hasInteractive(child as RendererNode, interactiveRunes));
	}
	const tag = node as SerializedTag;
	if (tag.attributes) {
		const runeType = tag.attributes['data-rune'] as string | undefined;
		if (runeType && interactiveRunes.has(runeType)) {
			return true;
		}
		if (tag.attributes['data-layout-behaviors']) {
			return true;
		}
	}
	if (tag.children) {
		return tag.children.some(child => _hasInteractive(child as RendererNode, interactiveRunes));
	}
	return false;
}
