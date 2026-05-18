<script lang="ts">
	import 'virtual:refrakt/tokens';
	import '../styles/brand.css';
	import { ThemeToggle } from '@refrakt-md/svelte';
	import { onMount } from 'svelte';

	let { data, children } = $props();
	let toggleHost: HTMLDivElement | undefined = $state();

	onMount(() => {
		// Move the toggle into the active layout's header so it sits with the
		// other header controls (search + hamburger / nav) instead of as a
		// detached fixed overlay. The header class varies per layout: default
		// → rf-header, docs → rf-docs-header, blog-article → rf-blog-header.
		const target = document.querySelector(
			'.rf-header__inner, .rf-docs-header__inner, .rf-blog-header__inner',
		);
		if (target && toggleHost) {
			target.appendChild(toggleHost);
		}
	});

	// Apply the route's tint cascade to <html> on every navigation. SSR
	// splices these attributes via hooks.server.ts, but SvelteKit reuses the
	// same <html> element across client-side nav — so without this a
	// `data-theme="light"` written by the toggle on an unlocked docs page
	// would leak across into a locked marketing page on the next navigation.
	//
	// Locked pages get the SSR-equivalent attrs (data-theme + data-tint-lock);
	// unlocked pages clear the lock and restore the user's saved preference
	// (or system preference) from localStorage. Mirrors htmlTintAttributes
	// and prePaintScript from @refrakt-md/content.
	$effect(() => {
		const cascade = data.tintCascade;
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
	 * the ThemeToggle is client-only) and reparented into the header `<div>`
	 * during onMount. The styles below apply once it's in the header.
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
