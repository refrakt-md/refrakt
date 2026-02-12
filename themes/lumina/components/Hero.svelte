<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const align = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'align')
		?.attributes?.content ?? 'center');

	const background = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'background')
		?.attributes?.content ?? '');

	const backgroundImage = $derived(tag.children
		.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'backgroundImage')
		?.attributes?.content ?? '');
</script>

<section
	class="hero hero-align-{align}"
	style:background={background || undefined}
	style:background-image={backgroundImage ? `url(${backgroundImage})` : undefined}
>
	<div class="hero-content">
		{@render children()}
	</div>
</section>

<style>
	.hero {
		position: relative;
		padding: 5rem 2rem 4.5rem;
		background-size: cover;
		background-position: center;
		overflow: hidden;
	}
	.hero-content {
		max-width: 720px;
		margin: 0 auto;
	}
	.hero-align-center {
		text-align: center;
	}
	.hero-align-center .hero-content {
		margin: 0 auto;
	}
	.hero-align-left {
		text-align: left;
	}
	.hero-align-left .hero-content {
		margin: 0;
	}
	.hero-align-right {
		text-align: right;
	}
	.hero-align-right .hero-content {
		margin: 0 0 0 auto;
	}
	.hero :global(h1) {
		font-size: 3.25rem;
		font-weight: 800;
		letter-spacing: -0.035em;
		line-height: 1.1;
		margin: 0 0 1rem;
		background: linear-gradient(135deg, var(--color-text) 0%, #374151 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.hero :global(p) {
		font-size: 1.2rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 2rem;
	}
	.hero-align-center :global(p) {
		max-width: 560px;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 2rem;
	}
	.hero :global(ul),
	.hero :global(nav) {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.hero-align-center :global(ul),
	.hero-align-center :global(nav) {
		justify-content: center;
	}
	.hero :global(li) {
		padding: 0;
		margin: 0;
	}
	.hero :global(li a),
	.hero :global(nav a) {
		display: inline-flex;
		align-items: center;
		padding: 0.7rem 1.75rem;
		border-radius: var(--radius-sm);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
		transition: all 200ms ease;
	}
	.hero :global(li:first-child a) {
		background: var(--color-primary);
		color: white;
		box-shadow: var(--shadow-sm);
	}
	.hero :global(li:first-child a:hover) {
		background: var(--color-primary-hover);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
		text-decoration: none;
	}
	.hero :global(li:not(:first-child) a) {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.hero :global(li:not(:first-child) a:hover) {
		background: var(--color-surface-hover);
		border-color: var(--color-surface-active);
		text-decoration: none;
	}
</style>
