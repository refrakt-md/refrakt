import type { RendererNode } from '@refrakt-md/types';
import { hasMatchingRunes } from '@refrakt-md/transform';
import { getBehaviorNames } from '@refrakt-md/behaviors';

/**
 * Check whether a rendered tree contains interactive runes that need
 * client-side behavior initialization.
 *
 * Use to conditionally include the behavior `<script>` tag,
 * shipping zero JS for static-only pages.
 */
export function hasInteractiveRunes(node: RendererNode): boolean {
	return hasMatchingRunes(node, getBehaviorNames());
}
