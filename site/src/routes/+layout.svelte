<script lang="ts">
	import 'virtual:refrakt/tokens';
	import '../styles/brand.css';
	import { ThemeToggle } from '@refrakt-md/svelte';
	import { onMount } from 'svelte';

	let { children } = $props();
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
