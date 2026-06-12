import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerGalleryTests } from '../src/harness.js';

// Lumina's glue: point the shared harness at Lumina's generated artifacts.
// A second theme adds a sibling spec like this with its own artifacts.
const here = dirname(fileURLToPath(import.meta.url));
const art = resolve(here, '..', '.artifacts');

registerGalleryTests({
	theme: 'lumina',
	runeGallery: {
		light: resolve(art, 'lumina.light.html'),
		dark: resolve(art, 'lumina.dark.html'),
	},
	layouts: ['default', 'docs', 'blog-article', 'plan'].map(name => ({
		name,
		light: resolve(art, `lumina.layout-${name}.light.html`),
		dark: resolve(art, `lumina.layout-${name}.dark.html`),
	})),
});
