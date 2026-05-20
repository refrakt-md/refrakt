import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Catppuccin — soft-pastel palette family by the Catppuccin organisation.
 *
 * Catppuccin publishes four flavours: **Latte** (light), Frappé, Macchiato,
 * and **Mocha** (dark). Phase 1 of SPEC-057 ships the canonical pair —
 * Latte for light, Mocha for dark — as a single integrated preset.
 * Frappé and Macchiato (the mid-darks) defer to a future milestone.
 *
 * Catppuccin is unusually well-documented for an open-source palette: each
 * hue has a name and a documented syntax-highlighting role. Refrakt's
 * SPEC-056 extended-role contract maps cleanly onto Catppuccin's intent —
 * Mauve for keywords, Blue for functions, Yellow for types, Peach for
 * numbers, Pink for regex, Sky for operators.
 *
 * Derived from Catppuccin by the Catppuccin organisation, MIT licensed.
 * https://catppuccin.com/
 */
const catppuccin: ThemeTokensConfig = {
	// Latte (light) base.
	color: {
		bg: '#eff1f5',           // Base — canonical Latte canvas
		text: '#4c4f69',         // Text
		muted: '#6c6f85',        // Subtext0
		border: '#dce0e8',       // Crust — softest separator
		primary: '#1e66f5',      // Blue — Catppuccin's interactive accent
		'primary-hover': '#7287fd', // Lavender
		surface: {
			base: '#e6e9ef',     // Mantle — slightly elevated card
			hover: '#dce0e8',    // Crust
			active: '#ccd0da',   // Surface0
			raised: '#eff1f5',
		},
		code: {
			bg: '#e6e9ef',         // Mantle
			text: '#4c4f69',       // Text
			'inline-bg': '#dce0e8', // Crust
		},
	},
	syntax: {
		keyword:  '#8839ef',   // Mauve  — keywords (declarations, control flow)
		function: '#1e66f5',   // Blue   — function names
		type:     '#df8e1d',   // Yellow — class/type names
		string:   '#40a02b',   // Green  — strings
		constant: '#fe640b',   // Peach  — numbers, booleans, language constants
		comment:  '#9ca0b0',   // Overlay0 — comments
		punctuation: '#7c7f93', // Overlay2 — Catppuccin paints punctuation muted
		variable: '#4c4f69',   // Text   — identifiers as default text

		// Extended roles — Catppuccin's syntax style guide names these
		number:    '#fe640b',   // Peach  — same as constant in Catppuccin's spec
		regex:     '#ea76cb',   // Pink   — distinct from string green
		tag:       '#8839ef',   // Mauve  — JSX/HTML tags read like keywords
		attribute: '#df8e1d',   // Yellow — attributes align with type-family
		operator:  '#04a5e5',   // Sky    — Catppuccin's dedicated operator hue
		parameter: '#e64553',   // Maroon — Catppuccin uses Maroon for parameters
		'string-expression': '#ea76cb', // Pink — template interpolations
		// `property`, `link` left unset (cascade through fallback).
	},

	modes: {
		dark: {
			color: {
				bg: '#1e1e2e',           // Base — canonical Mocha canvas
				text: '#cdd6f4',         // Text
				muted: '#a6adc8',        // Subtext0
				border: '#313244',       // Surface0
				primary: '#89b4fa',      // Blue — brighter on dark
				'primary-hover': '#b4befe', // Lavender
				surface: {
					base: '#181825',     // Mantle
					hover: '#313244',    // Surface0
					active: '#45475a',   // Surface1
					raised: '#181825',
				},
				code: {
					bg: '#181825',         // Mantle — Catppuccin's code-surface convention
					text: '#cdd6f4',       // Text
					'inline-bg': '#313244', // Surface0
				},
			},
			syntax: {
				keyword:  '#cba6f7',   // Mauve  — Mocha keyword
				function: '#89b4fa',   // Blue
				type:     '#f9e2af',   // Yellow
				string:   '#a6e3a1',   // Green
				constant: '#fab387',   // Peach
				comment:  '#6c7086',   // Overlay0 — Mocha comment
				punctuation: '#9399b2', // Overlay2
				variable: '#cdd6f4',   // Text

				number:    '#fab387',   // Peach
				regex:     '#f5c2e7',   // Pink
				tag:       '#cba6f7',   // Mauve
				attribute: '#f9e2af',   // Yellow
				operator:  '#89dceb',   // Sky
				parameter: '#eba0ac',   // Maroon
				'string-expression': '#f5c2e7', // Pink
			},
		},
	},
};

export default catppuccin;
