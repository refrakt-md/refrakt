import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * One Dark — Atom's signature dark theme. Created by the GitHub / Atom team.
 *
 * Phase 1 of SPEC-057 ships dark-only — the official "One Light" sibling
 * is a separate published theme rather than a `modes` overlay on the same
 * hue family, and defers to Phase 2.
 *
 * Important historical: Atom was the first widely-adopted editor with
 * custom theme APIs, and One Dark is the palette that defined the
 * "blue-grey canvas + warm accent" aesthetic now common across modern
 * editors (Tokyo Night and Catppuccin Mocha both trace lineage here).
 *
 * Derived from One Dark by GitHub / Atom contributors, MIT licensed.
 * https://github.com/atom/atom/tree/master/packages/one-dark-syntax
 *
 * Source variables: `packages/one-dark-syntax/styles/colors.less`.
 */
const oneDark: ThemeTokensConfig = {
	modes: {
		dark: {
			color: {
				bg: '#282c34',           // syntax-bg — canonical One Dark canvas
				text: '#abb2bf',         // mono-1 — default text
				muted: '#828997',        // mono-2 — secondary text
				border: '#3e4451',       // syntax-cursor-line / guide
				primary: '#528bff',      // syntax-accent — Atom's interactive blue
				'primary-hover': '#61afef', // hue-2 — function blue
				surface: {
					base: '#21252b',     // background-2 — elevated card
					hover: '#2c313a',
					active: '#3a3f4b',
					raised: '#21252b',
				},
				code: {
					bg: '#282c34',         // Same as canvas — Atom uses uniform dark surface
					text: '#abb2bf',
					'inline-bg': '#3e4451', // syntax-cursor-line for inline elevation
				},
			},
			syntax: {
				keyword:  '#c678dd',   // hue-3 (purple) — control flow, declarations
				function: '#61afef',   // hue-2 (blue)   — function names
				type:     '#e5c07b',   // hue-6-2 (yellow) — class/type names
				string:   '#98c379',   // hue-4 (green)  — strings
				constant: '#d19a66',   // hue-6 (orange) — numbers, booleans, language constants
				comment:  '#5c6370',   // mono-3        — comments
				punctuation: '#abb2bf', // mono-1       — default text for punctuation
				variable: '#e06c75',   // hue-5 (red)   — Atom uses red for variables / `this`

				// Extended roles where One Dark has a distinct intent
				number:    '#d19a66',   // hue-6 (orange) — same as constant; One Dark groups them
				regex:     '#56b6c2',   // hue-1 (cyan)   — distinct from string green
				tag:       '#e06c75',   // hue-5 (red)    — JSX/HTML tags
				attribute: '#d19a66',   // hue-6 (orange) — JSX/HTML attributes
				operator:  '#56b6c2',   // hue-1 (cyan)   — operators get their own hue
				// `parameter`, `property`, `link`, `string-expression` left unset
				// (cascade through fallback).
			},
		},
	},
};

export default oneDark;
