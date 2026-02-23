import { getDefaults, getToken } from '../tokens.js';
import { compileThemeCss } from '../compiler.js';

export type ThemeMode = 'light' | 'dark';

class ThemeState {
	name = $state('My Theme');
	description = $state('');
	mode: ThemeMode = $state('light');

	tokens = $state({
		light: getDefaults('light'),
		dark: getDefaults('dark'),
	});

	overrides = $state({
		light: new Set<string>(),
		dark: new Set<string>(),
	});

	/** The CSS string for the current theme (both light and dark tokens) */
	css = $derived(compileThemeCss(this.tokens.light, this.tokens.dark));

	/** Get the current mode's token values */
	get currentTokens(): Record<string, string> {
		return this.mode === 'dark' ? this.tokens.dark : this.tokens.light;
	}

	/** Get the current mode's override set */
	get currentOverrides(): Set<string> {
		return this.mode === 'dark' ? this.overrides.dark : this.overrides.light;
	}

	/** Update a single token value in the current mode */
	updateToken(name: string, value: string): void {
		if (this.mode === 'dark') {
			this.tokens.dark[name] = value;
			this.overrides.dark.add(name);
		} else {
			this.tokens.light[name] = value;
			this.overrides.light.add(name);
		}
	}

	/** Reset a single token to its default in the current mode */
	resetToken(name: string): void {
		const def = getToken(name);
		if (!def) return;

		if (this.mode === 'dark') {
			this.tokens.dark[name] = def.default.dark ?? def.default.light;
			this.overrides.dark.delete(name);
		} else {
			this.tokens.light[name] = def.default.light;
			this.overrides.light.delete(name);
		}
	}

	/** Reset all tokens to defaults */
	resetAll(): void {
		this.tokens.light = getDefaults('light');
		this.tokens.dark = getDefaults('dark');
		this.overrides.light = new Set();
		this.overrides.dark = new Set();
	}

	/** Toggle between light and dark mode */
	toggleMode(): void {
		this.mode = this.mode === 'light' ? 'dark' : 'light';
	}
}

export const themeState = new ThemeState();
