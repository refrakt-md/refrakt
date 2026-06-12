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

const here = dirname(fileURLToPath(import.meta.url));
const tokensDir = resolve(here, '..', 'tokens');

export const HEADER =
	'/* GENERATED from src/tokens.ts by scripts/generate-tokens.mjs — do not edit by hand.\n' +
	' * Edit the `luminaTokens` source and rebuild; a drift test guards this file. */\n';

/** Render the two token stylesheets as strings. The base block is the prefix of
 *  the full stylesheet, so the dark blocks are the full output minus the base. */
export function renderTokenCss() {
	const { modes, extra, ...rest } = luminaTokens;
	const base = generateThemeStylesheet({ ...rest, extra });
	const full = generateThemeStylesheet(luminaTokens);
	const dark = full.slice(base.length).replace(/^\n/, '');
	return {
		base: `${HEADER}\n${base}`,
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
