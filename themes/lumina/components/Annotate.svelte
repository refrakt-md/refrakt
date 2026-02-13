<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Annotate';

	const style = isGroup
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'style')?.attributes?.content || 'margin'
		: 'margin';
</script>

{#if isGroup}
	<div class="annotate annotate-{style}">
		{@render children()}
	</div>
{:else}
	<aside class="annotate-note">
		<div class="note-body">
			{@render children()}
		</div>
	</aside>
{/if}

<style>
	/* Margin style: notes float to the right */
	.annotate-margin {
		position: relative;
		margin: 1.5rem 0;
	}

	.annotate-margin :global(.annotate-note) {
		float: right;
		clear: right;
		width: 40%;
		margin: 0 -44% 0.5rem 1rem;
		padding: 0.75rem 1rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
		border-left: 2px solid var(--color-border);
	}

	/* Inline style: notes expand below their position */
	.annotate-inline {
		margin: 1.5rem 0;
	}

	.annotate-inline :global(.annotate-note) {
		margin: 0.5rem 0 1rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--color-muted);
		background: var(--color-surface, #f9fafb);
		border-radius: var(--radius-md, 0.375rem);
		border-left: 3px solid var(--color-primary, #2563eb);
	}

	/* Tooltip style: notes appear on hover */
	.annotate-tooltip {
		margin: 1.5rem 0;
	}

	.annotate-tooltip :global(.annotate-note) {
		display: inline-block;
		position: relative;
		margin: 0 0.25rem;
		padding: 0;
		font-size: 0;
		vertical-align: super;
	}

	.annotate-tooltip :global(.annotate-note)::before {
		content: '?';
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--color-primary, #2563eb);
		border: 1px solid var(--color-primary, #2563eb);
		border-radius: var(--radius-full, 50%);
		cursor: help;
	}

	.annotate-tooltip :global(.annotate-note .note-body) {
		display: none;
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 16rem;
		padding: 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-text);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.375rem);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		margin-bottom: 0.5rem;
		z-index: 10;
	}

	.annotate-tooltip :global(.annotate-note:hover .note-body) {
		display: block;
	}

	.annotate-note {
		/* Fallback for standalone rendering */
	}

	.note-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.note-body :global(span[property]),
	.note-body :global(meta) {
		display: none;
	}

	@media (max-width: 768px) {
		/* Fall back to inline style on small screens */
		.annotate-margin :global(.annotate-note) {
			float: none;
			width: 100%;
			margin: 0.5rem 0 1rem;
			padding: 0.75rem 1rem;
			background: var(--color-surface, #f9fafb);
			border-radius: var(--radius-md, 0.375rem);
		}
	}
</style>
