import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';
import type { Component } from 'vue';

/**
 * A resolved Vue theme: the manifest plus live component references.
 * This is the runtime contract between a theme package and the Vue renderer.
 */
export interface VueTheme {
	manifest: ThemeManifest;
	/** Layout name → declarative LayoutConfig */
	layouts: Record<string, LayoutConfig>;
	/** typeof name → Vue component (the component registry) */
	components: Record<string, Component>;
	/** HTML element name → Vue component (element-level overrides) */
	elements?: Record<string, Component>;
}
