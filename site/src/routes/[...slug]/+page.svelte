<script lang="ts">
	import { ThemeShell } from '@refrakt-md/svelte';
	import { theme } from 'virtual:refrakt/theme';

	let { data } = $props();
</script>

<ThemeShell
	{theme}
	page={{
		title: data.title,
		description: data.description,
		regions: data.regions,
		renderable: data.renderable,
		pages: data.pages,
		url: data.url,
	}}
/>
