import { initRuneBehaviors } from '@refrakt-md/behaviors';

/** Svelte action that initializes rune behaviors on mounted content. */
export function behaviors(node: HTMLElement) {
	let cleanup = initRuneBehaviors(node);
	return {
		update() {
			cleanup();
			cleanup = initRuneBehaviors(node);
		},
		destroy() {
			cleanup();
		},
	};
}
