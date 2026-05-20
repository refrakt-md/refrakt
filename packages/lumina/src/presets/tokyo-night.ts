import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Tokyo Night — Enkia's blue-magenta-cyan palette inspired by the city's
 * neon-on-night aesthetic.
 *
 * Tokyo Night ships in three variants: **Storm** (dark, the canonical default),
 * **Moon** (lighter dark), and **Day** (light). Phase 1 of SPEC-057 ships
 * the canonical pair — Storm for dark, Day for light. Moon defers to a
 * future milestone.
 *
 * Tokyo Night is the lineup's most aggressive role-splitter. It deliberately
 * uses distinct hues for `type`, `function`, `parameter`, `keyword`, and
 * `number` — exercising SPEC-056's extended role contract more thoroughly
 * than any other lineup member. If Tokyo Night maps cleanly onto our
 * contract, the contract was sized correctly.
 *
 * Derived from Tokyo Night by Enkia, MIT licensed.
 * https://github.com/enkia/tokyo-night-vscode-theme
 */
const tokyoNight: ThemeTokensConfig = {
	// Day (light) base.
	color: {
		bg: '#e1e2e7',           // editor.background — canonical Day canvas
		text: '#3760bf',          // editor.foreground — Day's deep-blue text
		muted: '#848cb5',         // comment colour
		border: '#cbcdd9',        // slight separator
		primary: '#2e7de9',       // function blue — Day's interactive accent
		'primary-hover': '#007197', // class cyan
		surface: {
			base: '#d6d8de',     // slightly elevated card surface
			hover: '#cbcdd9',
			active: '#bdc0c9',
			raised: '#e9eaef',
		},
		code: {
			bg: '#d6d8de',         // elevated surface for code blocks
			text: '#3760bf',
			'inline-bg': '#cbcdd9',
		},
	},
	syntax: {
		keyword:  '#9854f1',   // magenta — Tokyo Night Day's keyword colour
		function: '#2e7de9',   // blue   — function names
		type:     '#007197',   // cyan   — class/type names (SPEC-056 split)
		string:   '#587539',   // deep green — strings
		constant: '#b15c00',   // orange — language constants
		comment:  '#848cb5',
		punctuation: '#3760bf', // foreground for default punctuation
		variable: '#3760bf',

		// Extended roles — Tokyo Night's main fidelity story
		number:    '#b15c00',   // orange — same as constant in Day; split out for traceability
		regex:     '#387068',   // teal — distinct from string green
		tag:       '#f52a65',   // red — JSX/HTML tags get a punchy distinct hue
		attribute: '#b15c00',   // orange — attributes align with number/constant family
		operator:  '#006c86',   // teal-cyan — Tokyo Night gives operators their own hue
		parameter: '#b15c00',   // orange — parameters in declaration position
		// `property`, `link`, `string-expression` left unset (cascade through fallback).
	},

	modes: {
		dark: {
			color: {
				bg: '#24283b',           // editor.background — canonical Storm canvas
				text: '#c0caf5',         // editor.foreground — Storm's bright lavender-white
				muted: '#565f89',        // comment colour
				border: '#3b4261',
				primary: '#7aa2f7',      // function blue
				'primary-hover': '#7dcfff', // cyan
				surface: {
					base: '#1f2335',     // slightly recessed
					hover: '#2b3047',
					active: '#3b4261',
					raised: '#1f2335',
				},
				code: {
					bg: '#1f2335',         // Storm's deeper code surface
					text: '#c0caf5',
					'inline-bg': '#2b3047',
				},
			},
			syntax: {
				keyword:  '#bb9af7',   // magenta — Storm keyword
				function: '#7aa2f7',   // blue
				type:     '#7dcfff',   // cyan — Storm's "class/type"
				string:   '#9ece6a',   // green
				constant: '#ff9e64',   // orange
				comment:  '#565f89',
				punctuation: '#c0caf5',
				variable: '#c0caf5',

				number:    '#ff9e64',   // orange — same as constant in Storm; split out for traceability
				regex:     '#b4f9f8',   // light cyan
				tag:       '#f7768e',   // red — Storm's tag colour
				attribute: '#e0af68',   // yellow — Storm attributes get a dedicated yellow
				operator:  '#89ddff',   // cyan-blue
				parameter: '#e0af68',   // yellow — Storm parameters in declaration
			},
		},
	},
};

export default tokyoNight;
