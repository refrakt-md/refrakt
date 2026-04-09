declare module 'virtual:refrakt/theme' {
	import type { SvelteTheme } from '@refrakt-md/svelte';
	export const theme: SvelteTheme;
}

declare module 'virtual:refrakt/tokens' {
	// Side-effect-only import, no exports
}

declare module 'virtual:refrakt/config' {
	import type { RefraktConfig } from '@refrakt-md/types';
	const config: RefraktConfig;
	export default config;
}

declare module 'virtual:refrakt/content' {
	import type { Site } from '@refrakt-md/content';
	export function getSite(): Promise<Site>;
	export function getTransform(): Promise<(tree: any) => any>;
	export function getHighlightTransform(): Promise<{ (tree: any): any; css: string }>;
	export function invalidateSite(): void;
}
