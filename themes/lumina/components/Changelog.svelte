<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isRelease = $derived(tag.attributes.typeof === 'ChangelogRelease');
</script>

{#if isRelease}
	<section class="changelog-release">
		{@render children()}
	</section>
{:else}
	<section class="changelog">
		{@render children()}
	</section>
{/if}

<style>
	.changelog {
		margin: 2rem 0;
	}
	.changelog-release {
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.changelog-release:last-child {
		border-bottom: none;
	}
	.changelog-release :global(h3) {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
		color: var(--color-text);
	}
	.changelog-release :global(time) {
		display: block;
		font-size: 0.8rem;
		color: var(--color-muted);
		margin-bottom: 0.75rem;
	}
	.changelog-release :global(ul) {
		padding-left: 1.25rem;
		margin: 0;
	}
	.changelog-release :global(li) {
		font-size: 0.925rem;
		line-height: 1.65;
		margin-bottom: 0.25rem;
	}
	.changelog-release :global(strong) {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		margin-right: 0.375rem;
		vertical-align: middle;
	}
	/* Category colors */
	.changelog-release :global(li strong:first-child) {
		background: var(--color-success-bg);
		color: var(--color-success);
	}
</style>
