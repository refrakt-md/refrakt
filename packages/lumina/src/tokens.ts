import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Lumina's design tokens — the new **neutral default** palette landing in
 * v0.14.0 per SPEC-051. Warm-neutral surface, monochrome primary, the
 * "quiet spectrum walk" syntax palette (teal / violet / rust / ochre /
 * sage), and the four muted-earthy status colours.
 *
 * This is the *source of truth* for Lumina's runtime CSS values; the
 * hand-authored `tokens/base.css` and `tokens/dark.css` mirror it
 * verbatim and a coverage test keeps the two in lockstep.
 *
 * Sites that want the previous cream-and-navy appearance opt into the
 * `tideline` preset shipping alongside this default (see
 * `@refrakt-md/lumina/presets/tideline` once Chunk 7 lands).
 *
 * Sites that want Japanese-garden syntax colours on top of this neutral
 * chrome opt into the `niwaki` preset (Chunk 7).
 */
export const luminaTokens: ThemeTokensConfig = {
	font: {
		sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
		mono: "'JetBrains Mono', 'Fira Code', ui-monospace, 'Cascadia Code', monospace",
	},

	color: {
		text: '#1c1a17',
		muted: '#6b6661',
		border: '#e2e0dd',
		bg: '#f5f4f1',
		primary: '#1c1a17',
		'primary-hover': '#3a342d',

		// Warm-neutral axis from near-bg to near-text, eleven hand-picked stops.
		// Several stops intentionally overlap with semantic tokens (surface.base,
		// border, primary-hover, text) — that's normal; palette steps double as
		// the implementations of the named tokens at their lightness level.
		'primary-scale': {
			'50': '#fbfaf7',
			'100': '#f5f4f1',
			'200': '#ecebe8',
			'300': '#e2e0dd',
			'400': '#bfbab2',
			'500': '#94908a',
			'600': '#76716a',
			'700': '#5a564f',
			'800': '#3a342d',
			'900': '#2a2622',
			'950': '#1c1a17',
		},

		surface: {
			base: '#fbfaf7',
			hover: '#ecebe8',
			active: '#e2e0dd',
			raised: '#ffffff',
		},

		// Muted earthy status colours — same saturation/lightness band across all
		// four so no sentiment is more aggressive than another. Per SPEC-051.
		info: { base: '#34547a', bg: '#e8edf4', border: '#c5d2e0' },
		warning: { base: '#9c5a18', bg: '#f5ebd9', border: '#e0c9a3' },
		danger: { base: '#a83232', bg: '#f5e0e0', border: '#e0b8b8' },
		success: { base: '#2d6a3e', bg: '#e0eee4', border: '#b8d4be' },

		code: {
			bg: '#ebeae8',
			text: '#1c1a17',
			// Mapped to --rf-color-code-inline-bg per the contract.
			// `--rf-color-inline-code-bg` (legacy variable name) is emitted as an
			// alias via `extra` below for downstream CSS that still reads it.
			'inline-bg': '#e6e5e3',
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

	// The "quiet spectrum walk": teal → violet → rust → ochre → sage — cool,
	// cool, warm, warm, cool/warm. Spectrum-adjacent without shouting.
	syntax: {
		keyword: '#2a5c63',     // deep teal
		function: '#4a3b6e',    // slate violet
		string: '#8a3a3a',      // warm rust
		number: '#876327',      // antique ochre
		type: '#3a5c2a',        // sage moss
		comment: '#8a857d',     // warm muted (italic via rune CSS)
		punctuation: '#6b6661', // tonal — same as color.muted
		variable: '#1c1a17',    // tonal — same as color.text
	},

	modes: {
		dark: {
			color: {
				text: '#f6f4ef',
				muted: '#94908a',
				border: '#2a2825',
				bg: '#1a1a17',
				primary: '#f6f4ef',
				'primary-hover': '#d4cfc5',

				surface: {
					base: '#211f1c',
					hover: '#2a2825',
					active: '#353330',
					raised: '#292723',
				},

				info: { base: '#9bb4c7', bg: '#1f2530', border: '#3d4655' },
				warning: { base: '#d4a868', bg: '#2a2519', border: '#4a3f2a' },
				danger: { base: '#d48888', bg: '#2a1818', border: '#4a2a2a' },
				success: { base: '#7eb398', bg: '#1a2a1f', border: '#2a4a35' },

				code: {
					bg: '#222220',
					text: '#f6f4ef',
					'inline-bg': '#2b2b29',
				},
			},

			shadow: {
				xs: '0 1px 2px rgba(0,0,0,0.3)',
				sm: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
				md: '0 4px 12px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
				lg: '0 8px 24px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)',
			},

			// Dark-mode syntax — lifted and slightly desaturated from light values
			// so they read against the warm-near-black surface without shouting.
			syntax: {
				keyword: '#7eb6bc',     // light teal
				function: '#a89bc7',    // light slate violet
				string: '#c79a9a',      // light rust
				number: '#d4b07e',      // light antique ochre
				type: '#94b385',        // light sage
				comment: '#6b6661',     // warm muted (italic)
				punctuation: '#94908a', // = dark color.muted
				variable: '#f6f4ef',    // = dark color.text
			},

			// Legacy alias — kept until the rename is fully rolled out. All the
			// `rf-syntax-*` Shiki aliases (foreground/background/token-*) are
			// auto-derived from the `syntax.*` and `color.{text,code.bg}` values
			// above by the generator.
			extra: {
				'rf-color-inline-code-bg': '#2b2b29',
			},
		},
	},

	/** Lumina-specific tokens outside the universal contract. `rf-color-
	 *  inline-code-bg` is the legacy variable name for what the contract
	 *  calls `color.code.inline-bg` (→ `--rf-color-code-inline-bg`).
	 *  Aliased here so downstream CSS that reads the old name keeps
	 *  working through v0.14.0; rename target is a future cleanup.
	 *
	 *  The Shiki aliases (`--rf-syntax-foreground`, `--rf-syntax-background`,
	 *  and `--rf-syntax-token-*`) are auto-derived by the generator from
	 *  `color.text`, `color.code.bg`, and `syntax.*` — no need to repeat
	 *  them here. */
	extra: {
		'rf-color-inline-code-bg': '#e6e5e3',
	},
};
