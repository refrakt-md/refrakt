import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Lumina's design tokens, expressed against the typed {@link TokenContract}
 * from SPEC-048. This is the *source of truth* for Lumina's runtime CSS
 * values — every `--rf-*` custom property in `packages/lumina/tokens/base.css`
 * has a corresponding entry here, and dark-mode overrides live under
 * `modes.dark`.
 *
 * The hand-authored `tokens/base.css` and `tokens/dark.css` files continue
 * to ship for the v0.14.0 window so consumers see no behavioural change.
 * A coverage test in `test/token-config-coverage.test.ts` keeps the two in
 * lockstep — if either drifts, the test fails.
 *
 * Adapters that consume site-level `theme.tokens` / `theme.presets` /
 * `theme.modes` overrides merge those layers on top of this base before
 * emitting CSS. See `@refrakt-md/transform`'s `mergeThemeTokensConfigs`
 * and `generateThemeStylesheet`.
 */
export const luminaTokens: ThemeTokensConfig = {
	font: {
		sans: "'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
		mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
	},

	color: {
		text: '#1d3557',
		muted: '#5a7a90',
		border: '#d8e4de',
		bg: '#faf5eb',
		primary: '#457b9d',
		'primary-hover': '#376585',

		'primary-scale': {
			'50': '#f0f6f9',
			'100': '#dcebf0',
			'200': '#b8d6e2',
			'300': '#a8dadc',
			'400': '#70b4c0',
			'500': '#457b9d',
			'600': '#376585',
			'700': '#1d3557',
			'800': '#182c4a',
			'900': '#12213a',
			'950': '#0c162a',
		},

		surface: {
			base: '#fffbf2',
			hover: '#fdf0d5',
			active: '#f9ebcc',
			raised: '#ffffff',
		},

		info: { base: '#457b9d', bg: '#edf4f8', border: '#a8dadc' },
		warning: { base: '#c8900a', bg: '#fdf5e4', border: '#edd49a' },
		danger: { base: '#e63946', bg: '#fdeced', border: '#f0b0b5' },
		success: { base: '#3d8f65', bg: '#ecf5ef', border: '#a8d4b8' },

		code: {
			bg: '#1d3557',
			text: '#f1faee',
			// Maps to --rf-color-code-inline-bg per the contract; the legacy
			// `--rf-color-inline-code-bg` variable name continues to be emitted
			// as an alias from the Lumina CSS for backwards compatibility with
			// any downstream CSS that reads it. See WORK-191 for the full rename.
			'inline-bg': '#f9ebcc',
		},
	},

	radius: {
		sm: '6px',
		md: '10px',
		lg: '16px',
		full: '9999px',
	},

	spacing: {
		xs: '0.25rem',
		sm: '0.5rem',
		md: '1.5rem',
		lg: '2rem',
		xl: '3rem',
		'2xl': '4rem',
		section: {
			base: '4rem',
			tight: '1.5rem',
			loose: '6rem',
			breathe: '8rem',
		},
	},

	inset: {
		flush: '0',
		tight: '1rem',
		loose: '4rem',
		breathe: '8rem',
	},

	shadow: {
		xs: '0 1px 2px rgba(0,0,0,0.04)',
		sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
		md: '0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
		lg: '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
	},

	// Syntax palette — emitted as `--rf-syntax-keyword` etc. Lumina's CSS
	// additionally publishes `--rf-syntax-token-*` aliases that Shiki's
	// CSS-variables theme consumes; those aliases live in `extra` below so
	// the contract surface stays clean.
	syntax: {
		keyword: '#f2cc8f',
		function: '#70b4c0',
		string: '#a8dadc',
		number: '#e8c07a',
		type: '#70b4c0',
		comment: '#5a7a90',
		punctuation: '#a8dadc',
		variable: '#b8d6e2',
	},

	modes: {
		dark: {
			color: {
				text: '#f1faee',
				muted: '#a8dadc',
				border: 'rgba(168, 218, 220, 0.15)',
				bg: '#152238',
				primary: '#70b4c0',
				'primary-hover': '#a8dadc',

				surface: {
					base: '#1a2940',
					hover: '#203048',
					active: '#263850',
					raised: '#1a2940',
				},

				info: { base: '#a8dadc', bg: 'rgba(69, 123, 157, 0.12)', border: 'rgba(69, 123, 157, 0.3)' },
				warning: { base: '#e8c07a', bg: 'rgba(200, 144, 10, 0.12)', border: 'rgba(200, 144, 10, 0.3)' },
				danger: { base: '#f07078', bg: 'rgba(230, 57, 70, 0.12)', border: 'rgba(230, 57, 70, 0.3)' },
				success: { base: '#72c098', bg: 'rgba(61, 143, 101, 0.12)', border: 'rgba(61, 143, 101, 0.3)' },

				code: {
					bg: '#152238',
					text: '#f1faee',
					'inline-bg': 'rgba(168, 218, 220, 0.08)',
				},
			},

			shadow: {
				xs: '0 1px 2px rgba(0,0,0,0.3)',
				sm: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
				md: '0 4px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
				lg: '0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
			},

			// Dark-mode syntax — most colours stay the same, but function shifts
			// and the syntax background uses an even-deeper navy than code.bg.
			syntax: {
				keyword: '#f2cc8f',
				function: '#a8dadc',
				string: '#a8dadc',
				number: '#e8c07a',
				type: '#a8dadc',
				comment: '#5a7a90',
				punctuation: '#70b4c0',
				variable: '#b8d6e2',
			},

			// Dark-mode Shiki aliases — literal hex values matching the existing
			// dark.css. Kept as literals (not var() references) so per-mode
			// inheritance doesn't accidentally pick up the light-mode `syntax.*`
			// values. The contract surface stays clean; these are the bridge
			// to Shiki's hardcoded `--rf-syntax-token-*` consumption.
			extra: {
				'rf-color-inline-code-bg': 'rgba(168, 218, 220, 0.08)',
				'rf-syntax-foreground': '#f1faee',
				'rf-syntax-background': '#0c162a',
				'rf-syntax-token-keyword': '#f2cc8f',
				'rf-syntax-token-function': '#a8dadc',
				'rf-syntax-token-string': '#a8dadc',
				'rf-syntax-token-string-expression': '#a8dadc',
				'rf-syntax-token-constant': '#e8c07a',
				'rf-syntax-token-comment': '#5a7a90',
				'rf-syntax-token-parameter': '#b8d6e2',
				'rf-syntax-token-punctuation': '#70b4c0',
				'rf-syntax-token-link': '#a8dadc',
			},
		},
	},

	/** Lumina-specific tokens outside the universal contract.
	 *
	 *  - `rf-color-inline-code-bg` is the legacy variable name for what the
	 *    contract calls `color.code.inline-bg` (→ `--rf-color-code-inline-bg`).
	 *    Aliased here as a literal hex so downstream CSS that reads the old
	 *    name keeps working through v0.14.0; rename target is a future cleanup.
	 *  - `rf-syntax-foreground`/`background` and `rf-syntax-token-*` are the
	 *    custom property names Shiki's CSS-variables theme actually emits
	 *    (`createCssVariablesTheme({ variablePrefix: '--rf-syntax-' })` produces
	 *    `--rf-syntax-token-keyword` etc., with `token-` hardcoded inside
	 *    Shiki). Emitted as literal hex values so each mode controls its own
	 *    Shiki rendering independently — dark mode supplies its own overrides
	 *    via `modes.dark.extra`. */
	extra: {
		'rf-color-inline-code-bg': '#f9ebcc',
		'rf-syntax-foreground': '#f1faee',
		'rf-syntax-background': '#1d3557',
		'rf-syntax-token-keyword': '#f2cc8f',
		'rf-syntax-token-function': '#70b4c0',
		'rf-syntax-token-string': '#a8dadc',
		'rf-syntax-token-string-expression': '#a8dadc',
		'rf-syntax-token-constant': '#e8c07a',
		'rf-syntax-token-comment': '#5a7a90',
		'rf-syntax-token-parameter': '#b8d6e2',
		'rf-syntax-token-punctuation': '#a8dadc',
		'rf-syntax-token-link': '#70b4c0',
	},
};
