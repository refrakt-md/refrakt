<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="page-section" class:split={tag.attributes.class?.includes('split')}>
	{@render children()}
</section>

<style>
	.page-section {
		padding: 2rem 0;
	}
</style>
