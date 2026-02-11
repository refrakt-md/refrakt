<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Accordion';
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
		<summary class="accordion-header">{name}</summary>
		<div class="accordion-body">
			{@render children()}
		</div>
	</details>
{/if}

<style>
	.accordion {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		margin: 1.5rem 0;
	}
	.accordion-item {
		border-bottom: 1px solid #e5e7eb;
	}
	.accordion-item:last-child {
		border-bottom: none;
	}
	.accordion-header {
		padding: 1rem;
		font-weight: 600;
		cursor: pointer;
		user-select: none;
	}
	.accordion-header:hover {
		background: #f9fafb;
	}
	.accordion-body {
		padding: 0 1rem 1rem;
		border-top: 1px solid #f3f4f6;
	}
</style>
