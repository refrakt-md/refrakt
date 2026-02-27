<script lang="ts">
	import type { Snippet } from 'svelte';
	import { editorState } from '../state/editor.svelte.js';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Viewport presets for preview mode card width
	const VIEWPORT_WIDTHS: Record<string, number> = {
		desktop: 1200,
		tablet: 768,
		mobile: 375,
	};

	const cardMaxWidth = $derived(
		editorState.editorMode === 'preview'
			? VIEWPORT_WIDTHS[editorState.viewport] ?? 1200
			: 1200
	);
</script>

<div class="page-card" style="--page-card-width: {cardMaxWidth}px">
	{@render children()}
</div>

<style>
	.page-card {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		width: calc(100% - 2 * var(--ed-space-4));
		max-width: var(--page-card-width, 960px);
		margin: var(--ed-space-4) auto;
		background: var(--ed-surface-0);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-lg);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		transition: max-width var(--ed-transition-slow);
	}
</style>
