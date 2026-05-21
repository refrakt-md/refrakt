import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ThemeConfig } from './types.js';
import { toKebabCase } from './helpers.js';

/**
 * Compute the set of per-rune CSS block names that should ship with a built
 * site, given the runes that actually appear in the page corpus.
 *
 * The result is a `Set<string>` of BEM block names (e.g. `'hint'`,
 * `'recipe'`, `'palette'`) that can be turned into `@import` statements
 * (`${themePackage}/styles/runes/${block}.css`) by the caller.
 *
 * Always includes `tint` in the result when the theme ships a `tint.css`
 * file — `tint` is a universal attribute, not a rune, so it never appears
 * in `analyzeRuneUsage`'s output.
 *
 * The function does Node-only filesystem checks (`existsSync` against the
 * theme's `styles/runes/` directory), so it lives in `@refrakt-md/transform/
 * node`. The caller passes the theme module specifier so the function can
 * resolve the package via `import.meta.resolve`.
 *
 * @param usedRuneTypes The kebab-cased rune types observed in the corpus
 *                      (the `allTypes` field of `analyzeRuneUsage`'s result).
 * @param themeConfig   The assembled theme config (post-plugin-merge).
 * @param themePackage  The theme module specifier (e.g. `'@refrakt-md/lumina'`).
 * @returns An object containing the used block name set and the absolute
 *          path to the theme's `styles/runes/` directory.
 */
export async function computeUsedCssBlocks(
	usedRuneTypes: Iterable<string>,
	themeConfig: ThemeConfig,
	themePackage: string,
): Promise<{ usedBlocks: Set<string>; stylesDir: string }> {
	const themeEntryUrl = import.meta.resolve(themePackage);
	const themeDir = dirname(fileURLToPath(themeEntryUrl));
	const stylesDir = join(themeDir, 'styles', 'runes');

	const runeKeyMap = new Map(
		Object.keys(themeConfig.runes).map(k => [toKebabCase(k), k]),
	);

	const usedBlocks = new Set<string>();

	for (const typeName of usedRuneTypes) {
		const configKey = runeKeyMap.get(typeName);
		const runeConfig = configKey ? themeConfig.runes[configKey] : undefined;
		if (runeConfig && existsSync(join(stylesDir, `${runeConfig.block}.css`))) {
			usedBlocks.add(runeConfig.block);
		}
	}

	// Tint is a universal attribute, not a rune — never appears in
	// data-rune analysis. Always include when the theme ships it.
	if (existsSync(join(stylesDir, 'tint.css'))) {
		usedBlocks.add('tint');
	}

	return { usedBlocks, stylesDir };
}

/**
 * Build the ordered list of CSS module specifiers a built site should
 * import — `base.css` first, then one entry per used rune block.
 *
 * @param themePackage The theme module specifier.
 * @param usedBlocks   Set of rune block names returned by {@link computeUsedCssBlocks}.
 * @returns Module specifiers consumable by Vite virtual modules, Next.js
 *          `import` statements, or HTML `<link>` href attributes.
 */
export function buildUsedCssImports(
	themePackage: string,
	usedBlocks: Set<string>,
): string[] {
	const imports: string[] = [`${themePackage}/base.css`];
	for (const block of [...usedBlocks].sort()) {
		imports.push(`${themePackage}/styles/runes/${block}.css`);
	}
	return imports;
}
