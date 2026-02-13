<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = $derived(tag.attributes.typeof === 'Accordion');
</script>

{#if isGroup}
	<div class="rf-accordion">
		{@render children()}
	</div>
{:else}
	{@const name = tag.children
		.find((c) => c?.name === 'span' && c?.attributes?.property === 'name')
		?.children?.[0] ?? ''}
	<details class="rf-accordion-item">
		<summary class="rf-accordion-item__header">
			<span class="rf-accordion-item__title">{name}</span>
		</summary>
		<div class="rf-accordion-item__body">
			{@render children()}
		</div>
	</details>
{/if}
