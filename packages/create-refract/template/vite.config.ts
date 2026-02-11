import { sveltekit } from '@sveltejs/kit/vite';
import { refract } from '@refract-md/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), refract()],
});
