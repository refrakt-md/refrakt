import type { PartialTokenContract, ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Map a token-contract path to its `--rf-*` CSS variable name.
 *
 * Rule: join the path with `-`, prefix with `--rf-`. As a convenience, when
 * a path segment is exactly `base`, it is dropped from the variable name —
 * so `color.surface.base → --rf-color-surface`, preserving the existing
 * variable names Lumina has shipped.
 *
 * Examples:
 *   ['color', 'text']                  → '--rf-color-text'
 *   ['color', 'surface', 'base']       → '--rf-color-surface'
 *   ['color', 'surface', 'hover']      → '--rf-color-surface-hover'
 *   ['color', 'info', 'base']          → '--rf-color-info'
 *   ['color', 'info', 'bg']            → '--rf-color-info-bg'
 *   ['radius', 'md']                   → '--rf-radius-md'
 *   ['syntax', 'keyword']              → '--rf-syntax-keyword'
 *   ['spacing', 'section', 'base']     → '--rf-spacing-section'
 *   ['spacing', 'section', 'tight']    → '--rf-spacing-section-tight'
 */
export function tokenPathToCssVar(path: readonly string[]): string {
	const filtered = path.filter(seg => seg !== 'base');
	return `--rf-${filtered.join('-')}`;
}

export interface GenerateStylesheetOptions {
	/** CSS selector to wrap the declarations in. Default: `:root`. */
	selector?: string;
	/** Indentation per nesting level. Default: a tab. */
	indent?: string;
	/** Extra raw declarations to append (theme-specific tokens via
	 *  `ThemeTokensConfig.extra`). Each key/value becomes
	 *  `--<key>: <value>;`. */
	extra?: Record<string, string>;
}

/**
 * Generate a CSS block for a {@link PartialTokenContract}, walking the tree
 * and emitting one `--rf-*: value;` declaration per leaf.
 *
 * Returns the empty string if the contract has no declarations and no extras.
 */
export function generateTokenStylesheet(
	tokens: PartialTokenContract,
	options: GenerateStylesheetOptions = {},
): string {
	const { selector = ':root', indent = '\t', extra } = options;
	const declarations: string[] = [];
	walkTokens(tokens as Record<string, unknown>, [], declarations);

	if (extra) {
		for (const [key, value] of Object.entries(extra)) {
			declarations.push(`--${key}: ${value};`);
		}
	}

	if (declarations.length === 0) return '';
	const body = declarations.map(d => `${indent}${d}`).join('\n');
	return `${selector} {\n${body}\n}\n`;
}

/**
 * Generate the full theme stylesheet from a {@link ThemeTokensConfig} —
 * base tokens at `:root`, plus one block per mode under both the explicit
 * `[data-theme="<mode>"]` selector (for user toggles) and the
 * `@media (prefers-color-scheme: <mode>)` block (for system preference,
 * scoped to `:root:not([data-theme])` so the explicit toggle wins).
 *
 * `extra` declarations attach to the `:root` base block.
 */
export function generateThemeStylesheet(config: ThemeTokensConfig): string {
	const { modes, extra, ...base } = config;
	const blocks: string[] = [];

	const baseBlock = generateTokenStylesheet(base as PartialTokenContract, { extra });
	if (baseBlock) blocks.push(baseBlock);

	if (modes) {
		for (const [name, modeTokens] of Object.entries(modes)) {
			const explicit = generateTokenStylesheet(modeTokens, {
				selector: `[data-theme="${name}"]`,
			});
			if (explicit) blocks.push(explicit);

			// Only emit the media-query overlay for `dark`/`light` (the modes that
			// `prefers-color-scheme` understands). Custom modes (e.g. `high-contrast`)
			// fall through to the explicit selector only.
			if (name === 'dark' || name === 'light') {
				const system = generateTokenStylesheet(modeTokens, {
					selector: `@media (prefers-color-scheme: ${name}) {\n\t:root:not([data-theme])`,
				});
				if (system) {
					// Close the @media wrapper we opened in the selector.
					blocks.push(system.replace(/}\n$/, '\t}\n}\n'));
				}
			}
		}
	}

	return blocks.join('\n');
}

function walkTokens(
	node: Record<string, unknown>,
	path: string[],
	out: string[],
): void {
	for (const [key, value] of Object.entries(node)) {
		const nextPath = [...path, key];
		if (isPlainObject(value)) {
			walkTokens(value as Record<string, unknown>, nextPath, out);
		} else if (value !== null && value !== undefined) {
			// Skip null and undefined leaves. `null` is preserved by the merge
			// step as "reset to inherit-up"; emitting it here would set the CSS
			// variable to the literal string "null" which would break the cascade.
			out.push(`${tokenPathToCssVar(nextPath)}: ${String(value)};`);
		}
	}
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	if (v === null || typeof v !== 'object') return false;
	if (Array.isArray(v)) return false;
	const proto = Object.getPrototypeOf(v);
	return proto === Object.prototype || proto === null;
}
