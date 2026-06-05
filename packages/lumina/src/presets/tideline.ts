import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Tideline — Lumina's "warm + branded" full preset, named after the boundary
 * where land meets water. Restores the cream-and-maritime-navy palette
 * Lumina shipped pre-v0.14.0, with one deliberate upgrade: typography
 * switches from Outfit to IBM Plex Sans / Plex Mono per SPEC-051.
 *
 * Opt in:
 *
 *   ```jsonc
 *   {
 *     "site": {
 *       "theme": {
 *         "package": "@refrakt-md/lumina",
 *         "presets": ["@refrakt-md/lumina/presets/tideline"]
 *       }
 *     }
 *   }
 *   ```
 *
 * Sites that specifically depended on the Outfit font can pin it back via
 * `theme.tokens.font.sans` after opting in to the rest of tideline.
 */
const tideline: ThemeTokensConfig = {
	font: {
		sans: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
		mono: "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
	},

	color: {
		text: '#1d3557',
		muted: '#5a7a90',
		border: '#d8e4de',
		bg: '#faf5eb',
		primary: '#457b9d',
		'primary-hover': '#376585',

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
			'inline-bg': '#f9ebcc',
		},
	},

	syntax: {
		keyword: '#f2cc8f',
		function: '#70b4c0',
		string: '#a8dadc',
		constant: '#e8c07a',
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

			syntax: {
				keyword: '#f2cc8f',
				function: '#a8dadc',
				string: '#a8dadc',
				constant: '#e8c07a',
				comment: '#5a7a90',
				punctuation: '#70b4c0',
				variable: '#b8d6e2',
			},

			// All `rf-syntax-*` Shiki aliases (token-*, foreground) auto-derive
			// from `syntax.*` and `color.text` above. `rf-syntax-background`
			// is set explicitly because tideline uses a deeper navy for the
			// Shiki bg (#0c162a) than the outer `color.code.bg` (#152238).
			extra: {
				'rf-color-inline-code-bg': 'rgba(168, 218, 220, 0.08)',
				'rf-syntax-background': '#0c162a',
			},
		},
	},

	// Shiki aliases auto-derive from `syntax.*` and `color.{text,code.bg}`
	// above. Only the legacy `rf-color-inline-code-bg` alias needs an
	// explicit entry.
	extra: {
		'rf-color-inline-code-bg': '#f9ebcc',
	},
};

export default tideline;
