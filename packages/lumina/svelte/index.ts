import type { SvelteTheme } from '@refrakt-md/svelte';
import manifest from './manifest.json';
import { registry } from './registry.js';
import { elements } from './elements.js';
import DocsLayout from './layouts/DocsLayout.svelte';
import DefaultLayout from './layouts/DefaultLayout.svelte';
import BlogLayout from './layouts/BlogLayout.svelte';

/** Re-export the raw manifest for server-side use (no Svelte imports) */
export { default as manifest } from './manifest.json';

/** The structured theme object consumed by ThemeShell */
export const theme: SvelteTheme = {
	manifest: manifest as any,
	layouts: { default: DefaultLayout, docs: DocsLayout, blog: BlogLayout },
	components: registry,
	elements,
};

// Backward-compatible named exports
export { registry };
export { default as DocsLayout } from './layouts/DocsLayout.svelte';
export { default as DefaultLayout } from './layouts/DefaultLayout.svelte';
export { default as BlogLayout } from './layouts/BlogLayout.svelte';

// Components re-exported from theme-base for advanced usage
export { default as Diagram } from '@refrakt-md/theme-base/svelte/components/Diagram.svelte';
export { default as Nav } from '@refrakt-md/theme-base/svelte/components/Nav.svelte';
