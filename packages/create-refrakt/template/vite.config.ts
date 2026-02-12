import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), refrakt()],
});
