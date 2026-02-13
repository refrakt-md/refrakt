<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const summary = $derived(tag.children
		.find((c: any) => c?.name === 'span' && c?.attributes?.property === 'summary')
		?.children?.[0] ?? 'Details');

	const isOpen = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'open')
		?.attributes?.content ?? false);
</script>

<details class="rf-details" open={isOpen || undefined}>
	<summary class="rf-details__summary">
		<span>{summary}</span>
	</summary>
	<div class="rf-details__body">
		{@render children()}
	</div>
</details>
