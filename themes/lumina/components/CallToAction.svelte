<script lang="ts">
	import type { SerializedTag } from '@refract-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<section class="cta">
	{@render children()}
</section>

<style>
	.cta {
		text-align: center;
		padding: 4rem 2rem 3rem;
	}
	.cta :global(h1),
	.cta :global(h2),
	.cta :global(h3) {
		font-size: 2.75rem;
		font-weight: 800;
		letter-spacing: -0.025em;
		margin-bottom: 1rem;
		margin-top: 0;
		line-height: 1.15;
	}
	.cta :global(p) {
		font-size: 1.2rem;
		color: var(--color-muted);
		max-width: 600px;
		margin: 0 auto 2rem;
		line-height: 1.6;
	}
	.cta :global(ul) {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.cta :global(li) {
		padding: 0;
	}
	.cta :global(li a),
	.cta :global(nav a) {
		display: inline-block;
		padding: 0.625rem 1.5rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
		transition: background-color 0.15s, box-shadow 0.15s;
	}
	.cta :global(li:first-child a) {
		background: var(--color-primary);
		color: white;
	}
	.cta :global(li:first-child a:hover) {
		background: #2563eb;
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
	}
	.cta :global(li:not(:first-child) a) {
		background: #f1f5f9;
		color: var(--color-text);
	}
	.cta :global(li:not(:first-child) a:hover) {
		background: #e2e8f0;
	}
</style>
