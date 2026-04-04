import type { ThemeManifest } from '@refrakt-md/types';
import type { LayoutConfig } from '@refrakt-md/transform';

export interface NuxtTheme {
	manifest: ThemeManifest;
	layouts: Record<string, LayoutConfig>;
}

export interface RefraktNuxtOptions {
	configPath?: string;
}
