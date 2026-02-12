<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="page-section" class:split={tag.attributes.class?.includes('split')}>
	{@render children()}
</section>

<style>
	.page-section {
		padding: 3rem 0;
	}
	.page-section + .page-section {
		border-top: 1px solid var(--color-border);
	}
	.page-section :global(> h1:first-child),
	.page-section :global(> h2:first-child) {
		margin-top: 0;
	}
	.split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		align-items: start;
	}
	@media (max-width: 768px) {
		.split {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
</style>
