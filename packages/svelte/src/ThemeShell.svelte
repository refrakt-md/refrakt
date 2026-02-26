<script lang="ts">
	import type { SvelteTheme } from './theme.js';
	import { isLayoutConfig } from './theme.js';
	import { setRegistry, setElementOverrides } from './context.js';
	import { setContext, tick } from 'svelte';
	import { matchRouteRule } from './route-rules.js';
	import { initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';
	import { layoutTransform } from '@refrakt-md/transform';
	import Renderer from './Renderer.svelte';

	interface OgMeta {
		title?: string;
		description?: string;
		image?: string;
		type?: string;
		url?: string;
	}

	interface PageSeo {
		jsonLd: object[];
		og: OgMeta;
	}

	interface PageData {
		title: string;
		description: string;
		frontmatter?: Record<string, unknown>;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: Array<{
			url: string;
			title: string;
			draft: boolean;
			description?: string;
			date?: string;
			author?: string;
			tags?: string[];
			image?: string;
		}>;
		url: string;
		seo?: PageSeo;
		headings?: Array<{ level: number; text: string; id: string }>;
	}

	let { theme, page }: { theme: SvelteTheme; page: PageData } = $props();

	// Wire theme into Svelte context
	// svelte-ignore state_referenced_locally
	setRegistry(theme.components);
	// svelte-ignore state_referenced_locally
	if (theme.elements) setElementOverrides(theme.elements);
	// svelte-ignore state_referenced_locally
	setContext('pages', page.pages);
	// svelte-ignore state_referenced_locally
	setContext('currentUrl', page.url);

	// Pick layout via route rules (reactive so layout updates on client-side navigation)
	const layoutName = $derived(matchRouteRule(page.url, theme.manifest.routeRules ?? []));
	const layoutEntry = $derived(theme.layouts[layoutName] ?? theme.layouts['default']);

	// Initialize rune + layout behaviors after render, re-run on navigation.
	// The {#key page.url} block in the template ensures full DOM recreation on
	// navigation, so behaviors always run on fresh DOM and old behavior-modified
	// elements are simply discarded (no cleanup/restore conflicts with Svelte).
	$effect(() => {
		void page.url; // re-run when page changes
		let cleanupRunes: (() => void) | undefined;
		let cleanupLayout: (() => void) | undefined;
		let active = true;
		tick().then(() => {
			if (active) {
				cleanupRunes = initRuneBehaviors();
				cleanupLayout = initLayoutBehaviors();
			}
		});
		return () => {
			active = false;
			cleanupRunes?.();
			cleanupLayout?.();
		};
	});
</script>

<svelte:head>
	{#if page.seo?.og.title}
		<title>{page.seo.og.title}</title>
		<meta property="og:title" content={page.seo.og.title} />
	{:else if page.title}
		<title>{page.title}</title>
	{/if}
	{#if page.seo?.og.description}
		<meta name="description" content={page.seo.og.description} />
		<meta property="og:description" content={page.seo.og.description} />
	{:else if page.description}
		<meta name="description" content={page.description} />
	{/if}
	{#if page.seo?.og.image}
		<meta property="og:image" content={page.seo.og.image} />
		<meta name="twitter:card" content="summary_large_image" />
	{/if}
	{#if page.seo?.og.url}
		<meta property="og:url" content={page.seo.og.url} />
	{/if}
	{#if page.seo?.og.type}
		<meta property="og:type" content={page.seo.og.type} />
	{/if}
	{#if page.seo}
		{#each page.seo.jsonLd as schema}
			{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
		{/each}
	{/if}
</svelte:head>

{#key page.url}
	{#if isLayoutConfig(layoutEntry)}
		{@const tree = layoutTransform(layoutEntry, page, 'rf')}
		<Renderer node={tree} />
	{:else if layoutEntry}
		<svelte:component this={layoutEntry}
			title={page.title}
			description={page.description}
			frontmatter={page.frontmatter}
			regions={page.regions}
			renderable={page.renderable}
			pages={page.pages}
			url={page.url}
			headings={page.headings}
		/>
	{/if}
{/key}
