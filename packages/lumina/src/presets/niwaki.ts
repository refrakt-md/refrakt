import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Niwaki — a Japanese-garden-inspired *syntax-only* preset.
 *
 * Where tideline is a full identity overhaul (chrome + syntax + typography),
 * niwaki deliberately scopes to the seven syntax tokens. Code blocks render
 * in pine / sakura / momiji / wakaba / kuri / ishi; everything else inherits
 * from whichever chrome theme is layered above. Composes cleanly:
 *
 *   - `presets: ["niwaki"]` → Japanese-garden code on the neutral default
 *   - `presets: ["tideline", "niwaki"]` → tideline chrome + niwaki code
 *
 * The refrakt documentation site uses `["niwaki"]`. See `/docs/themes/lumina/presets/niwaki`.
 *
 * Cultural sensitivity: the preset is named in Japanese (niwaki = 庭木, the
 * cloud-pruned garden tree of Japanese tradition) and its colours reference
 * matsu (pine), sakura (cherry blossom), momiji (autumn maple), wakaba
 * (young leaf), kuri (chestnut/amber), and ishi (stone). The naming is a
 * deliberate homage; we don't claim cultural ownership.
 */
const niwaki: ThemeTokensConfig = {
	// Light-mode syntax — matsu / sakura / momiji / kuri / wakaba / ishi
	syntax: {
		keyword: '#2d5230',     // matsu — deep pine
		function: '#b35070',    // sakura — cherry blossom
		string: '#c4501c',      // momiji — autumn maple
		number: '#9c721a',      // kuri — chestnut amber
		type: '#6b8a35',        // wakaba — young leaf
		comment: '#7d7062',     // ishi — warm stone (italic via rune CSS)
		punctuation: '#8a7c6e', // muted ishi
		variable: '#1c1a17',    // = neutral default's text (inherits as fallback)
	},

	modes: {
		dark: {
			syntax: {
				keyword: '#b4c97a',     // wakaba light — bright young leaf
				function: '#e8778f',    // sakura — redder cherry blossom
				string: '#e89db0',      // sakura light — softer pink
				number: '#fdaf81',      // momiji light — warm orange
				type: '#8ab589',        // matsu — pine
				comment: '#7d7062',     // ishi — warm stone (italic via rune CSS)
				punctuation: '#7d7062',
				variable: '#f6f4ef',    // = neutral default's dark text
			},

			// Dark-mode Shiki aliases — mirror syntax.* above so the
			// design-plugin palette swatches and Shiki-rendered code agree.
			// token-link uses matsu so URLs stay visually distinct from the
			// function/string pinks without re-introducing the cherry-on-cherry
			// confusion `function`+`link` had in the original palette.
			extra: {
				'rf-syntax-token-keyword': '#b4c97a',
				'rf-syntax-token-function': '#e8778f',
				'rf-syntax-token-string': '#e89db0',
				'rf-syntax-token-string-expression': '#e89db0',
				'rf-syntax-token-constant': '#fdaf81',
				'rf-syntax-token-comment': '#7d7062',
				'rf-syntax-token-parameter': '#f6f4ef',
				'rf-syntax-token-punctuation': '#7d7062',
				'rf-syntax-token-link': '#8ab589',
			},
		},
	},

	// Shiki aliases — literal hex so the preset works against any chrome
	// theme (neutral default, tideline, future themes) without needing
	// var() indirection. Per SPEC-051's "scoped preset" pattern.
	// token-string-expression diverges to a brighter wakaba for template
	// literals; token-constant aligns with type (wakaba) instead of number
	// (kuri), mirroring the dark-mode shift.
	extra: {
		'rf-syntax-token-keyword': '#2d5230',
		'rf-syntax-token-function': '#b35070',
		'rf-syntax-token-string': '#c4501c',
		'rf-syntax-token-string-expression': '#8aa035',
		'rf-syntax-token-constant': '#6b8a35',
		'rf-syntax-token-comment': '#7d7062',
		'rf-syntax-token-parameter': '#1c1a17',
		'rf-syntax-token-punctuation': '#8a7c6e',
		'rf-syntax-token-link': '#b35070',
	},
};

export default niwaki;
