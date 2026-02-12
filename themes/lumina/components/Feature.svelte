<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const typeName = $derived(tag.attributes.typeof);
	const isDefinition = $derived(typeName === 'FeatureDefinition');
</script>

{#if isDefinition}
	<div class="feature-card">
		{@render children()}
	</div>
{:else}
	<section class="feature">
		{@render children()}
	</section>
{/if}

<style>
	.feature {
		padding: 2.5rem 0 2rem;
	}
	.feature :global(h2) {
		text-align: center;
		margin-bottom: 2rem;
	}
	.feature :global(dl) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin: 0;
	}
	.feature-card {
		padding: 1.75rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		box-shadow: var(--shadow-sm);
		transition: box-shadow 200ms ease, border-color 200ms ease, transform 200ms ease;
	}
	.feature-card:hover {
		box-shadow: var(--shadow-lg);
		border-color: var(--color-surface-active);
		transform: translateY(-2px);
	}
	.feature-card :global(dt) {
		font-weight: 650;
		font-size: 1.05rem;
		margin-bottom: 0.5rem;
		letter-spacing: -0.01em;
	}
	.feature-card :global(dd) {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.9rem;
		line-height: 1.65;
	}
</style>
