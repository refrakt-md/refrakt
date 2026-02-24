/**
 * Pre-generate rune structure contracts and base CSS from theme-base config.
 * Run: npx tsx scripts/generate-contracts.ts
 * Output: src/lib/contracts.json, src/lib/base-styles.json
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseConfig } from '@refrakt-md/theme-base';
import { generateStructureContract } from '@refrakt-md/transform';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../src/lib');

// --- Generate structure contracts ---

const contract = generateStructureContract(baseConfig);

writeFileSync(
	resolve(outDir, 'contracts.json'),
	JSON.stringify(contract, null, '\t') + '\n',
);

console.log(
	`[generate-contracts] Wrote ${Object.keys(contract.runes).length} rune contracts to src/lib/contracts.json`,
);

// --- Generate base rune CSS map ---

const luminaRunesDir = resolve(__dirname, '../../../packages/lumina/styles/runes');
const baseStyles: Record<string, string> = {};

// Collect unique block names from all rune configs
const blocks = new Set<string>();
for (const config of Object.values(baseConfig.runes)) {
	blocks.add(config.block);
}

for (const block of [...blocks].sort()) {
	const cssPath = resolve(luminaRunesDir, `${block}.css`);
	if (existsSync(cssPath)) {
		baseStyles[block] = readFileSync(cssPath, 'utf-8').trim();
	}
}

writeFileSync(
	resolve(outDir, 'base-styles.json'),
	JSON.stringify(baseStyles, null, '\t') + '\n',
);

console.log(
	`[generate-contracts] Wrote ${Object.keys(baseStyles).length} base styles to src/lib/base-styles.json`,
);
