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
 * - `text.base` → `--rf-text` *(base segment dropped)*
 * - `text.lg` → `--rf-text-lg`
 * - `weight.semibold` → `--rf-weight-semibold`
 * - `leading.normal` → `--rf-leading-normal`
 * - `tracking.wide` → `--rf-tracking-wide`
 * - `font.display` → `--rf-font-display`
 */
export interface TokenContract {
	/** Font-family tokens. The numeric type *scale*, weights, line-heights, and
	 *  tracking live in the sibling `text` / `weight` / `leading` / `tracking`
	 *  namespaces (SPEC-094); this namespace carries only the families. */
	font: {
		/** Primary text family used for body and most UI. Includes its full
		 *  fallback stack — e.g. `"'Inter', system-ui, -apple-system, sans-serif"`. */
		sans: string;
		/** Monospace family used for code blocks and inline code. */
		mono: string;
		/** Display / heading family. Carries a theme's headline voice and is the
		 *  primary lever an editorial or magazine theme uses to read unlike a
		 *  product/docs theme. May be a serif, a high-contrast sans, or simply
		 *  match `sans` for a unified neutral theme. Includes its fallback stack. */
		display: string;
	};

	/** Modular type scale (SPEC-094). Step keys follow the familiar
	 *  `xs … 4xl` convention; `base` is the body anchor and — per the
	 *  CSS-variable mapping rule — drops its segment, so `text.base` is
	 *  `--rf-text` and `text.lg` is `--rf-text-lg`. Values are sizes
	 *  (`rem`/`em`/`px`); a theme can derive them from a base size + ratio or
	 *  set each step explicitly. */
	text: {
		xs: string;
		sm: string;
		base: string;
		lg: string;
		xl: string;
		'2xl': string;
		'3xl': string;
		'4xl': string;
	};

	/** Font-weight tokens (SPEC-094). Numeric CSS weights; a theme maps the
	 *  named steps onto whatever weights its families ship. */
	weight: {
		light: string;
		normal: string;
		medium: string;
		semibold: string;
		bold: string;
	};

	/** Line-height tokens (SPEC-094). Unitless multipliers from `tight`
	 *  (headings) to `loose` (airy body). `normal` is the default body leading. */
	leading: {
		tight: string;
		snug: string;
		normal: string;
		relaxed: string;
		loose: string;
	};

	/** Letter-spacing / tracking tokens (SPEC-094). `em`-relative so they
	 *  track font size; `normal` is `0`, negative values tighten large display
	 *  type, positive values open up small uppercase eyebrows. */
	tracking: {
		tight: string;
		normal: string;
		wide: string;
		wider: string;
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
		/** Subtle primary-tinted background wash — the `primary` member of the
		 *  `{semantic}-bg` family. Derive it (`color-mix` off `primary`) so it
		 *  tracks any override in both modes. */
		'primary-bg': string;
		/** Foreground (text/icons) for content sitting on a `primary` fill.
		 *  Flips per mode when `primary` does. */
		'on-primary': string;

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

		/** Line-level annotation tokens shared by snippet / codegroup / diff
		 *  (WORK-304). `highlight` is the neutral surface tint applied to
		 *  `[data-line-status="highlight"]` rows; `highlight-rail` is the
		 *  left-edge border colour (kept as a separate token so themes can
		 *  repaint the rail without touching the row background); `number`
		 *  is the gutter colour for `pre[data-linenumbers]`. */
		line: {
			highlight: string;
			'highlight-rail': string;
			number: string;
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
		none: string;
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

/** Syntax-highlighting roles. Variables and ordinary identifiers fall through
 *  to body `text`; only the meaning-bearing roles get distinct colours.
 *
 *  The contract is **tiered** (SPEC-056): seven required core roles cover
 *  everything a theme must define to render code at all, and nine optional
 *  extended roles let preset authors faithfully carry palettes that
 *  intentionally split distinctions the core collapses. Each optional role
 *  falls back to a documented core role via a `var()` chain emitted by the
 *  CSS generator — so a preset that doesn't set the optional role still
 *  renders correctly, just with less fidelity than a preset that does.
 *
 *  Naming follows Shiki's `token-*` vocabulary rather than language-specific
 *  intuition. One role that might surprise you: `constant` covers boolean/
 *  null/Symbol-style language constants AND numeric literals by default —
 *  Shiki paints them all from one slot. Palettes that distinguish numbers
 *  (e.g. Tokyo Night, One Dark) can set the optional `number` role to split
 *  them out. */
export interface SyntaxTokens {
	// ── Required core ────────────────────────────────────────────────────────

	keyword: string;
	function: string;
	string: string;
	constant: string;
	comment: string;
	punctuation: string;
	variable: string;

	// ── Optional, existing ───────────────────────────────────────────────────

	/** URL/link tokens — markdown links, autolinks, comment URLs. Falls back
	 *  to `function` when unset, so themes that don't care about distinguishing
	 *  link from function can omit it. Set explicitly when you want a distinct
	 *  colour. */
	link?: string;

	/** Interpolated expressions inside template literals (the `${foo}` part
	 *  of a backtick string). Falls back to `string` when unset. Set explicitly
	 *  when you want template-literal expressions to read distinctly from the
	 *  surrounding string. */
	'string-expression'?: string;

	// ── Optional, extended (SPEC-056) ────────────────────────────────────────

	/** Type names, class names, interface names, generic parameters. Falls
	 *  back to `function` when unset. Palettes that intentionally split type
	 *  from function (Nord's Frost-7 vs Frost-8, Dracula's Cyan vs Green,
	 *  Tokyo Night, One Dark, Catppuccin) set this; minimal palettes leave
	 *  it unset and accept that types and functions share a colour. */
	type?: string;

	/** Object property access (`foo.bar`), object literal keys. Falls back
	 *  to `variable` when unset. Some palettes paint properties as muted
	 *  text; others give them a dedicated hue. */
	property?: string;

	/** Function/method parameters in declaration position. Falls back to
	 *  `variable` when unset. Palettes that italicise or hue-shift
	 *  parameters in declarations set this. */
	parameter?: string;

	/** JSX/HTML/XML element tag names. Falls back to `keyword` when unset —
	 *  most palettes paint tags like keywords because both read as
	 *  "control structure." Set explicitly when you want tags to read
	 *  distinctly. */
	tag?: string;

	/** JSX/HTML/XML attribute names. Falls back to `function` when unset.
	 *  Many palettes paint attributes the same as function names because
	 *  they're both "named callables / addressable bindings." */
	attribute?: string;

	/** Arithmetic, comparison, logical operators (`+`, `===`, `&&`, etc.).
	 *  Falls back to `punctuation` when unset. Most palettes don't split
	 *  operators from punctuation; the ones that do (Tokyo Night, some
	 *  Solarized variants) get a dedicated hue. */
	operator?: string;

	/** Numeric literals — split out when a palette colours numbers distinctly
	 *  from booleans/null/Symbol-style constants. Falls back to `constant`
	 *  when unset. */
	number?: string;

	/** Regular expression literals. Falls back to `string` when unset. */
	regex?: string;
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
