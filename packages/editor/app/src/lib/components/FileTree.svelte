<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import FileTreeNode from './FileTreeNode.svelte';

	interface Props {
		onselectfile: (path: string) => void;
	}

	let { onselectfile }: Props = $props();
</script>

<nav class="file-tree">
	{#if editorState.treeLoading}
		<div class="file-tree__loading">Loading content tree...</div>
	{:else if editorState.tree}
		<FileTreeNode node={editorState.tree} depth={0} {onselectfile} />
	{:else}
		<div class="file-tree__empty">No content found</div>
	{/if}
</nav>

<style>
	.file-tree {
		overflow-y: auto;
		padding: 0.5rem 0;
		height: 100%;
	}

	.file-tree__loading,
	.file-tree__empty {
		color: #64748b;
		padding: 1rem;
		font-size: 0.8rem;
	}
</style>
