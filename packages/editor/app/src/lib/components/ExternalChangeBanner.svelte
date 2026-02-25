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
		gap: 0.75rem;
		padding: 0.6rem 1rem;
		background: #fef3c7;
		border-bottom: 1px solid #fbbf24;
		flex-shrink: 0;
	}

	.banner__text {
		font-size: 0.8rem;
		color: #92400e;
		flex: 1;
	}

	.banner__btn {
		padding: 0.3rem 0.7rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
	}

	.banner__btn--reload {
		background: #0ea5e9;
		color: #ffffff;
	}

	.banner__btn--reload:hover {
		background: #0284c7;
	}

	.banner__btn--dismiss {
		background: transparent;
		color: #92400e;
		border: 1px solid #d97706;
	}

	.banner__btn--dismiss:hover {
		background: #fde68a;
	}
</style>
