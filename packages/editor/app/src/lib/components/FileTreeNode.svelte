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
			<svg class="tree-dir__chevron" class:collapsed={!expanded} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="6 4 10 8 6 12" />
			</svg>
			{#if expanded}
				<svg class="tree-dir__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M1.5 4h4.5l1.5 1.5H14.5v8.5h-13z" />
					<path d="M1.5 4v-1.5h4.5l1.5 1.5" />
				</svg>
			{:else}
				<svg class="tree-dir__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M1.5 4h4.5l1.5 1.5H14.5v8.5h-13V2.5h4.5l1.5 1.5" />
				</svg>
			{/if}
			<span class="tree-dir__name">{node.name}</span>
		</button>
	{/if}

	{#if depth === 0 || expanded}
		{#if node.layout}
			<button
				class="tree-item tree-item--layout"
				class:active={editorState.currentPath === node.layout.path}
				style="--depth: {depth}"
				onclick={() => handleFileClick(node.layout!.path)}
				oncontextmenu={(e) => handleContextMenu(e, node.layout!)}
			>
				<svg class="tree-item__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
					<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
					<line x1="1.5" y1="5.5" x2="14.5" y2="5.5" />
					<line x1="6" y1="5.5" x2="6" y2="14.5" />
				</svg>
				<span class="tree-item__name">_layout.md</span>
			</button>
		{/if}

		{#each node.children ?? [] as child}
			{#if child.type === 'directory'}
				<FileTreeNode node={child} depth={depth + 1} {onselectfile} {oncontextmenu} />
			{:else}
				<button
					class="tree-item"
					class:active={editorState.currentPath === child.path}
					style="--depth: {depth}"
					onclick={() => handleFileClick(child.path)}
					oncontextmenu={(e) => handleContextMenu(e, child)}
				>
					<svg class="tree-item__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V6L9 1.5Z" />
						<polyline points="9 1.5 9 6 13.5 6" />
					</svg>
					<span class="tree-item__name">{child.name}</span>
					{#if child.draft}
						<span class="tree-item__badge">Draft</span>
					{/if}
				</button>
			{/if}
		{/each}
	{/if}
{/if}

<style>
	/* Directory row */
	.tree-dir {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.3rem var(--ed-space-3) 0.3rem calc(var(--ed-space-3) + var(--depth, 0) * 1rem);
		font-size: var(--ed-text-sm);
		font-weight: 600;
		color: var(--ed-text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		border-radius: 0;
		transition: background var(--ed-transition-fast);
	}

	.tree-dir:hover {
		background: var(--ed-surface-2);
		color: var(--ed-text-primary);
	}

	.tree-dir__chevron {
		flex-shrink: 0;
		transition: transform var(--ed-transition-fast);
		transform: rotate(90deg);
		color: var(--ed-text-muted);
	}

	.tree-dir__chevron.collapsed {
		transform: rotate(0deg);
	}

	.tree-dir__icon {
		flex-shrink: 0;
		color: var(--ed-text-muted);
	}

	.tree-dir__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* File row */
	.tree-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.3rem var(--ed-space-3) 0.3rem calc(var(--ed-space-3) + var(--depth, 0) * 1rem + 12px + 0.3rem);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		transition: background var(--ed-transition-fast);
		color: var(--ed-text-primary);
		background: none;
		border: none;
		border-left: 3px solid transparent;
		text-align: left;
	}

	.tree-item:hover {
		background: var(--ed-surface-2);
	}

	.tree-item.active {
		background: var(--ed-accent-subtle);
		border-left-color: var(--ed-accent);
		color: var(--ed-accent-hover);
	}

	.tree-item__icon {
		flex-shrink: 0;
		color: var(--ed-text-muted);
	}

	.tree-item.active .tree-item__icon {
		color: var(--ed-accent);
	}

	.tree-item--layout .tree-item__icon {
		color: var(--ed-warning);
	}

	.tree-item__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	/* Draft badge */
	.tree-item__badge {
		font-size: 10px;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 99px;
		background: var(--ed-warning-subtle);
		color: var(--ed-warning-text);
		white-space: nowrap;
		line-height: 1.2;
		flex-shrink: 0;
	}
</style>
