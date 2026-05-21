import { refraktPlugin, writeSiteTokensCss } from '@refrakt-md/eleventy';
import { resolve } from 'node:path';

// Compose site-level token overrides (SPEC-048 presets + tokens + modes,
// SPEC-056 scoped tint projections) once at config-load time and write the
// CSS to a build-input directory. Eleventy's passthrough copy picks it up
// and ships it as `/css/site-tokens.css`.
await writeSiteTokensCss(
	resolve('refrakt.config.json'),
	resolve('src/_generated/site-tokens.css'),
);

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(refraktPlugin, {
		cssFiles: ['node_modules/@refrakt-md/lumina/index.css'],
		cssPrefix: '/css',
		behaviorFile: 'node_modules/@refrakt-md/behaviors/dist/index.js',
		jsPrefix: '/js',
		// Watch content (and any sandbox examples) for --serve mode so edits
		// trigger a rebuild + browser reload.
		contentDir: resolve('content'),
	});

	eleventyConfig.addPassthroughCopy({
		'node_modules/@refrakt-md/lumina/tokens': '/css/tokens',
		'node_modules/@refrakt-md/lumina/styles': '/css/styles',
		'src/_generated/site-tokens.css': '/css/site-tokens.css',
	});

	return {
		dir: {
			input: 'src',
			output: '_site',
			includes: '_includes',
			data: '_data',
		},
	};
}
