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
		<div class="file-tree__skeleton">
			<div class="skeleton-bar" style="width: 70%"></div>
			<div class="skeleton-bar" style="width: 55%"></div>
			<div class="skeleton-bar" style="width: 85%"></div>
			<div class="skeleton-bar" style="width: 60%; margin-left: 1rem"></div>
			<div class="skeleton-bar" style="width: 50%; margin-left: 1rem"></div>
			<div class="skeleton-bar" style="width: 75%"></div>
		</div>
	{:else if editorState.tree}
		<div class="file-tree__list">
			<FileTreeNode node={editorState.tree} depth={0} {onselectfile} {oncontextmenu} />
		</div>
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
		box-shadow: 0 1px 0 var(--ed-border-default);
		flex-shrink: 0;
		position: relative;
		z-index: 1;
	}

	.file-tree__title {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-muted);
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

	.file-tree__list {
		flex: 1;
		overflow-y: auto;
		padding: var(--ed-space-1) 0;
	}

	/* Skeleton loading */
	.file-tree__skeleton {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-2);
		padding: var(--ed-space-3);
	}

	.skeleton-bar {
		height: 12px;
		border-radius: var(--ed-radius-sm);
		background: linear-gradient(90deg, var(--ed-surface-2) 25%, var(--ed-surface-3) 50%, var(--ed-surface-2) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.file-tree__empty {
		color: var(--ed-text-muted);
		padding: var(--ed-space-4);
		font-size: var(--ed-text-sm);
	}
</style>
