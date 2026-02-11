<script lang="ts">
	import type { SerializedTag } from '$lib/renderer/Renderer.svelte';
	import type { Snippet } from 'svelte';

	let { tag, children }: { tag: SerializedTag; children: Snippet } = $props();
</script>

<div class="editor">
	{@render children()}
</div>

<style>
	.editor {
		border: 1px solid #1e293b;
		border-radius: 8px;
		overflow: hidden;
		margin: 1.5rem 0;
		background: #0f172a;
		color: #e2e8f0;
	}
	.editor :global(pre) {
		margin: 0;
		padding: 1rem;
		overflow-x: auto;
	}
	.editor :global(code) {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.875rem;
	}
</style>
