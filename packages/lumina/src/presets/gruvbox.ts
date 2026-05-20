import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Gruvbox — Pavel Pertsev's warm retro palette. Earthy oranges, deep greens,
 * mustard yellows, and Mediterranean reds on a coffee-and-cream canvas.
 *
 * Gruvbox is the lineup's only **warm** palette — the counterweight to five
 * blue/cool members. It's also the most "unix terminal heritage" of the
 * lineup: the original gruvbox was a Vim colorscheme, and the syntax
 * conventions trace from that lineage rather than the modern editor-theme
 * scene.
 *
 * Phase 1 ships **light medium + dark medium**, the canonical pair. Gruvbox
 * also ships "soft" and "hard" contrast levels per mode — those defer to a
 * future milestone if there's demand.
 *
 * Derived from Gruvbox by Pavel Pertsev (morhetz), MIT licensed.
 * https://github.com/morhetz/gruvbox
 */
const gruvbox: ThemeTokensConfig = {
	// Light medium base.
	color: {
		bg: '#fbf1c7',           // bg0 — canonical light canvas (warm cream)
		text: '#3c3836',         // fg1 — default text
		muted: '#928374',        // gray — secondary content
		border: '#d5c4a1',       // bg2
		primary: '#076678',      // faded_blue — Gruvbox's interactive accent
		'primary-hover': '#427b58', // faded_aqua
		surface: {
			base: '#ebdbb2',     // bg1 — slightly elevated card
			hover: '#d5c4a1',    // bg2
			active: '#bdae93',   // bg3
			raised: '#fbf1c7',
		},
		code: {
			bg: '#ebdbb2',         // bg1 — code surface
			text: '#3c3836',
			'inline-bg': '#d5c4a1', // bg2
		},
	},
	syntax: {
		keyword:  '#9d0006',   // faded_red — Statement.Keyword
		function: '#b57614',   // faded_yellow — function names
		type:     '#79740e',   // faded_green — types/classes
		string:   '#79740e',   // faded_green — strings (same family as types)
		constant: '#8f3f71',   // faded_purple — language constants
		comment:  '#928374',   // gray
		punctuation: '#3c3836', // fg1 — default text
		variable: '#3c3836',   // fg1

		// Extended roles
		number:    '#8f3f71',   // faded_purple — numbers
		regex:     '#af3a03',   // faded_orange — regex
		tag:       '#9d0006',   // faded_red — HTML/JSX tags
		attribute: '#076678',   // faded_blue — attribute names
		operator:  '#af3a03',   // faded_orange — operators (Gruvbox's "Special")
		'string-expression': '#427b58', // faded_aqua — interpolation
		// `parameter`, `property`, `link` left unset.
	},

	modes: {
		dark: {
			color: {
				bg: '#282828',           // bg0 — canonical dark canvas
				text: '#ebdbb2',         // fg1 — default text
				muted: '#928374',        // gray
				border: '#504945',       // bg2
				primary: '#83a598',      // bright_blue — Gruvbox's interactive accent on dark
				'primary-hover': '#8ec07c', // bright_aqua
				surface: {
					base: '#3c3836',     // bg1
					hover: '#504945',    // bg2
					active: '#665c54',   // bg3
					raised: '#3c3836',
				},
				code: {
					bg: '#282828',         // bg0 — uniform dark canvas
					text: '#ebdbb2',
					'inline-bg': '#3c3836', // bg1
				},
			},
			syntax: {
				keyword:  '#fb4934',   // bright_red — keywords
				function: '#fabd2f',   // bright_yellow — functions
				type:     '#b8bb26',   // bright_green — types
				string:   '#b8bb26',   // bright_green — strings
				constant: '#d3869b',   // bright_purple — constants
				comment:  '#928374',
				punctuation: '#ebdbb2',
				variable: '#ebdbb2',

				number:    '#d3869b',   // bright_purple — numbers
				regex:     '#fe8019',   // bright_orange — regex
				tag:       '#fb4934',   // bright_red — tags
				attribute: '#83a598',   // bright_blue — attributes
				operator:  '#fe8019',   // bright_orange — operators
				'string-expression': '#8ec07c', // bright_aqua — interpolation
			},
		},
	},
};

export default gruvbox;
