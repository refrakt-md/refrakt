<script lang="ts">
	import { Renderer } from '@refrakt-md/svelte';

	let { regions, renderable }: {
		title: string;
		description: string;
		regions: Record<string, { name: string; mode: string; content: any[] }>;
		renderable: any;
		pages: any[];
	} = $props();
</script>

{#if regions.header}
	<header class="site-header">
		<div class="site-header-inner">
			<Renderer node={regions.header.content} />
		</div>
	</header>
{/if}

<main class="page-content">
	<Renderer node={renderable} />
</main>

<style>
	.site-header {
		border-bottom: 1px solid var(--color-border);
	}
	.site-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
	}
	.site-header :global(p) {
		margin: 0;
		line-height: 1;
	}
	.site-header :global(a) {
		display: inline-block;
		color: inherit;
		text-decoration: none;
	}
	.site-header :global(a:hover) {
		text-decoration: none;
	}
	.site-header :global(img) {
		display: block;
		height: 1.5rem;
		width: auto;
	}
	.site-header-inner :global(p:last-child:not(:first-child)) {
		font-size: 0.85rem;
	}
	.site-header-inner :global(p:last-child:not(:first-child) a) {
		margin-left: 1.5rem;
		color: var(--color-muted);
	}
	.site-header-inner :global(p:last-child:not(:first-child) a:hover) {
		color: var(--color-text);
	}
	.page-content {
		padding-top: 2.5rem;
		padding-bottom: 4rem;
		max-width: 64rem;
		margin: 0 auto;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}
</style>
