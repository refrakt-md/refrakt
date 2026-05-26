import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true,
		}),
		prerender: {
			handleMissingId: 'warn',
			// Plan entities cross-reference each other freely (specs link to work,
			// work links to specs, decisions cite specs). Some refs resolve to
			// the docs site (`/plan/docs/...`) rather than the plan site — those
			// surface as missing here. Warn instead of failing the build; broken
			// in-site refs still get logged so they're not invisible.
			handleHttpError: 'warn',
		},
	},
};

export default config;
