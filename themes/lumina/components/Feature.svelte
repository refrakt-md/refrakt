<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="feature">
	{@render children()}
</section>

<style>
	.feature {
		padding: 3rem 0 2rem;
	}
	.feature :global(h2) {
		text-align: center;
		margin-bottom: 2rem;
	}
	.feature :global(dl) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin: 0;
	}
	.feature :global(dl > div) {
		padding: 1.25rem;
		border-radius: 10px;
		border: 1px solid var(--color-border);
		transition: box-shadow 0.15s;
	}
	.feature :global(dl > div:hover) {
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
	}
	.feature :global(dt) {
		font-weight: 700;
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}
	.feature :global(dd) {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.925rem;
		line-height: 1.6;
	}
</style>
