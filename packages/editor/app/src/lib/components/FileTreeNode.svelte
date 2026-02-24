<script lang="ts">
	import { editorState, type TreeNode } from '../state/editor.svelte.js';
	import FileTreeNode from './FileTreeNode.svelte';

	interface Props {
		node: TreeNode;
		depth: number;
		onselectfile: (path: string) => void;
	}

	let { node, depth, onselectfile }: Props = $props();

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
			>
				_layout.md
			</button>
		{/if}

		{#each node.children ?? [] as child}
			{#if child.type === 'directory'}
				<FileTreeNode node={child} depth={depth + 1} {onselectfile} />
			{:else}
				<button
					class="tree-item"
					class:active={editorState.currentPath === child.path}
					class:draft={child.draft}
					style="--depth: {depth}"
					onclick={() => handleFileClick(child.path)}
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
		padding: 0.35rem 0.75rem 0.35rem calc(0.75rem + var(--depth, 0) * 1rem);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		margin-top: 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.tree-dir:hover {
		color: #1a1a2e;
	}

	.tree-dir__arrow {
		display: inline-block;
		transition: transform 0.15s;
		font-size: 0.65rem;
		transform: rotate(90deg);
	}

	.tree-dir__arrow.collapsed {
		transform: rotate(0deg);
	}

	.tree-item {
		display: block;
		width: 100%;
		padding: 0.35rem 0.75rem 0.35rem calc(0.75rem + var(--depth, 0) * 1rem);
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.1s;
		color: #1a1a2e;
		background: none;
		border: none;
		text-align: left;
	}

	.tree-item:hover {
		background: #e2e8f0;
	}

	.tree-item.active {
		background: #e0f2fe;
		color: #0ea5e9;
	}

	.tree-item--layout {
		color: #d97706;
		font-style: italic;
	}

	.tree-item.draft {
		opacity: 0.5;
	}
</style>
