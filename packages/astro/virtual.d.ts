declare module 'virtual:refrakt/theme' {
	import type { AstroTheme } from '@refrakt-md/astro';
	export const theme: AstroTheme;
}

declare module 'virtual:refrakt/tokens' {
	// Side-effect-only import, no exports
}

declare module 'virtual:refrakt/config' {
	import type { RefraktConfig } from '@refrakt-md/types';
	const config: RefraktConfig;
	export default config;
}
