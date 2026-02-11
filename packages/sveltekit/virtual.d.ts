declare module 'virtual:refract/theme' {
	import type { SvelteTheme } from '@refract-md/svelte';
	export const theme: SvelteTheme;
}

declare module 'virtual:refract/tokens' {
	// Side-effect-only import, no exports
}

declare module 'virtual:refract/config' {
	import type { RefractConfig } from '@refract-md/types';
	const config: RefractConfig;
	export default config;
}
