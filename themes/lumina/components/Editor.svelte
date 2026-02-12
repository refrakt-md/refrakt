<script lang="ts">
	import type { SerializedTag } from '@refrakt-md/svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<div class="editor">
	<div class="editor-topbar">
		<span class="editor-dot" style="background: #ef4444;"></span>
		<span class="editor-dot" style="background: #f59e0b;"></span>
		<span class="editor-dot" style="background: #22c55e;"></span>
	</div>
	<div class="editor-content">
		{@render children()}
	</div>
</div>

<style>
	.editor {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		margin: 1.5rem 0;
		background: var(--color-code-bg);
		color: var(--color-code-text);
		box-shadow: var(--shadow-md);
	}
	.editor-topbar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.editor-dot {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
		opacity: 0.8;
	}
	.editor-content :global(pre) {
		margin: 0;
		padding: 1rem 1.25rem;
		overflow-x: auto;
		background: none;
		border: none;
		border-radius: 0;
	}
	.editor-content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}
</style>
