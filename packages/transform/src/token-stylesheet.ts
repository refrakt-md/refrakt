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

/**
 * Map a contract `syntax.<role>` key to the matching Shiki alias names —
 * `--rf-syntax-token-*`. Shiki's `createCssVariablesTheme` hardcodes the
 * `token-` segment, and one of the contract names (`variable`) maps to a
 * differently-named Shiki token (`parameter`).
 *
 * `syntax.function` seeds both `token-function` and `token-link` — link
 * tokens default to function. `syntax.string` seeds both `token-string`
 * and `token-string-expression` — template-literal expressions default
 * to the surrounding string colour. Themes that want either pair to
 * diverge declare `syntax.link` or `syntax.string-expression` explicitly
 * (handled below the broad map).
 *
 * `syntax.constant` covers numeric literals plus boolean/null/Symbol —
 * Shiki paints them all from one slot, so the contract surface mirrors
 * Shiki's vocabulary rather than the language-specific intuition of
 * "number". There used to be a separate `number` field that seeded
 * `token-constant`; it was a phantom (the `--rf-syntax-number` contract
 * variable had no Shiki reader) and was removed.
 *
 * There is intentionally no `type` mapping — Shiki's css-variables theme
 * has no `token-type` slot (it paints type names as `entity-name` →
 * `token-function`, and built-in types like `string` as `token-constant`).
 * Themes that want a distinct type colour need a custom highlighter,
 * not a contract token.
 */
const SYNTAX_TO_SHIKI_ALIASES: Record<string, readonly string[]> = {
	keyword: ['token-keyword'],
	function: ['token-function', 'token-link'],
	string: ['token-string', 'token-string-expression'],
	constant: ['token-constant'],
	comment: ['token-comment'],
	punctuation: ['token-punctuation'],
	variable: ['token-parameter'],
};

/** Refinements — contract fields that override one of the broad
 *  derivations above. `link` overrides the function→link default;
 *  `string-expression` overrides the string→string-expression default. */
const SYNTAX_REFINEMENTS: Record<string, string> = {
	link: 'token-link',
	'string-expression': 'token-string-expression',
};

/**
 * Derive the Shiki-alias `extra` entries implied by a layer's
 * `syntax.*` and code/text colour tokens. Returned map is keyed by the
 * raw alias name (without the `--` prefix) so it can be merged with
 * {@link ThemeTokensConfig.extra} directly. Explicit entries in the
 * caller's `extra` always win — this helper only fills gaps.
 */
function deriveSyntaxAliases(
	layer: { syntax?: Record<string, unknown>; color?: Record<string, unknown> },
): Record<string, string> {
	const aliases: Record<string, string> = {};

	if (layer.syntax) {
		// Broad mappings first — link defaults to function, string-expression
		// defaults to string. Refinements then overwrite when present.
		for (const [role, value] of Object.entries(layer.syntax)) {
			if (typeof value !== 'string') continue;
			const targets = SYNTAX_TO_SHIKI_ALIASES[role];
			if (!targets) continue;
			for (const target of targets) {
				aliases[`rf-syntax-${target}`] = value;
			}
		}
		for (const [role, value] of Object.entries(layer.syntax)) {
			if (typeof value !== 'string') continue;
			const refinement = SYNTAX_REFINEMENTS[role];
			if (!refinement) continue;
			aliases[`rf-syntax-${refinement}`] = value;
		}
	}

	const color = layer.color as Record<string, unknown> | undefined;
	if (color) {
		if (typeof color.text === 'string') {
			aliases['rf-syntax-foreground'] = color.text;
		}
		const code = color.code as Record<string, unknown> | undefined;
		if (code && typeof code.bg === 'string') {
			aliases['rf-syntax-background'] = code.bg;
		}
	}

	return aliases;
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
 * base tokens at `:root, [data-color-scheme="light"]`, plus one block
 * per mode under three selectors:
 *
 *   - `[data-theme="<mode>"]` (page-level user toggle)
 *   - `[data-color-scheme="<mode>"]` (subtree forced to a scheme — e.g.
 *     the preview rune's canvas when the user clicks light/dark; sandbox
 *     iframes; juxtapose panels). Without this, per-mode overrides from
 *     `theme.modes.<mode>` would only apply at page level, and a site
 *     with a custom dark primary would see Lumina's default primary
 *     inside any forced-scheme subtree.
 *   - `@media (prefers-color-scheme: <mode>)` (system preference, scoped
 *     to `:root:not([data-theme="<opposite>"])` so the explicit
 *     opposite-mode toggle wins but a same-mode toggle composes via
 *     source order). The "opposite" form matches the selector Lumina's
 *     hand-authored `dark.css` uses, so generated overrides compose with
 *     Lumina's base at equal specificity.
 *
 * The base block additionally targets `[data-color-scheme="light"]` so a
 * subtree forced to light inherits the site's base tokens (which are the
 * implicit light values when a dark mode is also defined). Without this,
 * Lumina's tint.css hardcodes its tonal `--rf-color-primary` inside
 * `[data-color-scheme="light"]` and beats `:root` for elements with that
 * attribute, hiding the site's customised primary.
 *
 * Top-level `extra` attaches to the base block. Per-mode `extra` (inside
 * each {@link ThemeTokensModeOverlay}) attaches to the explicit selector
 * block — useful when a Shiki-style alias needs different values in
 * light vs dark.
 *
 * Each layer's `syntax.*` and code/text colour entries auto-derive the
 * matching Shiki aliases (`--rf-syntax-token-*`, `--rf-syntax-foreground`,
 * `--rf-syntax-background`) so themes don't have to declare them twice.
 * Explicit `extra` entries override the derived values, so callers can
 * still diverge a single token from its contract counterpart when needed.
 */
export function generateThemeStylesheet(config: ThemeTokensConfig): string {
	const { modes, extra, ...base } = config;
	const blocks: string[] = [];

	const baseBlock = generateTokenStylesheet(base as PartialTokenContract, {
		selector: ':root, [data-color-scheme="light"]',
		extra: { ...deriveSyntaxAliases(base), ...extra },
	});
	if (baseBlock) blocks.push(baseBlock);

	if (modes) {
		for (const [name, modeOverlay] of Object.entries(modes)) {
			const { extra: modeExtra, ...modeTokens } = modeOverlay as {
				extra?: Record<string, string>;
			} & PartialTokenContract;

			const derivedAliases = deriveSyntaxAliases(modeTokens);
			const mergedExtra = { ...derivedAliases, ...modeExtra };

			const explicit = generateTokenStylesheet(modeTokens, {
				selector: `[data-theme="${name}"], [data-color-scheme="${name}"]`,
				extra: mergedExtra,
			});
			if (explicit) blocks.push(explicit);

			// Only emit the media-query overlay for `dark`/`light` (the modes that
			// `prefers-color-scheme` understands). Custom modes (e.g. `high-contrast`)
			// fall through to the explicit selector only.
			if (name === 'dark' || name === 'light') {
				const opposite = name === 'dark' ? 'light' : 'dark';
				const system = generateTokenStylesheet(modeTokens, {
					selector: `@media (prefers-color-scheme: ${name}) {\n\t:root:not([data-theme="${opposite}"])`,
					extra: mergedExtra,
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
