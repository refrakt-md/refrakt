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
 * Each required contract role seeds one or more Shiki aliases — the role's
 * own alias plus aliases for any optional role that falls back to it per
 * SPEC-056's fallback table. When a preset doesn't set an optional role
 * (e.g. `type`), the broad mapping leaves `--rf-syntax-token-type` painted
 * by `function`'s value, which is exactly the SPEC-056 fallback intent.
 * When a preset *does* set the optional role, the refinement table below
 * overrides the broad default.
 *
 * Fallback chains seeded here (matches SPEC-056 "Authoring Surface" →
 * "Fallback resolution"):
 * - `function` → `token-function`, `token-link`, `token-type`, `token-attribute`
 * - `string` → `token-string`, `token-string-expression`, `token-regex`
 * - `keyword` → `token-keyword`, `token-tag`
 * - `constant` → `token-constant`, `token-number`
 * - `punctuation` → `token-punctuation`, `token-operator`
 * - `variable` → `token-parameter`, `token-property` (note: contract
 *   `variable` is Shiki's `parameter`; `property` extends the same
 *   identifier-family group)
 * - `comment` → `token-comment` (no fallback children)
 *
 * `syntax.constant` covers numeric literals plus boolean/null/Symbol by
 * default — Shiki's css-variables theme paints them from one slot. Palettes
 * that intentionally split numbers out (Tokyo Night, One Dark) declare
 * `syntax.number` as a refinement; otherwise `--rf-syntax-token-number`
 * stays at the constant value.
 */
const SYNTAX_TO_SHIKI_ALIASES: Record<string, readonly string[]> = {
	keyword: ['token-keyword', 'token-tag'],
	function: ['token-function', 'token-link', 'token-type', 'token-attribute'],
	string: ['token-string', 'token-string-expression', 'token-regex'],
	constant: ['token-constant', 'token-number'],
	comment: ['token-comment'],
	punctuation: ['token-punctuation', 'token-operator'],
	variable: ['token-parameter', 'token-property'],
};

/** Refinements — optional contract fields that override one of the broad
 *  derivations above. Setting `syntax.<role>` declares the explicit colour
 *  for the matching `token-<role>` alias and wins over the broad default. */
const SYNTAX_REFINEMENTS: Record<string, string> = {
	link: 'token-link',
	'string-expression': 'token-string-expression',
	type: 'token-type',
	property: 'token-property',
	parameter: 'token-parameter',
	tag: 'token-tag',
	attribute: 'token-attribute',
	operator: 'token-operator',
	number: 'token-number',
	regex: 'token-regex',
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

/**
 * SPEC-056 scope-eligibility filter: which `ThemeTokensConfig` slots can be
 * projected from a preset module into a scoped tint class.
 *
 * - **Included**: `syntax.*` (all 16 roles), `color.code.*` (bg/text/inline-bg),
 *   and chrome accent slots (`color.bg`, `color.surface.base`, `color.text`,
 *   `color.muted`, `color.primary`, `color.border`). Together these cover the
 *   visible colour identity of a Nord-style integrated palette without leaking
 *   into structural identity.
 *
 * - **Excluded**: typography (`font.*`), structural (`radius.*`, `spacing.*`,
 *   `inset.*`, `shadow.*`), status sentiments (`color.info`, `color.warning`,
 *   `color.danger`, `color.success`), primary scale (`color.primary-scale`),
 *   primary hover variants (`color.primary-hover`), surface variants beyond
 *   `base` (`color.surface.hover/active/raised`), and theme-specific `extra`
 *   keys. The spec's "tints scope mood; presets scope skeleton" commitment
 *   lives in this filter.
 *
 * Why include chrome accents here rather than route them through the inline-
 * style mechanism that hand-defined tints use? The inline path requires the
 * runtime engine to know about the preset module (via a `presetMap` plumbed
 * through `mergeThemeConfig` → `resolveTintExtends`). Today only the build-
 * time generator has that knowledge, so we materialise chrome accents here
 * to keep the scoped tint self-sufficient. If a future caller does plumb
 * `presetMap` through merge time, the inline emission would override these
 * (inline styles beat CSS selector specificity), so there's no conflict —
 * just a redundancy that the cascade resolves correctly.
 */
const CHROME_ACCENT_KEYS = new Set(['bg', 'text', 'muted', 'primary', 'border']);

/** Drop non-eligible top-level + nested keys from a config, leaving only the
 *  scope-eligible namespaces (chrome accents + code surface + syntax).
 *  Returns an empty object if the input has nothing to project.
 *
 *  When invoked from `generateScopedTintStylesheet`, dropped keys are
 *  reported through `onDrop` for an optional dev warning. */
function filterScopeEligible(
	layer: ThemeTokensConfig,
	onDrop?: (key: string) => void,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (layer.syntax) out.syntax = layer.syntax;

	if (layer.color) {
		const colorOut: Record<string, unknown> = {};
		// Chrome accents (top-level color.* leaves we care about).
		for (const key of CHROME_ACCENT_KEYS) {
			const v = (layer.color as Record<string, unknown>)[key];
			if (typeof v === 'string') colorOut[key] = v;
		}
		// Chrome accent: color.surface.base only (not hover/active/raised).
		const surface = (layer.color as { surface?: { base?: string } }).surface;
		if (surface && typeof surface.base === 'string') {
			colorOut.surface = { base: surface.base };
		}
		// Code surface: full color.code.* namespace.
		if (layer.color.code) {
			colorOut.code = layer.color.code;
		}
		if (Object.keys(colorOut).length > 0) out.color = colorOut;
	}

	if (onDrop) {
		const ELIGIBLE_COLOR_KEYS = new Set([...CHROME_ACCENT_KEYS, 'surface', 'code']);
		for (const topKey of Object.keys(layer)) {
			if (topKey === 'syntax' || topKey === 'modes' || topKey === 'extra') continue;
			if (topKey === 'color') {
				for (const colorKey of Object.keys(layer.color ?? {})) {
					if (ELIGIBLE_COLOR_KEYS.has(colorKey)) continue;
					onDrop(`color.${colorKey}`);
				}
				continue;
			}
			onDrop(topKey);
		}
	}

	return out;
}

/** Dedup set for dev warnings — one warning per (preset, key) pair per process. */
const __DROP_WARNINGS_SEEN = new Set<string>();

/**
 * Generate a scoped tint stylesheet for tints whose `extends` references a
 * preset module — SPEC-056's tint-as-preset-projection mechanism.
 *
 * For each tint name in `tints` whose `extends` is a key in `presetMap`,
 * emits two CSS blocks:
 *
 *   1. `[data-tint="<name>"] { ... }` — the preset's scope-eligible
 *      non-accent values (syntax + color.code) at light-mode.
 *   2. `[data-tint="<name>"][data-color-scheme="dark"], [data-color-scheme="dark"] [data-tint="<name>"] { ... }`
 *      — the preset's dark-mode overlay for the same scope-eligible
 *      namespaces, when present.
 *
 * Tints whose extends is a tint name (existing SPEC-053 path) or that have
 * no extends are skipped — they produce no static CSS, only the inline-style
 * chrome-accent runtime emission via the engine.
 *
 * The chrome-accent portions of preset projections are NOT emitted here —
 * those are handled by `resolveTintExtends` which puts them into the tint's
 * `light`/`dark` `TintTokens` shape, where the engine picks them up at
 * runtime and emits them as inline `style="--tint-* "` declarations.
 *
 * Non-eligible namespaces from the preset (font, radius, spacing, shadow,
 * status, primary-scale) are silently dropped. The filter is enforced here,
 * making it impossible for a preset to leak typography or structural
 * overrides into a scoped tint regardless of what the preset author writes.
 */
export function generateScopedTintStylesheet(
	tints: Record<string, TintDefinitionLike>,
	presetMap: Record<string, ThemeTokensConfig>,
): string {
	const blocks: string[] = [];

	const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

	for (const [name, tint] of Object.entries(tints)) {
		const extendsValue = tint.extends;
		if (!extendsValue) continue;
		const preset = presetMap[extendsValue];
		if (!preset) continue;

		const reportDrop = isDev
			? (key: string) => {
				const seenKey = `${extendsValue}:${key}`;
				if (__DROP_WARNINGS_SEEN.has(seenKey)) return;
				__DROP_WARNINGS_SEEN.add(seenKey);
				console.warn(
					`[refrakt] Preset "${extendsValue}" sets non-scope-eligible token "${key}" — ` +
					`dropped from projected tint "${name}" per SPEC-056. Move this to a chrome preset ` +
					`if you want it applied globally.`,
				);
			}
			: undefined;

		const lightProjection = filterScopeEligible(preset, reportDrop);
		const lightBlock = generateTokenStylesheet(
			lightProjection as Parameters<typeof generateTokenStylesheet>[0],
			{
				selector: `[data-tint="${name}"]`,
				extra: deriveSyntaxAliases(lightProjection as { syntax?: Record<string, unknown>; color?: Record<string, unknown> }),
			},
		);
		if (lightBlock) blocks.push(lightBlock);

		const darkOverlay = preset.modes?.dark;
		if (darkOverlay) {
			// Dev warnings for `modes.dark` are only emitted when the dark
			// overlay introduces *new* non-eligible keys not already reported
			// from the base — dedup via the same seen-set.
			const darkProjection = filterScopeEligible(darkOverlay as ThemeTokensConfig, reportDrop);
			const darkBlock = generateTokenStylesheet(
				darkProjection as Parameters<typeof generateTokenStylesheet>[0],
				{
					selector: `[data-tint="${name}"][data-color-scheme="dark"], [data-color-scheme="dark"] [data-tint="${name}"]`,
					extra: deriveSyntaxAliases(darkProjection as { syntax?: Record<string, unknown>; color?: Record<string, unknown> }),
				},
			);
			if (darkBlock) blocks.push(darkBlock);
		}
	}

	return blocks.join('\n');
}

/** Minimal shape required by {@link generateScopedTintStylesheet}. Avoids a
 *  circular type import on `TintDefinition` from `./types.ts`. */
interface TintDefinitionLike {
	extends?: string;
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
