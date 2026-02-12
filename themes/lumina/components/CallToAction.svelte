<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="cta">
	{@render children()}
</section>

<style>
	.cta {
		text-align: center;
		padding: 3.5rem 2rem 3rem;
	}
	.cta :global(h1),
	.cta :global(h2),
	.cta :global(h3) {
		font-size: 2.5rem;
		font-weight: 750;
		letter-spacing: -0.03em;
		margin-bottom: 0.75rem;
		margin-top: 0;
		line-height: 1.15;
		background: linear-gradient(135deg, var(--color-text) 0%, #374151 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.cta :global(p) {
		font-size: 1.15rem;
		color: var(--color-muted);
		max-width: 540px;
		margin: 0 auto 2rem;
		line-height: 1.65;
	}
	.cta :global(ul) {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.cta :global(li) {
		padding: 0;
		margin: 0;
	}
	.cta :global(li a),
	.cta :global(nav a) {
		display: inline-flex;
		align-items: center;
		padding: 0.625rem 1.5rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.925rem;
		transition: all 200ms ease;
	}
	.cta :global(li:first-child a) {
		background: var(--color-primary);
		color: white;
		box-shadow: var(--shadow-sm), 0 0 0 0 rgba(37, 99, 235, 0);
	}
	.cta :global(li:first-child a:hover) {
		background: var(--color-primary-hover);
		box-shadow: var(--shadow-md), 0 0 0 0 rgba(37, 99, 235, 0.1);
		transform: translateY(-1px);
		text-decoration: none;
	}
	.cta :global(li:not(:first-child) a) {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.cta :global(li:not(:first-child) a:hover) {
		background: var(--color-surface-hover);
		border-color: var(--color-surface-active);
		text-decoration: none;
	}
</style>
