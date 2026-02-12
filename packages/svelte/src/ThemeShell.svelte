<script lang="ts">
	import type { SvelteTheme } from './theme.js';
	import { setRegistry, setElementOverrides } from './context.js';
	import { setContext } from 'svelte';
	import { matchRouteRule } from './route-rules.js';

	interface PageData {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: Array<{ url: string; title: string; draft: boolean }>;
		url: string;
	}

	let { theme, page }: { theme: SvelteTheme; page: PageData } = $props();

	// Wire theme into Svelte context
	// svelte-ignore state_referenced_locally
	setRegistry(theme.components);
	// svelte-ignore state_referenced_locally
	if (theme.elements) setElementOverrides(theme.elements);
	// svelte-ignore state_referenced_locally
	setContext('pages', page.pages);

	// Pick layout via route rules (reactive so layout updates on client-side navigation)
	const layoutName = $derived(matchRouteRule(page.url, theme.manifest.routeRules));
	const Layout = $derived(theme.layouts[layoutName] ?? theme.layouts['default']);
</script>

<svelte:head>
	{#if page.title}<title>{page.title}</title>{/if}
	{#if page.description}<meta name="description" content={page.description} />{/if}
</svelte:head>

{#if Layout}
	<Layout
		title={page.title}
		description={page.description}
		regions={page.regions}
		renderable={page.renderable}
		pages={page.pages}
	/>
{/if}
