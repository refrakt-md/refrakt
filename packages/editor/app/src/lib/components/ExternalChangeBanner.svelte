<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';

	let { onreload }: { onreload: () => void } = $props();

	const isDeleted = $derived(editorState.externalChange?.event === 'file-deleted');
</script>

{#if editorState.externalChange}
	<div class="banner">
		<span class="banner__text">
			{isDeleted
				? 'This file was deleted outside the editor.'
				: 'This file was changed outside the editor.'}
		</span>
		<button class="banner__btn banner__btn--reload" onclick={onreload}>
			Reload
		</button>
		<button
			class="banner__btn banner__btn--dismiss"
			onclick={() => { editorState.externalChange = null; }}
		>
			Dismiss
		</button>
	</div>
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		gap: var(--ed-space-3);
		padding: 0.6rem var(--ed-space-4);
		background: var(--ed-warning-subtle);
		border-bottom: 1px solid #fbbf24;
		flex-shrink: 0;
	}

	.banner__text {
		font-size: var(--ed-text-base);
		color: var(--ed-warning-text);
		flex: 1;
	}

	.banner__btn {
		padding: 0.3rem 0.7rem;
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		border: none;
	}

	.banner__btn--reload {
		background: var(--ed-accent);
		color: #ffffff;
	}

	.banner__btn--reload:hover {
		background: var(--ed-accent-hover);
	}

	.banner__btn--dismiss {
		background: transparent;
		color: var(--ed-warning-text);
		border: 1px solid var(--ed-warning);
	}

	.banner__btn--dismiss:hover {
		background: #fde68a;
	}
</style>
