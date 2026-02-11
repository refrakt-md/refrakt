import { sveltekit } from '@sveltejs/kit/vite';
import { refract } from '@refract-md/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), refract()],
});
