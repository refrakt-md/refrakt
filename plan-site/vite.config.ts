import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		refrakt({
			configPath: '../refrakt.config.json',
			site: 'plan',
		}),
	],
});
