<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const orgType = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'type')?.attributes?.content || 'Organization';
</script>

<article class="organization" typeof="Organization">
	<div class="organization-type">{orgType}</div>
	<div class="organization-content">
		{@render children()}
	</div>
</article>

<style>
	.organization {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 2rem;
		margin: 1.5rem 0;
	}

	.organization-type {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted);
		margin-bottom: 1rem;
	}

	.organization-content :global(img) {
		max-height: 80px;
		width: auto;
		margin-bottom: 1rem;
	}

	.organization-content :global(ul), .organization-content :global(ol) {
		padding-left: 1.5rem;
	}

	.organization-content :global(a) {
		color: var(--color-primary);
	}

	.organization-content :global(a:hover) {
		color: var(--color-primary-hover);
	}
</style>
