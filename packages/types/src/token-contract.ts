/**
 * Token Contract — the universal design-token surface that every refrakt theme
 * must populate.
 *
 * The contract describes the **named** tokens that runes depend on. Themes
 * supply values for these names; sites can override individual tokens via
 * `refrakt.config.json` → `theme.tokens`; presets ship `ThemeTokensConfig`
 * modules that merge into the final value.
 *
 * **CSS-variable mapping rule.** Each contract leaf maps to a `--rf-*` CSS
 * custom property. Nested namespaces flatten by joining keys with `-`. As a
 * convenience, when the leaf key is `base`, it is *omitted* from the variable
 * name — so `color.surface.base` produces `--rf-color-surface`, not
 * `--rf-color-surface-base`, preserving the existing variable names that
 * Lumina has shipped to date.
 *
 * Examples:
 * - `color.text` → `--rf-color-text`
 * - `color.surface.base` → `--rf-color-surface`
 * - `color.surface.hover` → `--rf-color-surface-hover`
 * - `color.info.base` → `--rf-color-info`
 * - `color.info.bg` → `--rf-color-info-bg`
 * - `color.code.inline-bg` → `--rf-color-inline-code-bg` *(special-cased,
 *   matching the existing variable name)*
 * - `syntax.keyword` → `--rf-syntax-keyword`
 * - `radius.md` → `--rf-radius-md`
 */
export interface TokenContract {
	/** Typography tokens. The `serif` slot is reserved for a future SPEC-048
	 *  amendment per SPEC-051; today the contract carries only sans and mono. */
	font: {
		/** Primary text family used for body and most UI. Includes its full
		 *  fallback stack — e.g. `"'Inter', system-ui, -apple-system, sans-serif"`. */
		sans: string;
		/** Monospace family used for code blocks and inline code. */
		mono: string;
	};

	/** Colour tokens. */
	color: {
		/** Body text colour. */
		text: string;
		/** Muted / secondary text (timestamps, captions, less emphatic copy). */
		muted: string;
		/** Default border colour for surfaces, separators, inputs. */
		border: string;
		/** Page background. */
		bg: string;

		/** Interactive primary colour — buttons, links, accents. May be
		 *  monochromatic (matching `text`) for fully neutral themes. */
		primary: string;
		/** Primary colour on hover/active. */
		'primary-hover': string;
		/** Primary colour scale (50→950) for hover/active layering and
		 *  rune-internal contrast steps that don't introduce a hue. */
		'primary-scale': PrimaryScale;

		/** Layered surfaces above the page background. `base` is the default
		 *  card / panel surface; `raised` is the most elevated layer. */
		surface: {
			base: string;
			hover: string;
			active: string;
			raised: string;
		};

		/** Sentiment colours — communicate state across callouts, banners,
		 *  validation messages. Each has a saturated `base` (text/accent), a
		 *  pale `bg` (filled surface), and a `border`. */
		info: SentimentTokens;
		warning: SentimentTokens;
		danger: SentimentTokens;
		success: SentimentTokens;

		/** Code surface tokens. `inline-bg` covers inline `` `code` `` spans;
		 *  `bg` covers full code blocks. */
		code: {
			bg: string;
			text: string;
			'inline-bg': string;
		};
	};

	/** Border-radius tokens. */
	radius: {
		sm: string;
		md: string;
		lg: string;
		full: string;
	};

	/** Spacing tokens — generic scale plus the `section` namespace for
	 *  page-section vertical rhythm. */
	spacing: {
		xs: string;
		sm: string;
		md: string;
		lg: string;
		xl: string;
		'2xl': string;
		/** Vertical spacing between top-level page sections.
		 *  `base` is the default; `tight`/`loose`/`breathe` are author opt-ins. */
		section: {
			base: string;
			tight: string;
			loose: string;
			breathe: string;
		};
	};

	/** Horizontal-padding tokens for page-section insets. */
	inset: {
		flush: string;
		tight: string;
		loose: string;
		breathe: string;
	};

	/** Drop-shadow tokens for elevation. */
	shadow: {
		xs: string;
		sm: string;
		md: string;
		lg: string;
	};

	/** Syntax highlighting colours. Highlighter-agnostic — the integration
	 *  (Shiki today, anything tomorrow) is responsible for emitting these
	 *  names. Per SPEC-048 the highlighter is an implementation detail behind
	 *  the `--rf-syntax-*` contract. */
	syntax: SyntaxTokens;
}

/** Three tokens per sentiment: saturated `base`, pale `bg`, complementary
 *  `border`. */
export interface SentimentTokens {
	base: string;
	bg: string;
	border: string;
}

/** Eleven-stop colour scale, near-bg → near-text. */
export interface PrimaryScale {
	'50': string;
	'100': string;
	'200': string;
	'300': string;
	'400': string;
	'500': string;
	'600': string;
	'700': string;
	'800': string;
	'900': string;
	'950': string;
}

/** Syntax-highlighting roles. Variables and ordinary identifiers fall through
 *  to body `text`; only the meaning-bearing roles get distinct colours. */
export interface SyntaxTokens {
	keyword: string;
	function: string;
	string: string;
	number: string;
	type: string;
	comment: string;
	punctuation: string;
	variable: string;
}

/** Recursive deep-partial. Every namespace optional; every leaf optional. */
export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

/** Partial token contract — for mode overlays, presets, and site overrides.
 *  Authors only specify the tokens they want to change; everything else
 *  inherits from the next-outer layer via CSS variable cascade. */
export type PartialTokenContract = DeepPartial<TokenContract>;

/** A per-mode overlay — a {@link PartialTokenContract} plus its own optional
 *  {@link ThemeTokensConfig.extra} escape hatch for mode-specific theme tokens.
 *  Useful when a Shiki-style alias has different values in light vs dark. */
export type ThemeTokensModeOverlay = PartialTokenContract & {
	/** Mode-specific theme tokens outside the universal contract. Emitted into
	 *  the same selector as the rest of the mode overlay. */
	extra?: Record<string, string>;
};

/** The authoring-side shape — what preset modules export and what users
 *  author in `refrakt.config.json` → `theme.tokens`.
 *
 *  Composed of:
 *  - the partial contract itself (base-mode overrides)
 *  - optional per-mode overlays keyed by mode name (e.g. `dark`)
 *  - an `extra` escape hatch for theme-specific tokens outside the contract */
export interface ThemeTokensConfig extends PartialTokenContract {
	/** Per-mode token overlays applied via `[data-theme="<mode>"]` and the
	 *  matching `prefers-color-scheme` media query. Mode `dark` is conventional;
	 *  any name is valid (e.g. `high-contrast`, `sepia`, `print`). */
	modes?: Record<string, ThemeTokensModeOverlay>;

	/** Theme-specific tokens that don't fit the universal contract. Emitted as
	 *  `:root { --<key>: <value> }`. Use sparingly — adding to the contract is
	 *  preferred for anything reusable across themes. */
	extra?: Record<string, string>;
}
