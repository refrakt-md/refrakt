<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
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
	<summary class="details-summary">{summary}</summary>
	<div class="details-body">
		{@render children()}
	</div>
</details>

<style>
	.details {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		margin: 1.5rem 0;
		overflow: hidden;
	}
	.details-summary {
		padding: 0.75rem 1rem;
		font-weight: 600;
		cursor: pointer;
		background: #f9fafb;
		user-select: none;
	}
	.details-summary:hover {
		background: #f3f4f6;
	}
	.details-body {
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
	}
</style>
