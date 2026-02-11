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
		padding: 2.5rem 0 2rem;
	}
	.feature :global(h2) {
		text-align: center;
		margin-bottom: 2rem;
	}
	.feature :global(dl) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.25rem;
		margin: 0;
	}
	.feature :global(dl > div) {
		padding: 1.5rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		box-shadow: var(--shadow-xs);
		transition: box-shadow 200ms ease, border-color 200ms ease, transform 200ms ease;
	}
	.feature :global(dl > div:hover) {
		box-shadow: var(--shadow-md);
		border-color: var(--color-surface-active);
		transform: translateY(-2px);
	}
	.feature :global(dt) {
		font-weight: 650;
		font-size: 1rem;
		margin-bottom: 0.5rem;
		letter-spacing: -0.01em;
	}
	.feature :global(dd) {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.9rem;
		line-height: 1.65;
	}
</style>
