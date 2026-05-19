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
		keyword: '#eba073',     // wakaba light — bright young leaf
		function: '#e8778f',    // sakura — redder cherry blossom
		link: '#e87a39',        // matsu — pine
		string: '#eba073',      // sakura light — softer pink
		'string-expression': '#e8778f',
		number: '#fdaf81',      // momiji light — warm orange
		type: '#b4c97a',        // matsu — pine
		comment: '#7d7062',     // ishi — warm stone (italic via rune CSS)
		punctuation: '#7d7062',
		variable: '#f6f4ef',    // = neutral default's dark text
	},

	modes: {
		dark: {
			syntax: {
				keyword: '#eba073',     // wakaba light — bright young leaf
				function: '#e8778f',    // sakura — redder cherry blossom
				link: '#e87a39',        // matsu — pine
				string: '#eba073',      // sakura light — softer pink
				'string-expression': '#e8778f',
				number: '#fdaf81',      // momiji light — warm orange
				type: '#b4c97a',        // matsu — pine
				comment: '#7d7062',     // ishi — warm stone (italic via rune CSS)
				punctuation: '#7d7062',
				variable: '#f6f4ef',    // = neutral default's dark text
			},
		},
	},

	// Shiki-only refinement: `token-constant` aligns with type (wakaba)
	// instead of number (kuri). The `--rf-syntax-number` contract variable
	// keeps the canonical kuri value above; this only changes what Shiki
	// paints numeric literals with.
	extra: {
		'rf-syntax-token-constant': '#6b8a35',
	},
};

export default niwaki;
