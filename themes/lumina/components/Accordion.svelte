<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = $derived(tag.attributes.typeof === 'Accordion');
</script>

{#if isGroup}
	<div class="accordion">
		{@render children()}
	</div>
{:else}
	{@const name = tag.children
		.find((c) => c?.name === 'span' && c?.attributes?.property === 'name')
		?.children?.[0] ?? ''}
	<details class="accordion-item">
		<summary class="accordion-header">
			<span class="accordion-title">{name}</span>
			<svg class="accordion-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</summary>
		<div class="accordion-body">
			{@render children()}
		</div>
	</details>
{/if}

<style>
	.accordion {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		margin: 1.5rem 0;
	}
	.accordion-item {
		border-bottom: 1px solid var(--color-border);
	}
	.accordion-item:last-child {
		border-bottom: none;
	}
	.accordion-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.25rem;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		user-select: none;
		transition: background-color 200ms ease;
		list-style: none;
	}
	.accordion-header::-webkit-details-marker {
		display: none;
	}
	.accordion-header::marker {
		display: none;
		content: '';
	}
	.accordion-header:hover {
		background: var(--color-surface);
	}
	.accordion-chevron {
		flex-shrink: 0;
		color: var(--color-muted);
		transition: transform 200ms ease;
	}
	.accordion-item[open] .accordion-chevron {
		transform: rotate(180deg);
	}
	.accordion-body {
		padding: 0 1.25rem 1rem;
		font-size: 0.925rem;
		line-height: 1.65;
		color: var(--color-muted);
	}
	.accordion-body :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
