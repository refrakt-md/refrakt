<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SerializedTag } from '@refrakt-md/svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();

	const isGroup = tag.attributes.typeof === 'Storyboard';

	// For Storyboard container
	const styleMeta = isGroup
		? tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'style')?.attributes?.content || 'clean'
		: 'clean';
	const columns = isGroup
		? parseInt(tag.children.find((c: any) => c?.name === 'meta' && c?.attributes?.property === 'columns')?.attributes?.content || '3', 10)
		: 3;
</script>

{#if isGroup}
	<div class="storyboard storyboard-{styleMeta}" style="--sb-columns: {columns};">
		{@render children()}
	</div>
{:else}
	<div class="storyboard-panel">
		<div class="panel-content">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.storyboard {
		margin: 1.5rem 0;
	}

	.storyboard :global(div[data-name="panels"]) {
		display: grid;
		grid-template-columns: repeat(var(--sb-columns, 3), 1fr);
		gap: 1rem;
	}

	/* Clean style */
	.storyboard-clean .storyboard-panel {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		overflow: hidden;
	}

	.storyboard-clean .panel-content {
		padding: 0.75rem;
	}

	/* Comic style */
	.storyboard-comic .storyboard-panel {
		border: 3px solid var(--color-text, #111);
		border-radius: 0.25rem;
		overflow: hidden;
		transform: rotate(-0.5deg);
	}

	.storyboard-comic .storyboard-panel:nth-child(even) {
		transform: rotate(0.5deg);
	}

	.storyboard-comic .panel-content {
		padding: 0.5rem;
	}

	.storyboard-comic .panel-content :global(p) {
		font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
		font-size: 0.9375rem;
		text-align: center;
		margin: 0.5rem 0 0;
	}

	/* Polaroid style */
	.storyboard-polaroid .storyboard-panel {
		background: white;
		padding: 0.75rem 0.75rem 2.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border-radius: 2px;
	}

	.storyboard-polaroid .panel-content :global(p) {
		font-size: 0.8125rem;
		text-align: center;
		color: var(--color-muted);
		margin: 0.5rem 0 0;
	}

	/* Shared image styles */
	.storyboard-panel :global(img) {
		width: 100%;
		height: auto;
		display: block;
	}

	.panel-content :global(span[property]),
	.panel-content :global(meta) {
		display: none;
	}

	.panel-content :global(p:last-child) {
		margin-bottom: 0;
	}

	@media (max-width: 768px) {
		.storyboard :global(div[data-name="panels"]) {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.storyboard :global(div[data-name="panels"]) {
			grid-template-columns: 1fr;
		}
	}
</style>
