import adapter from '@sveltejs/adapter-static';

// SPEC-181 — the staging site builds beside `main`, never over it.
const out = process.env.REFRAKT_SITE === 'staging' ? 'build-staging' : 'build';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: out,
			assets: out,
			fallback: undefined,
			precompress: false,
			strict: true,
		}),
		prerender: {
			handleMissingId: 'warn',
		},
	},
};

export default config;
