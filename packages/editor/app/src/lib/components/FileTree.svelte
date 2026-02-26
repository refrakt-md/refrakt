<script lang="ts">
	import { editorState, type TreeNode } from '../state/editor.svelte.js';
	import FileTreeNode from './FileTreeNode.svelte';

	interface Props {
		onselectfile: (path: string) => void;
		onnewpage: () => void;
		onnewdirectory: () => void;
		oncontextmenu?: (e: MouseEvent, node: TreeNode) => void;
	}

	let { onselectfile, onnewpage, onnewdirectory, oncontextmenu }: Props = $props();
</script>

<nav class="file-tree">
	<div class="file-tree__header">
		<span class="file-tree__title">Content</span>
		<div class="file-tree__actions">
			<button class="file-tree__btn" onclick={onnewpage} title="New page">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M3 1h7l3 3v11H3V1z" stroke="currentColor" stroke-width="1.2"/>
					<path d="M8 6v4M6 8h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
				</svg>
			</button>
			<button class="file-tree__btn" onclick={onnewdirectory} title="New directory">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M1 3h5l1.5 1.5H15v10H1V3z" stroke="currentColor" stroke-width="1.2"/>
					<path d="M8 7.5v3M6.5 9h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
	</div>
	{#if editorState.treeLoading}
		<div class="file-tree__loading">Loading content tree...</div>
	{:else if editorState.tree}
		<FileTreeNode node={editorState.tree} depth={0} {onselectfile} {oncontextmenu} />
	{:else}
		<div class="file-tree__empty">No content found</div>
	{/if}
</nav>

<style>
	.file-tree {
		overflow-y: auto;
		padding: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.file-tree__header {
		display: flex;
		align-items: center;
		padding: var(--ed-space-2) var(--ed-space-3);
		border-bottom: 1px solid var(--ed-border-default);
		flex-shrink: 0;
	}

	.file-tree__title {
		font-size: var(--ed-text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-tertiary);
	}

	.file-tree__actions {
		margin-left: auto;
		display: flex;
		gap: 0.15rem;
	}

	.file-tree__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: none;
		background: transparent;
		color: var(--ed-text-muted);
		cursor: pointer;
		border-radius: var(--ed-radius-sm);
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.file-tree__btn:hover {
		background: var(--ed-surface-2);
		color: var(--ed-accent);
	}

	.file-tree__loading,
	.file-tree__empty {
		color: var(--ed-text-tertiary);
		padding: var(--ed-space-4);
		font-size: var(--ed-text-base);
	}
</style>
