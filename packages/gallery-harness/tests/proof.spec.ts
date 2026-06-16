import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerGalleryTests } from '../src/harness.js';

// Proof-skin's glue: the WORK-440 validation skin (@refrakt-md/proof-skin) built
// on the same @refrakt-md/skeleton as Lumina. Identical to lumina.spec.ts but for
// the proof artifacts — its own baselines under __screenshots__/proof/…. The two
// galleries share a byte-identical @layer skeleton; only the skin layer differs,
// so this proves the skeleton is theme-agnostic (a second theme adopts the harness
// with no logic copy, just its artifacts).
const here = dirname(fileURLToPath(import.meta.url));
const art = resolve(here, '..', '.artifacts');

registerGalleryTests({
	theme: 'proof',
	runeGallery: {
		light: resolve(art, 'proof-skin.light.html'),
		dark: resolve(art, 'proof-skin.dark.html'),
	},
	layouts: ['default', 'docs', 'blog-article', 'plan'].map(name => ({
		name,
		light: resolve(art, `proof-skin.layout-${name}.light.html`),
		dark: resolve(art, `proof-skin.layout-${name}.dark.html`),
	})),
});
