/**
 * Syncs the hardcoded `version` field in each community rune package's
 * src/index.ts with the version from its package.json.
 *
 * Run automatically as part of `npm run version-packages`.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const runesDir = new URL('../runes', import.meta.url).pathname;
let updated = 0;

for (const name of readdirSync(runesDir)) {
	const pkgPath = join(runesDir, name, 'package.json');
	const srcPath = join(runesDir, name, 'src', 'index.ts');

	try {
		statSync(pkgPath);
		statSync(srcPath);
	} catch {
		continue;
	}

	const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8'));
	const src = readFileSync(srcPath, 'utf-8');
	const replaced = src.replace(/version:\s*['"].*?['"]/, `version: '${version}'`);

	if (replaced !== src) {
		writeFileSync(srcPath, replaced);
		console.log(`  ${name}: updated to ${version}`);
		updated++;
	}
}

console.log(updated ? `\nSynced ${updated} rune package version(s).` : 'All rune package versions already in sync.');
