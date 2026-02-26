<script lang="ts">
	import { ThemeShell } from '@refrakt-md/svelte';
	import { theme } from 'virtual:refrakt/theme';

	let { data } = $props();
</script>

<svelte:head>
	{#if data.highlightCss}
		{@html `<style>${data.highlightCss}</style>`}
	{/if}
</svelte:head>

<ThemeShell
	{theme}
	page={{
		title: data.title,
		description: data.description,
		frontmatter: data.frontmatter,
		regions: data.regions,
		renderable: data.renderable,
		pages: data.pages,
		url: data.url,
		headings: data.headings,
	}}
/>
