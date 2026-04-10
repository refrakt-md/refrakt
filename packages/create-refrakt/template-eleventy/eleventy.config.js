import { refraktPlugin } from '@refrakt-md/eleventy';

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(refraktPlugin, {
		cssFiles: ['node_modules/@refrakt-md/lumina/index.css'],
		cssPrefix: '/css',
		behaviorFile: 'node_modules/@refrakt-md/behaviors/dist/index.js',
		jsPrefix: '/js',
	});

	eleventyConfig.addPassthroughCopy({
		'node_modules/@refrakt-md/lumina/tokens': '/css/tokens',
		'node_modules/@refrakt-md/lumina/styles': '/css/styles',
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
