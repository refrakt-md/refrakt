import type { ThemeManifest } from '@refract-md/types';
import type { Component } from 'svelte';

/**
 * A resolved Svelte theme: the manifest plus live component references.
 * This is the runtime contract between a theme package and the Svelte adapter.
 */
export interface SvelteTheme {
	manifest: ThemeManifest;
	/** Layout name → Svelte component */
	layouts: Record<string, Component<any>>;
	/** typeof name → Svelte component (the component registry) */
	components: Record<string, Component<any>>;
	/** HTML element name → Svelte component (element-level overrides) */
	elements?: Record<string, Component<any>>;
}
