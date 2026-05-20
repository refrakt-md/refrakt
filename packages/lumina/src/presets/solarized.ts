import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Solarized — Ethan Schoonover's iconic 2011 palette, designed for both
 * light and dark canvases using the same 16 hues. The eight accent colours
 * (yellow, orange, red, magenta, violet, blue, cyan, green) are identical
 * across modes; only the canvas / text family flips (base3 → base03 for
 * canvas, base00 → base0 for text).
 *
 * This is the lineup's deliberately mode-symmetric palette — the test case
 * for SPEC-057's "one preset per palette identity, light + dark in
 * modes.dark" decision. Most palettes shift hues between modes; Solarized
 * is the exception that proves the contract handles it.
 *
 * The 16-colour palette:
 *
 *   Base tones (mode-flipped):
 *     base03  #002b36  darkest    base3   #fdf6e3  lightest
 *     base02  #073642             base2   #eee8d5
 *     base01  #586e75  comments / secondary content (both modes)
 *     base00  #657b83  light text / dark muted
 *     base0   #839496  dark text / light muted
 *     base1   #93a1a1  optional emphasised content
 *
 *   Accents (identical across modes):
 *     yellow  #b58900    type, class
 *     orange  #cb4b16    number, identifier
 *     red     #dc322f    keyword, tag
 *     magenta #d33682    function (alt) — used here for string-expression
 *     violet  #6c71c4    constant, operator
 *     blue    #268bd2    function-call
 *     cyan    #2aa198    string
 *     green   #859900    comment-string, regex
 *
 * Derived from Solarized by Ethan Schoonover, MIT licensed.
 * https://ethanschoonover.com/solarized/
 */
const solarized: ThemeTokensConfig = {
	// Light mode — base3 canvas with base00 text. The eight accents are
	// shared with the dark mode (see comment in modes.dark).
	color: {
		bg: '#fdf6e3',           // base3  — canonical light canvas
		text: '#657b83',         // base00 — light text
		muted: '#93a1a1',        // base1  — light muted / optional emphasis
		border: '#eee8d5',       // base2  — light secondary surface as border
		primary: '#268bd2',      // blue   — Solarized's interactive accent
		'primary-hover': '#2aa198', // cyan
		surface: {
			base: '#eee8d5',     // base2 — light elevated card
			hover: '#fdf6e3',
			active: '#eee8d5',
			raised: '#fdf6e3',
		},
		code: {
			bg: '#fdf6e3',         // base3 — uniform canvas in light mode
			text: '#657b83',       // base00
			'inline-bg': '#eee8d5', // base2 — slight elevation for inline code
		},
	},
	syntax: {
		keyword:  '#dc322f',   // red     — control flow, declarations
		function: '#268bd2',   // blue    — function names
		type:     '#b58900',   // yellow  — Solarized's "class/type" colour
		string:   '#2aa198',   // cyan    — strings
		constant: '#6c71c4',   // violet  — language constants
		comment:  '#93a1a1',   // base1   — comments (Solarized uses lighter base in light mode)
		punctuation: '#657b83', // base00  — Solarized treats punctuation as default text
		variable: '#657b83',   // base00  — identifiers read as default text

		// Extended roles — same accent palette as the core roles
		number:    '#cb4b16',   // orange  — Solarized splits numbers from boolean-constants
		regex:     '#859900',   // green   — Solarized's "string-special" colour
		tag:       '#dc322f',   // red     — HTML/JSX tags read like keywords in Solarized
		attribute: '#268bd2',   // blue    — attribute names align with function-family
		operator:  '#6c71c4',   // violet  — Solarized's operator colour
		'string-expression': '#d33682', // magenta — interpolations get the magenta accent
		// `parameter`, `property`, `link` left unset (cascade through fallback).
	},

	modes: {
		dark: {
			color: {
				bg: '#002b36',           // base03 — canonical dark canvas
				text: '#839496',         // base0  — dark text
				muted: '#586e75',        // base01 — dark muted
				border: '#073642',       // base02 — dark secondary surface as border
				primary: '#268bd2',      // blue   — same as light (accents are mode-symmetric)
				'primary-hover': '#2aa198', // cyan
				surface: {
					base: '#073642',     // base02 — dark elevated card
					hover: '#586e75',
					active: '#586e75',
					raised: '#073642',
				},
				code: {
					bg: '#002b36',         // base03 — uniform canvas in dark mode
					text: '#839496',       // base0
					'inline-bg': '#073642', // base02 — slight elevation
				},
			},
			// Solarized's design intent: accent hues are mode-symmetric. The
			// values below are intentionally identical to the base block —
			// restated rather than omitted, so a reader looking at just the
			// dark block sees the full picture.
			syntax: {
				keyword:  '#dc322f',   // red
				function: '#268bd2',   // blue
				type:     '#b58900',   // yellow
				string:   '#2aa198',   // cyan
				constant: '#6c71c4',   // violet
				comment:  '#586e75',   // base01 — comments use the darker base in dark mode
				punctuation: '#839496', // base0
				variable: '#839496',   // base0

				number:    '#cb4b16',   // orange
				regex:     '#859900',   // green
				tag:       '#dc322f',   // red
				attribute: '#268bd2',   // blue
				operator:  '#6c71c4',   // violet
				'string-expression': '#d33682', // magenta
			},
		},
	},
};

export default solarized;
