import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://localhost:4800',
		},
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			// /api/community-tags.js is served at runtime by the editor server — not a build-time module
			external: [/^\/api\/community-tags\.js$/],
		},
	},
});
