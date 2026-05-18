<script lang="ts">
	import 'virtual:refrakt/tokens';
	import '../styles/brand.css';
	import { ThemeToggle } from '@refrakt-md/svelte';

	let { data, children } = $props();
	let toggleHost: HTMLDivElement | undefined = $state();

	// One effect handles two concerns that need to run on every client-side
	// navigation: (1) reattach the toggle into the *current* page's header
	// — the header is page content, so it's unmounted/remounted on nav and
	// the toggle host (which we manually appended in the previous render)
	// goes with the old DOM and disappears; (2) re-apply the route's tint
	// cascade to <html>. Depending on `data.tintCascade` (which changes per
	// route via +layout.server.ts) gives us the per-nav re-run.
	$effect(() => {
		const cascade = data.tintCascade;

		// (1) Re-mount the toggle host. The header class varies per layout:
		// default → rf-header, docs → rf-docs-header, blog-article → rf-blog-header.
		const header = document.querySelector(
			'.rf-header__inner, .rf-docs-header__inner, .rf-blog-header__inner',
		);
		if (header && toggleHost && toggleHost.parentElement !== header) {
			header.appendChild(toggleHost);
		}

		// (2) Apply the cascade to <html>. SSR splices these via hooks.server.ts
		// but SvelteKit reuses the same <html> across nav, so without this a
		// `data-theme="light"` written by the toggle on an unlocked docs page
		// would leak into a locked marketing page on the next navigation.
		const html = document.documentElement;

		if (cascade.locked && (cascade.tintMode === 'light' || cascade.tintMode === 'dark')) {
			html.setAttribute('data-theme', cascade.tintMode);
			html.setAttribute('data-tint-lock', 'true');
		} else {
			html.removeAttribute('data-tint-lock');
			let saved: string | null = null;
			try {
				saved = localStorage.getItem('rf-theme');
			} catch (_) {
				// localStorage may be unavailable (private mode, file://).
			}
			const mode =
				saved === 'light' || saved === 'dark'
					? saved
					: matchMedia('(prefers-color-scheme: dark)').matches
						? 'dark'
						: 'light';
			html.setAttribute('data-theme', mode);
		}

		if (cascade.tint !== null && cascade.tint !== undefined) {
			html.setAttribute('data-tint', String(cascade.tint));
		} else {
			html.removeAttribute('data-tint');
		}
	});
</script>

<div class="site-layout">
	<div bind:this={toggleHost} class="site-layout__toggle">
		<ThemeToggle />
	</div>
	{@render children()}
</div>

<style>
	/* The toggle is rendered here on SSR (children are empty until hydration —
	 * the ThemeToggle is client-only) and reparented into the header by the
	 * effect above. The styles below apply once it's in the header.
	 *
	 * Flex order: search-trigger sits at order 1 (with margin-left:auto),
	 * rf-nav / mobile-menu-btn at order 3, so order 2 puts the toggle between
	 * search and whichever of the two is visible at the current breakpoint. */
	.site-layout__toggle {
		display: inline-flex;
		align-items: center;
		order: 2;
	}
</style>
