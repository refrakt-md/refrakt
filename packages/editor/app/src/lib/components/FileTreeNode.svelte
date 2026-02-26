<script lang="ts">
	import { editorState, type TreeNode } from '../state/editor.svelte.js';
	import FileTreeNode from './FileTreeNode.svelte';

	interface Props {
		node: TreeNode;
		depth: number;
		onselectfile: (path: string) => void;
		oncontextmenu?: (e: MouseEvent, node: TreeNode) => void;
	}

	let { node, depth, onselectfile, oncontextmenu }: Props = $props();

	function handleContextMenu(e: MouseEvent, targetNode: TreeNode) {
		if (oncontextmenu) {
			e.preventDefault();
			oncontextmenu(e, targetNode);
		}
	}

	function handleFileClick(path: string) {
		onselectfile(path);
	}

	function handleDirToggle() {
		editorState.toggleDir(node.path || node.name);
	}

	let expanded = $derived(editorState.isDirExpanded(node.path || node.name));
</script>

{#if node.type === 'directory'}
	{#if depth > 0}
		<button
			class="tree-dir"
			style="--depth: {depth - 1}"
			onclick={handleDirToggle}
			oncontextmenu={(e) => handleContextMenu(e, node)}
		>
			<span class="tree-dir__arrow" class:collapsed={!expanded}>▸</span>
			{node.name}
		</button>
	{/if}

	{#if depth === 0 || expanded}
		{#if node.layout}
			<button
				class="tree-item tree-item--layout"
				class:active={editorState.currentPath === node.layout.path}
				class:draft={node.layout.draft}
				style="--depth: {depth}"
				onclick={() => handleFileClick(node.layout!.path)}
				oncontextmenu={(e) => handleContextMenu(e, node.layout!)}
			>
				_layout.md
			</button>
		{/if}

		{#each node.children ?? [] as child}
			{#if child.type === 'directory'}
				<FileTreeNode node={child} depth={depth + 1} {onselectfile} {oncontextmenu} />
			{:else}
				<button
					class="tree-item"
					class:active={editorState.currentPath === child.path}
					class:draft={child.draft}
					style="--depth: {depth}"
					onclick={() => handleFileClick(child.path)}
					oncontextmenu={(e) => handleContextMenu(e, child)}
				>
					{child.name}
				</button>
			{/if}
		{/each}
	{/if}
{/if}

<style>
	.tree-dir {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.35rem var(--ed-space-3) 0.35rem calc(var(--ed-space-3) + var(--depth, 0) * 1rem);
		font-size: var(--ed-text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-tertiary);
		margin-top: var(--ed-space-2);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.tree-dir:hover {
		color: var(--ed-text-primary);
	}

	.tree-dir__arrow {
		display: inline-block;
		transition: transform var(--ed-transition-fast);
		font-size: var(--ed-text-xs);
		transform: rotate(90deg);
	}

	.tree-dir__arrow.collapsed {
		transform: rotate(0deg);
	}

	.tree-item {
		display: block;
		width: 100%;
		padding: 0.35rem var(--ed-space-3) 0.35rem calc(var(--ed-space-3) + var(--depth, 0) * 1rem);
		font-size: var(--ed-text-base);
		cursor: pointer;
		transition: background var(--ed-transition-fast);
		color: var(--ed-text-primary);
		background: none;
		border: none;
		text-align: left;
	}

	.tree-item:hover {
		background: var(--ed-surface-3);
	}

	.tree-item.active {
		background: var(--ed-accent-subtle);
		color: var(--ed-accent);
	}

	.tree-item--layout {
		color: var(--ed-warning);
		font-style: italic;
	}

	.tree-item.draft {
		opacity: 0.5;
	}
</style>
