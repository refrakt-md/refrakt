<script lang="ts">
	import type { SerializedTag } from '$lib/renderer/Renderer.svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
	const typeName = tag.attributes.typeof;
</script>

{#if typeName === 'Nav'}
	<nav class="site-nav">
		{@render children()}
	</nav>
{:else if typeName === 'NavGroup'}
	<div class="nav-group">
		{@render children()}
	</div>
{:else}
	<div class="nav-item">
		{@render children()}
	</div>
{/if}

<style>
	.site-nav {
		padding: 1rem 0;
	}
	.site-nav :global(ul) {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.site-nav :global(li) {
		padding: 0.375rem 0;
	}
	.nav-group {
		margin-bottom: 1.5rem;
	}
	.nav-group :global(h2),
	.nav-group :global(h3) {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}
</style>
