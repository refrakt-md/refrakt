// Shim for $app/state in the preview runtime.
// Provides a reactive page object that Nav.svelte reads for active-link styling.
// The .svelte.ts extension enables Svelte 5 rune processing ($state).

let currentPathname = $state('/');

export const page = {
	get url() {
		return {
			pathname: currentPathname,
			search: '',
			hash: '',
			origin: typeof window !== 'undefined' ? window.location.origin : '',
			href: typeof window !== 'undefined' ? window.location.origin + currentPathname : currentPathname,
		};
	},
	get params() { return {}; },
	get route() { return { id: '' }; },
	get status() { return 200; },
	get error() { return null; },
	get data() { return {}; },
	get form() { return null; },
};

/** Called by App.svelte when new preview data arrives with a URL */
export function setPreviewUrl(pathname: string) {
	currentPathname = pathname;
}
