import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Nord — an *integrated* palette preset (canvas + foreground).
 *
 * Where niwaki took the scoped "foreground only" position deliberately,
 * Nord takes the integrated position because that's how Nord was designed:
 * its 16 hues were tuned against Polar Night `nord0` specifically, and
 * rendering Nord's foreground on a warm or neutral canvas misrepresents
 * the palette's intent. Nord therefore sets `color.code.*` alongside
 * `syntax.*` so opting in produces code blocks on Nord's canonical
 * canvas. Chrome (body bg, surfaces, buttons, borders) stays in whatever
 * theme is active — the override is bounded to the code surface.
 *
 * Composes:
 *   - `presets: ["nord"]` → Nord syntax on Nord canvas, neutral chrome elsewhere
 *   - `presets: ["tideline", "nord"]` → tideline chrome with Nord code surface
 *   - Used as a tint via `tints: { nord: { extends: ".../presets/nord" } }`
 *     (WORK-223 unlocks this) to showcase Nord on a site whose active
 *     preset is something else.
 *
 * Derived from the Nord palette by Arctic Ice Studio & Sven Greb,
 * MIT licensed. https://www.nordtheme.com/
 *
 * The Nord palette is structured as four named groups:
 *   - Polar Night (nord0–3): the dark canvas and its near-canvas elevation
 *   - Snow Storm (nord4–6): the light/text family and the light canvas
 *   - Frost      (nord7–10): cool blue accents — types, functions, keywords
 *   - Aurora     (nord11–15): warm accents — red, orange, yellow, green, purple
 *
 * Role assignments below follow Nord's own syntax-highlighting reference.
 * Where SPEC-056's extended roles (`type`, `tag`, `attribute`, ...) let
 * Nord's intended hue splits land on distinct refrakt roles, we set them
 * explicitly; where Nord collapses two roles to the same hue, we leave
 * the optional role unset and let the fallback chain carry the value.
 */
const nord: ThemeTokensConfig = {
	// Light mode — Snow Storm canvas with Polar Night foreground. Nord is
	// dark-canonical; the light variant is a swap of the canvas/text axis
	// while keeping the same Frost + Aurora accents at slightly darker
	// values for contrast on the lighter background.
	color: {
		code: {
			bg: '#eceff4',         // Snow Storm nord6 — Nord's light canvas
			text: '#2e3440',       // Polar Night nord0 — Nord's text on light
			'inline-bg': '#e5e9f0', // Snow Storm nord5
		},
	},
	syntax: {
		keyword:  '#5e81ac',   // Frost nord10 — slightly darker for light contrast
		function: '#88c0d0',   // Frost nord8
		type:     '#8fbcbb',   // Frost nord7 — distinct from function (the SPEC-056 motivating split)
		string:   '#a3be8c',   // Aurora nord14
		constant: '#b48ead',   // Aurora nord15 — purple for booleans/null/symbols
		comment:  '#4c566a',   // Polar Night nord3 — muted on light canvas
		punctuation: '#4c566a', // Polar Night nord3
		variable: '#2e3440',   // Polar Night nord0 — body text on light

		// Extended roles where Nord's spec has a distinct intent
		number:    '#d08770',   // Aurora nord12 — orange, separating numbers from string-constants
		regex:     '#ebcb8b',   // Aurora nord13 — yellow regex hue
		tag:       '#5e81ac',   // Frost nord10 — Nord renders HTML tags as deep Frost
		attribute: '#8fbcbb',   // Frost nord7 — Nord aligns attribute names with type-family
		operator:  '#81a1c1',   // Frost nord9 — Nord splits operators from punctuation, painting them as keyword-family
		// `parameter` and `property` and `link`, `string-expression` left unset:
		// Nord doesn't separately spec them, so they cascade via the fallback
		// chain (parameter→variable, property→variable, link→function,
		// string-expression→string).
	},

	modes: {
		dark: {
			color: {
				code: {
					bg: '#2e3440',         // Polar Night nord0 — Nord's canonical dark canvas
					text: '#d8dee9',       // Snow Storm nord4
					'inline-bg': '#3b4252', // Polar Night nord1 — slightly elevated
				},
			},
			syntax: {
				keyword:  '#81a1c1',  // Frost nord9
				function: '#88c0d0',  // Frost nord8
				type:     '#8fbcbb',  // Frost nord7
				string:   '#a3be8c',  // Aurora nord14
				constant: '#b48ead',  // Aurora nord15
				comment:  '#616e88',  // between nord3 and nord4 — Nord-spec'd comment on dark
				punctuation: '#d8dee9', // Snow Storm nord4 — Nord's punctuation reads as default text
				variable: '#d8dee9',  // Snow Storm nord4

				number:    '#b48ead',  // Aurora nord15 in dark; some Nord impls use nord12 — picking nord15 for harmony with constant
				regex:     '#ebcb8b',  // Aurora nord13
				tag:       '#81a1c1',  // Frost nord9 in dark
				attribute: '#8fbcbb',  // Frost nord7
				operator:  '#81a1c1',  // Frost nord9
			},
		},
	},
};

export default nord;
