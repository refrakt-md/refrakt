import type { RendererNode } from '@refrakt-md/types';
import { hasMatchingRunes } from '@refrakt-md/transform';
import { getBehaviorNames } from '@refrakt-md/behaviors';

/**
 * Check whether a renderable tree contains any interactive runes
 * that need client-side behavior initialization.
 *
 * Use this to conditionally include the BehaviorInit client component
 * only on pages that need it.
 */
export function hasInteractiveRunes(node: RendererNode): boolean {
	return hasMatchingRunes(node, getBehaviorNames());
}
