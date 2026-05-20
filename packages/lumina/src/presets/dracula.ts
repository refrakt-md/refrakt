import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Dracula — an *integrated* palette preset (chrome + canvas + foreground),
 * dark-only.
 *
 * Created by Zeno Rocha and contributors. One of the most installed editor
 * themes on the planet, distinguished by its purple/pink/cyan accents on a
 * near-black canvas. MIT licensed.
 *
 * Dark-canonical with no official light variant — this preset ships only
 * `modes.dark` populated. When opted in as the active site preset, Dracula
 * effectively forces dark rendering (light mode has no Dracula values).
 * When opted in as a scoped tint (`{% tint preset="dracula" %}`), the
 * dark variables only apply when the surrounding scheme is dark or the
 * page locks the section to dark via `tint-mode="dark"`.
 *
 * Role mapping follows Dracula's official syntax specification — the
 * palette is one of the more thoroughly documented in the lineup, with
 * named swatches and explicit role intent. SPEC-056's extended roles
 * (`type`, `tag`, `attribute`, `operator`, `number`, `regex`) land
 * cleanly on Dracula's published intent.
 *
 * Derived from Dracula by Zeno Rocha and contributors, MIT licensed.
 * https://draculatheme.com/
 */
const dracula: ThemeTokensConfig = {
	// No light-mode values — Dracula is dark-canonical. When Dracula is
	// applied as a tint to a section on a light page, chrome accents fall
	// back to the surrounding theme; only the dark values below project.
	modes: {
		dark: {
			color: {
				bg: '#282a36',           // Background — canonical Dracula canvas
				text: '#f8f8f2',         // Foreground
				muted: '#6272a4',        // Comment — soft slate-blue
				border: '#44475a',       // Current Line / Selection
				primary: '#bd93f9',      // Purple — Dracula's interactive accent
				'primary-hover': '#ff79c6', // Pink on hover
				surface: {
					base: '#44475a',     // Current Line — slightly elevated card
					hover: '#6272a4',    // Comment slate
					active: '#6272a4',
					raised: '#44475a',
				},
				code: {
					bg: '#282a36',         // Same as canvas — Dracula intends a uniform dark surface
					text: '#f8f8f2',
					'inline-bg': '#44475a', // Current Line — slight elevation for inline code
				},
			},
			syntax: {
				keyword:  '#ff79c6',  // Pink — Dracula's "keyword" colour (declarations, control flow)
				function: '#50fa7b',  // Green — Dracula's "method/function" colour
				type:     '#8be9fd',  // Cyan — Dracula's "class/type" colour (the SPEC-056 motivating split)
				string:   '#f1fa8c',  // Yellow — Dracula's "string" colour
				constant: '#bd93f9',  // Purple — Dracula's "boolean/null" colour
				comment:  '#6272a4',  // Comment — soft slate-blue
				punctuation: '#f8f8f2', // Foreground — Dracula uses foreground for punctuation
				variable: '#f8f8f2',  // Foreground — identifiers read as default text

				// Extended roles where Dracula's spec has a distinct intent
				number:    '#bd93f9',  // Purple — Dracula colours numbers with the constant family
				regex:     '#ff5555',  // Red — Dracula's "regex" colour, distinct from string yellow
				tag:       '#ff79c6',  // Pink — JSX/HTML tags read like keywords
				attribute: '#50fa7b',  // Green — JSX/HTML attributes align with function-family
				operator:  '#ff79c6',  // Pink — Dracula treats operators as keyword-family
				// `parameter`, `property`, `link`, `string-expression` left unset:
				// Dracula doesn't separately spec them, so they cascade via the
				// fallback chain.
			},
		},
	},
};

export default dracula;
