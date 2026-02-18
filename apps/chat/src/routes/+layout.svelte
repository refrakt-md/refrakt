<script lang="ts">
	import '@refrakt-md/lumina/sveltekit/tokens.css';
	import { setRegistry, setElementOverrides } from '@refrakt-md/svelte';
	import { theme } from '@refrakt-md/lumina/sveltekit';

	setRegistry(theme.components);
	if (theme.elements) setElementOverrides(theme.elements);

	let { children } = $props();
</script>

{@render children()}

<style>
	:global(body) {
		margin: 0;
		font-family: var(--rf-font-sans, system-ui, sans-serif);
		color: var(--rf-color-text, #1a1a2e);
		background: var(--rf-color-surface, #ffffff);
	}
</style>
