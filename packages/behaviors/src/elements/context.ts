/** Minimal design token types (mirroring @refrakt-md/types without the dependency) */
export interface DesignTokenFont {
	role: string;
	family: string;
	weights: number[];
	category: string;
}

export interface DesignTokenColor {
	name: string;
	value: string;
	group?: string;
}

export interface DesignTokenNamedValue {
	name: string;
	value: string;
}

export interface DesignTokens {
	fonts?: DesignTokenFont[];
	colors?: DesignTokenColor[];
	spacing?: { unit?: string; scale?: string[] };
	radii?: DesignTokenNamedValue[];
	shadows?: DesignTokenNamedValue[];
}

export interface PageEntry {
	url: string;
	title: string;
	draft: boolean;
}

/**
 * Framework-neutral context provider for web component runes.
 *
 * Each framework adapter (SvelteKit, Next.js, etc.) sets these values
 * during initialization. Web components read them via static properties.
 *
 * Usage:
 *   RfContext.pages = data.pages;
 *   RfContext.currentUrl = $page.url.pathname;
 */
export class RfContext {
	static pages: PageEntry[] = [];
	static currentUrl = '';
	static designTokens: DesignTokens | null = null;
	static theme: 'light' | 'dark' | 'auto' = 'auto';

	/** Subscribe to theme changes. Called by Sandbox web component. */
	private static themeListeners: Array<(theme: string) => void> = [];

	static onThemeChange(listener: (theme: string) => void): () => void {
		RfContext.themeListeners.push(listener);
		return () => {
			RfContext.themeListeners = RfContext.themeListeners.filter(l => l !== listener);
		};
	}

	static setTheme(theme: 'light' | 'dark' | 'auto') {
		RfContext.theme = theme;
		for (const listener of RfContext.themeListeners) {
			listener(theme);
		}
	}
}
