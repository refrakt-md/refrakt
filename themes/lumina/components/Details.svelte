<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const summary = tag.children
		.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'summary')
		?.children?.[0] ?? 'Details';

	const isOpen = tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'open')
		?.attributes?.content ?? false;
</script>

<details class="details" open={isOpen || undefined}>
	<summary class="details-summary">
		<svg class="details-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
			<path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		<span>{summary}</span>
	</summary>
	<div class="details-body">
		{@render children()}
	</div>
</details>

<style>
	.details {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		margin: 1.5rem 0;
		overflow: hidden;
	}
	.details-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-weight: 600;
		font-size: 0.925rem;
		cursor: pointer;
		background: var(--color-surface);
		user-select: none;
		list-style: none;
		transition: background-color 200ms ease;
	}
	.details-summary::-webkit-details-marker {
		display: none;
	}
	.details-summary::marker {
		display: none;
		content: '';
	}
	.details-summary:hover {
		background: var(--color-surface-hover);
	}
	.details-chevron {
		flex-shrink: 0;
		color: var(--color-muted);
		transition: transform 200ms ease;
	}
	.details[open] .details-chevron {
		transform: rotate(90deg);
	}
	.details-body {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.925rem;
		line-height: 1.65;
	}
	.details-body :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
