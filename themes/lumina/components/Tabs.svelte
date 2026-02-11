<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<div class="tabs">
	{@render children()}
</div>

<style>
	.tabs {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
		margin: 1.5rem 0;
	}
</style>
