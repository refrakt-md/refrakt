<script lang="ts">
	import '@refrakt-md/lumina/svelte/tokens.css';
	import { setRegistry, setElementOverrides } from '@refrakt-md/svelte';
	import { theme } from '@refrakt-md/lumina/svelte';

	setRegistry(theme.components);
	if (theme.elements) setElementOverrides(theme.elements);

	let { children } = $props();
</script>

{@render children()}

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		color: #1a1a2e;
		background: #f5f5f5;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>
