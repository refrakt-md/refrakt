/**
 * Generate Lumina's token CSS (`tokens/base.css` + `tokens/dark.css`) from the
 * `luminaTokens` source of truth via `generateThemeStylesheet`. Wired into the
 * package `build` (runs after `tsc`). The committed output is guarded against
 * drift by `test/token-generation.test.ts` — never hand-edit the CSS; edit
 * `src/tokens.ts` and rebuild.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateThemeStylesheet } from '@refrakt-md/transform';
import { luminaTokens } from '../dist/tokens.js';
import { luminaConfig } from '../dist/transform.js';

const here = dirname(fileURLToPath(import.meta.url));
const tokensDir = resolve(here, '..', 'tokens');

export const HEADER =
	'/* GENERATED from src/tokens.ts by scripts/generate-tokens.mjs — do not edit by hand.\n' +
	' * Edit the `luminaTokens` source and rebuild; a drift test guards this file. */\n';

/** SPEC-094 §8 / WORK-437 — icon groups whose glyphs are surfaced to CSS as
 *  `--rf-icon-<group>-<name>` mask custom properties, fed from the theme icon
 *  registry (`config.icons`). The skeleton's `::before` reads these instead of
 *  embedding `data:image/svg+xml` glyphs, so a theme re-glyphs by config alone.
 *  `global` (the full Lucide set) is excluded — those are `{% icon %}` glyphs,
 *  not surface masks. */
const ICON_MASK_GROUPS = ['hint', 'accordion'];

/** Encode an SVG string as a mask-image `url("data:…")`. The glyph is a mask
 *  (the visible shape is alpha; `background-color` paints it), so `currentColor`
 *  is pinned to black to guarantee an opaque silhouette in the isolated image. */
function svgToMaskUrl(svg) {
	const masked = svg.replace(/currentColor/g, 'black');
	return `url("data:image/svg+xml,${encodeURIComponent(masked)}")`;
}

/** Build the `:root { --rf-icon-<group>-<name>: url(…); }` block from a theme's
 *  icon registry. Returns '' when no mask groups are present. */
export function iconMaskTokenCss(icons = {}, groups = ICON_MASK_GROUPS) {
	const lines = [];
	for (const group of groups) {
		const glyphs = icons[group];
		if (!glyphs) continue;
		for (const [name, svg] of Object.entries(glyphs)) {
			lines.push(`\t--rf-icon-${group}-${name}: ${svgToMaskUrl(svg)};`);
		}
	}
	if (lines.length === 0) return '';
	return `:root {\n${lines.join('\n')}\n}\n`;
}

/** Render the two token stylesheets as strings. The base block is the prefix of
 *  the full stylesheet, so the dark blocks are the full output minus the base. */
export function renderTokenCss() {
	const { modes, extra, ...rest } = luminaTokens;
	const base = generateThemeStylesheet({ ...rest, extra });
	const full = generateThemeStylesheet(luminaTokens);
	const dark = full.slice(base.length).replace(/^\n/, '');
	// Icon-from-config (WORK-437): append the surface mask glyphs, fed from the
	// theme icon registry, after the value tokens. Light-only — masks are
	// monochrome (tinted by `background-color`), so they need no dark variant.
	const iconCss = iconMaskTokenCss(luminaConfig.icons);
	return {
		base: iconCss ? `${HEADER}\n${base}\n${iconCss}` : `${HEADER}\n${base}`,
		dark: `${HEADER}\n${dark}`,
	};
}

export function writeTokenCss() {
	const { base, dark } = renderTokenCss();
	writeFileSync(resolve(tokensDir, 'base.css'), base);
	writeFileSync(resolve(tokensDir, 'dark.css'), dark);
}

// Only write when invoked directly (e.g. from the build script); importing this
// module (e.g. from the drift test) must be side-effect free.
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
	writeTokenCss();
	console.log('Generated tokens/base.css + tokens/dark.css from src/tokens.ts');
}
