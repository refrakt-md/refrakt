import type { ElementOverrides } from '@refrakt-md/svelte';
import { elements as baseElements } from '@refrakt-md/theme-base/sveltekit/elements';
import Blockquote from './elements/Blockquote.svelte';

/** Lumina element overrides — extends base with decorative Blockquote */
export const elements: ElementOverrides = {
	...baseElements,
	'blockquote': Blockquote,
};
