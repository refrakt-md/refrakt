<script lang="ts">
	import { ThemeShell } from '@refract-md/svelte';
	import { theme } from '@refract-md/theme-lumina';

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
