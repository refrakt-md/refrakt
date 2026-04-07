import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';
import type { ComponentType } from 'react';

/**
 * A resolved React theme: the manifest plus live component references.
 * This is the runtime contract between a theme package and the React renderer.
 */
export interface ReactTheme {
	manifest: ThemeManifest;
	/** Layout name → declarative LayoutConfig */
	layouts: Record<string, LayoutConfig>;
	/** typeof name → React component (the component registry) */
	components: Record<string, ComponentType<any>>;
	/** HTML element name → React component (element-level overrides) */
	elements?: Record<string, ComponentType<any>>;
}
