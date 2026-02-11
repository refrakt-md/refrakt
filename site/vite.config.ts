import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import path from 'node:path';

/** Watch content/*.md files and trigger a full page reload on change */
function contentHmr(): Plugin {
	const contentDir = path.resolve('content');
	return {
		name: 'refract-content-hmr',
		configureServer(server) {
			server.watcher.add(contentDir);
			const reload = (file: string) => {
				if (!file.startsWith(contentDir) || !file.endsWith('.md')) return;
				// Invalidate all server modules so load functions re-run
				for (const mod of server.moduleGraph.getModulesByFile(file) ?? []) {
					server.moduleGraph.invalidateModule(mod);
				}
				server.ws.send({ type: 'full-reload' });
			};
			server.watcher.on('change', reload);
			server.watcher.on('add', reload);
			server.watcher.on('unlink', reload);
		}
	};
}

export default defineConfig({
	plugins: [sveltekit(), contentHmr()],
	ssr: {
		// Bundle these CJS packages into SSR output so named imports work
		noExternal: ['@markdoc/markdoc', '@refract-md/runes', '@refract-md/content', '@refract-md/types']
	}
});
