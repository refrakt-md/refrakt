import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';
import type { Component } from 'svelte';

/**
 * A resolved Svelte theme: the manifest plus live component references.
 * This is the runtime contract between a theme package and the Svelte adapter.
 */
export interface SvelteTheme {
	manifest: ThemeManifest;
	/** Layout name → declarative LayoutConfig or Svelte component (legacy) */
	layouts: Record<string, Component<any> | LayoutConfig>;
	/** typeof name → Svelte component (the component registry) */
	components: Record<string, Component<any>>;
	/** HTML element name → Svelte component (element-level overrides) */
	elements?: Record<string, Component<any>>;
}

/** Runtime check: LayoutConfig has a `block` string + `slots` object */
export function isLayoutConfig(value: unknown): value is LayoutConfig {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof (value as any).block === 'string' &&
		typeof (value as any).slots === 'object'
	);
}
