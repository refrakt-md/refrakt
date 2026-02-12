<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const mode = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'mode')?.attributes?.content || 'unified';
	const language = tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'language')?.attributes?.content || '';
</script>

<div class="diff diff-{mode}" typeof="Diff">
	<div class="diff-panels">
		<div class="diff-panel diff-before">
			<div class="diff-label">Before</div>
		</div>
		<div class="diff-panel diff-after">
			<div class="diff-label">After</div>
		</div>
	</div>
	<div class="diff-content">
		{@render children()}
	</div>
</div>

<style>
	.diff {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		margin: 1.5rem 0;
		overflow: hidden;
	}

	.diff-panels {
		display: none;
	}

	.diff-content {
		display: grid;
		gap: 0;
	}

	.diff-split .diff-content {
		grid-template-columns: 1fr 1fr;
	}

	.diff-content :global(pre) {
		margin: 0;
		border-radius: 0;
		border: none;
	}

	.diff-content :global(pre:first-child) {
		border-bottom: 1px solid var(--color-border);
	}

	.diff-split .diff-content :global(pre:first-child) {
		border-bottom: none;
		border-right: 1px solid var(--color-border);
	}

	.diff-content :global(pre[data-name="before"])::before {
		content: 'Before';
		display: block;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-danger);
		padding-bottom: 0.5rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.diff-content :global(pre[data-name="after"])::before {
		content: 'After';
		display: block;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-success);
		padding-bottom: 0.5rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
