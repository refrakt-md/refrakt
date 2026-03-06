import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export interface CommunityTagsBuildResult {
	outputPath: string;
	success: boolean;
}

/**
 * Build a browser-compatible ESM module exporting community rune Markdoc schemas
 * and postTransform functions.
 *
 * Uses esbuild (available via Vite in SvelteKit projects) to bundle all configured
 * community package schemas into a single self-contained file.
 * Falls back gracefully if esbuild is not available.
 * Caches by package name hash — repeat editor starts are instant.
 */
export async function buildCommunityTagsBundle(
	packageNames: string[],
	projectRoot: string,
): Promise<CommunityTagsBuildResult> {
	if (packageNames.length === 0) return { outputPath: '', success: false };

	const cacheDir = resolve(import.meta.dirname, '..', '.community-tags-cache');
	const hash = createHash('md5').update(packageNames.slice().sort().join(',')).digest('hex').slice(0, 8);
	const outputPath = resolve(cacheDir, `${hash}.js`);

	if (existsSync(outputPath)) return { outputPath, success: true };

	// Generate entry: import each package, collect rune schemas and postTransforms
	const imports = packageNames
		.map((name, i) => `import pkg${i} from ${JSON.stringify(name)};`)
		.join('\n');
	const pkgArray = packageNames.map((_, i) => `pkg${i}`).join(', ');
	const entryCode = `
${imports}

const communityTags = {};
const communityPostTransforms = {};
const communityStyles = {};
for (const pkg of [${pkgArray}]) {
  for (const [name, entry] of Object.entries(pkg.runes ?? {})) {
    if (entry.transform) {
      communityTags[name] = entry.transform;
      for (const alias of (entry.aliases ?? [])) {
        communityTags[alias] = entry.transform;
      }
    }
  }
  for (const [name, runeConfig] of Object.entries(pkg.theme?.runes ?? {})) {
    if (typeof runeConfig.postTransform === 'function') {
      communityPostTransforms[name] = runeConfig.postTransform;
    }
    if (runeConfig.styles) {
      communityStyles[name] = runeConfig.styles;
    }
  }
}
export { communityTags, communityPostTransforms, communityStyles };
`;

	try {
		const { build } = await import('esbuild');
		mkdirSync(cacheDir, { recursive: true });
		await build({
			stdin: { contents: entryCode, resolveDir: projectRoot, loader: 'js' },
			bundle: true,
			format: 'esm',
			outfile: outputPath,
			platform: 'browser',
			external: ['node:*'],
		});
		return { outputPath, success: true };
	} catch (err) {
		console.warn('[refrakt] Community tags bundle build failed:', (err as Error).message);
		return { outputPath: '', success: false };
	}
}
