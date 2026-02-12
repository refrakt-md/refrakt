<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const noteStyle = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'style')?.attributes?.content || 'sidenote';
</script>

<aside class="sidenote sidenote-{noteStyle}" typeof="Sidenote">
	<div class="sidenote-content">
		{@render children()}
	</div>
</aside>

<style>
	.sidenote {
		margin: 1rem 0;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.sidenote-sidenote {
		border-left: 3px solid var(--color-primary);
		padding: 0.75rem 1rem;
		background: var(--color-info-bg);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		color: var(--color-muted);
	}

	.sidenote-footnote {
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
		margin-top: 2rem;
		color: var(--color-muted);
	}

	.sidenote-tooltip {
		background: var(--color-surface-hover);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		color: var(--color-muted);
	}

	.sidenote-content :global(p) {
		margin: 0;
	}

	.sidenote-content :global(p + p) {
		margin-top: 0.5rem;
	}
</style>
