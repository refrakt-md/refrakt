import { onMounted, onBeforeUnmount, watch, ref, type Ref } from 'vue';

interface BehaviorOptions {
	pages: Array<{
		url: string;
		title: string;
		draft: boolean;
		description?: string;
		date?: string;
		author?: string;
		tags?: string[];
		image?: string;
		version?: string;
		versionGroup?: string;
	}>;
	currentUrl: Ref<string> | string;
}

/**
 * Vue composable that initializes interactive rune behaviors.
 *
 * Call in a page component's `setup()` or `<script setup>`:
 *
 *   useBehaviors({ pages: site.pages, currentUrl: route.path });
 *
 * Handles cleanup on unmount and re-initializes when `currentUrl` changes
 * (for client-side navigation).
 */
export function useBehaviors(options: BehaviorOptions): void {
	let cleanup: (() => void) | undefined;

	async function init() {
		cleanup?.();
		cleanup = undefined;

		const { registerElements, RfContext, initRuneBehaviors, initLayoutBehaviors } =
			await import('@refrakt-md/behaviors');

		const url = typeof options.currentUrl === 'string'
			? options.currentUrl
			: options.currentUrl.value;

		RfContext.pages = options.pages;
		RfContext.currentUrl = url;
		registerElements();
		const cleanupRunes = initRuneBehaviors();
		const cleanupLayout = initLayoutBehaviors();
		cleanup = () => {
			cleanupRunes();
			cleanupLayout();
		};
	}

	onMounted(init);

	// Re-initialize when the URL changes (client-side navigation)
	if (typeof options.currentUrl !== 'string') {
		watch(options.currentUrl, init);
	}

	onBeforeUnmount(() => {
		cleanup?.();
	});
}
