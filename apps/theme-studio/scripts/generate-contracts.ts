/**
 * Pre-generate rune structure contracts from theme-base config.
 * Run: npx tsx scripts/generate-contracts.ts
 * Output: src/lib/contracts.json
 */
import { writeFileSync } from 'node:fs';
import { baseConfig } from '@refrakt-md/theme-base';
import { generateStructureContract } from '@refrakt-md/transform';

const contract = generateStructureContract(baseConfig);

writeFileSync(
	new URL('../src/lib/contracts.json', import.meta.url),
	JSON.stringify(contract, null, '\t') + '\n',
);

console.log(
	`[generate-contracts] Wrote ${Object.keys(contract.runes).length} rune contracts to src/lib/contracts.json`,
);
