import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/sveltekit';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const runesPkg = JSON.parse(readFileSync(new URL('../packages/runes/package.json', import.meta.url), 'utf-8'));

export default defineConfig({
	define: {
		__REFRAKT_VERSION__: JSON.stringify(runesPkg.version),
	},
	plugins: [
		sveltekit(),
		refrakt({
			configPath: '../refrakt.config.json',
			site: 'main',
			variables: { version: '__REFRAKT_VERSION__' },
		}),
	],
});
