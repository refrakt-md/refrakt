import { tokens as tokenRegistry } from './tokens.js';

/**
 * Compile token values into a CSS string for :root.
 * Produces: `:root { --rf-color-primary: #0ea5e9; ... }`
 */
export function compileTokens(values: Record<string, string>): string {
	const declarations: string[] = [];
	for (const token of tokenRegistry) {
		const value = values[token.name];
		if (value) {
			declarations.push(`\t${token.cssVar}: ${value};`);
		}
	}
	return `:root {\n${declarations.join('\n')}\n}`;
}

/**
 * Compile dark mode token overrides.
 * Produces both `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` blocks.
 */
export function compileDarkTokens(values: Record<string, string>): string {
	const declarations: string[] = [];
	for (const token of tokenRegistry) {
		const value = values[token.name];
		if (value) {
			declarations.push(`\t${token.cssVar}: ${value};`);
		}
	}
	const body = declarations.join('\n');
	return [
		`[data-theme="dark"] {\n${body}\n}`,
		`@media (prefers-color-scheme: dark) {\n\t:root:not([data-theme="light"]) {\n${declarations.map((d) => `\t${d}`).join('\n')}\n\t}\n}`,
	].join('\n\n');
}

/**
 * Compile a full CSS string with both light and dark tokens.
 * Used for injection into the preview panel.
 */
export function compileThemeCss(
	lightValues: Record<string, string>,
	darkValues: Record<string, string>,
): string {
	return `${compileTokens(lightValues)}\n\n${compileDarkTokens(darkValues)}`;
}
