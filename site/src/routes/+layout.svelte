<script lang="ts">
	import 'virtual:refrakt/tokens';
	import '../styles/brand.css';
	import { ThemeToggle } from '@refrakt-md/svelte';

	let { children } = $props();
</script>

<div class="site-layout">
	<div class="site-layout__toggle">
		<ThemeToggle />
	</div>
	{@render children()}
</div>

<style>
	.site-layout {
		/* Layouts handle their own width constraints */
	}

	.site-layout__toggle {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 100;
	}

	/* The ThemeToggle component already hides itself when
	 * `<html data-tint-lock="true">`, so locked pages get no toggle. */
</style>
