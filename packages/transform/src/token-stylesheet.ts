import type { PartialTokenContract, ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Map a token-contract path to its `--rf-*` CSS variable name.
 *
 * Rule: join the path with `-`, prefix with `--rf-`. Two conveniences applied
 * before the join:
 *
 *   1. Path segments equal to `base` are dropped — so `color.surface.base`
 *      becomes `--rf-color-surface` (not `--rf-color-surface-base`),
 *      preserving the existing variable names Lumina has shipped.
 *
 *   2. Path segments ending in `-scale` have the `-scale` suffix stripped —
 *      so `color.primary-scale.500` becomes `--rf-color-primary-500`,
 *      matching the convention of palette-step variables in Lumina (and
 *      most CSS design systems). The `-scale` segment exists in the JS
 *      contract shape only to namespace the scale's step keys (`50`, `100`,
 *      …) away from the sibling singular fields (`primary`, `primary-hover`).
 *
 * Examples:
 *   ['color', 'text']                       → '--rf-color-text'
 *   ['color', 'surface', 'base']            → '--rf-color-surface'
 *   ['color', 'surface', 'hover']           → '--rf-color-surface-hover'
 *   ['color', 'info', 'base']               → '--rf-color-info'
 *   ['color', 'info', 'bg']                 → '--rf-color-info-bg'
 *   ['color', 'primary-scale', '500']       → '--rf-color-primary-500'
 *   ['color', 'primary-scale', '950']       → '--rf-color-primary-950'
 *   ['radius', 'md']                        → '--rf-radius-md'
 *   ['syntax', 'keyword']                   → '--rf-syntax-keyword'
 *   ['spacing', 'section', 'base']          → '--rf-spacing-section'
 *   ['spacing', 'section', 'tight']         → '--rf-spacing-section-tight'
 */
export function tokenPathToCssVar(path: readonly string[]): string {
	const segments = path
		.filter(seg => seg !== 'base')
		.map(seg => (seg.endsWith('-scale') ? seg.slice(0, -'-scale'.length) : seg));
	return `--rf-${segments.join('-')}`;
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
 * scoped to `:root:not([data-theme="<opposite>"])` so the explicit
 * opposite-mode toggle wins but a same-mode toggle composes via source
 * order). The "opposite" form matches the selector Lumina's hand-authored
 * `dark.css` uses, so generated overrides (e.g. preset CSS) compose with
 * Lumina's base at equal specificity.
 *
 * Top-level `extra` attaches to the `:root` base block. Per-mode `extra`
 * (inside each {@link ThemeTokensModeOverlay}) attaches to that mode's
 * selector block — useful when a Shiki-style alias needs different values
 * in light vs dark.
 */
export function generateThemeStylesheet(config: ThemeTokensConfig): string {
	const { modes, extra, ...base } = config;
	const blocks: string[] = [];

	const baseBlock = generateTokenStylesheet(base as PartialTokenContract, { extra });
	if (baseBlock) blocks.push(baseBlock);

	if (modes) {
		for (const [name, modeOverlay] of Object.entries(modes)) {
			const { extra: modeExtra, ...modeTokens } = modeOverlay as {
				extra?: Record<string, string>;
			} & PartialTokenContract;

			const explicit = generateTokenStylesheet(modeTokens, {
				selector: `[data-theme="${name}"]`,
				extra: modeExtra,
			});
			if (explicit) blocks.push(explicit);

			// Only emit the media-query overlay for `dark`/`light` (the modes that
			// `prefers-color-scheme` understands). Custom modes (e.g. `high-contrast`)
			// fall through to the explicit selector only.
			if (name === 'dark' || name === 'light') {
				const opposite = name === 'dark' ? 'light' : 'dark';
				const system = generateTokenStylesheet(modeTokens, {
					selector: `@media (prefers-color-scheme: ${name}) {\n\t:root:not([data-theme="${opposite}"])`,
					extra: modeExtra,
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
