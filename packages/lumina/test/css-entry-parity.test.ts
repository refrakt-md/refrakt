import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(resolve(here, '..', p), 'utf-8');

/** Extract the `dimensions/<name>.css` files a CSS entry imports. */
function dimensionImports(css: string): Set<string> {
	const out = new Set<string>();
	for (const m of css.matchAll(/@import\s+['"][^'"]*\/dimensions\/([\w-]+)\.css['"]/g)) {
		out.add(m[1]);
	}
	return out;
}

// Regression guard for the dev-vs-build motion bug (and its guest-posture
// predecessor): the SvelteKit loader imports the full `index.css` barrel in dev
// but `base.css` + tree-shaken rune CSS in production. A *dimension* keys on
// universal attributes (not a rune block), so it ships only if it's in BOTH
// entries — add it to `index.css` alone and it works in dev but vanishes from
// every build. These entries must agree on their dimension set.
describe('Lumina CSS entry parity (base.css ↔ index.css)', () => {
	const base = dimensionImports(read('base.css'));
	const index = dimensionImports(read('index.css'));

	it('base.css imports every dimension index.css does (production uses base.css)', () => {
		const missingFromBase = [...index].filter(d => !base.has(d)).sort();
		expect(missingFromBase, 'dimensions in index.css but not base.css — they would vanish from production builds').toEqual([]);
	});

	it('index.css imports every dimension base.css does', () => {
		const missingFromIndex = [...base].filter(d => !index.has(d)).sort();
		expect(missingFromIndex, 'dimensions in base.css but not index.css').toEqual([]);
	});

	it('includes the motion dimension in both', () => {
		expect(base.has('motion')).toBe(true);
		expect(index.has('motion')).toBe(true);
	});
});
