import type { ThemeTokensConfig } from '@refrakt-md/types';

/**
 * Niwaki — a Japanese-garden-inspired *syntax-only* preset.
 *
 * Where tideline is a full identity overhaul (chrome + syntax + typography),
 * niwaki deliberately scopes to the syntax tokens. Code blocks render in
 * wakaba / sakura / matsu / momiji / ishi; everything else inherits from
 * whichever chrome theme is layered above. Composes cleanly:
 *
 *   - `presets: ["niwaki"]` → Japanese-garden code on the neutral default
 *   - `presets: ["tideline", "niwaki"]` → tideline chrome + niwaki code
 *
 * The refrakt documentation site uses `["niwaki"]`. See `/docs/themes/lumina/presets/niwaki`.
 *
 * Cultural sensitivity: the preset is named in Japanese (niwaki = 庭木, the
 * cloud-pruned garden tree of Japanese tradition) and its colours reference
 * wakaba (young leaf), sakura (cherry blossom), matsu (pine), momiji (autumn
 * maple), and ishi (stone). The naming is a deliberate homage; we don't
 * claim cultural ownership.
 */
const niwaki: ThemeTokensConfig = {
	// Light-mode syntax — matsu / sakura / momiji / wakaba / ishi
	syntax: {
		keyword: '#5e7d2a',             // wakaba — deep young-leaf green
		function: '#b54a6b',            // sakura — mature cherry blossom
		link: '#3d6b3d',                // matsu — deep pine
		string: '#a8521c',              // momiji — deep peach
		'string-expression': '#c54a14', // momiji punchy — rust orange
		constant: '#3d6b3d',            // matsu — deep pine (same as link)
		comment: '#8a857d',             // ishi light — muted stone
		punctuation: '#8a857d',
		variable: '#1c1a17',            // = neutral default's text
	},

	modes: {
		dark: {
			syntax: {
				keyword: '#b3d475',     // wakaba — yellow-green young leaf
				function: '#f591a6',    // sakura — cherry blossom pink
				link: '#8ab589',        // matsu — pine
				string: '#eba073',      // momiji — peach
				'string-expression': '#fa9a61', // momiji punchy — saturated orange
				constant: '#8ab589',    // matsu — pine (same as link)
				comment: '#7d7062',     // ishi — warm stone (italic via rune CSS)
				punctuation: '#7d7062',
				variable: '#f6f4ef',    // = neutral default's dark text
			},
		},
	},
};

export default niwaki;
