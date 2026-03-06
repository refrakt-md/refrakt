<script lang="ts">
	import type { ContentNode } from '../editor/block-parser.js';

	interface Props {
		nodes: ContentNode[];
		activePath: number[];
		onselect: (path: number[]) => void;
		// Root node (only at top level)
		rootLabel?: string;
		onrootclick?: () => void;
		isRootActive?: boolean;
		// Internal (for recursion)
		depth?: number;
		pathPrefix?: number[];
	}

	let {
		nodes, activePath, onselect,
		rootLabel, onrootclick, isRootActive = false,
		depth = 0, pathPrefix = [],
	}: Props = $props();

	function isActivePath(path: number[]): boolean {
		if (path.length !== activePath.length) return false;
		return path.every((v, i) => v === activePath[i]);
	}

	function isInActivePath(path: number[]): boolean {
		if (path.length > activePath.length) return false;
		return path.every((v, i) => v === activePath[i]);
	}

	const TYPE_ICONS: Record<string, string> = {
		heading: 'M3 3v10M13 3v10M3 8h10',
		paragraph: 'M2 4h12M2 8h12M2 12h8',
		fence: 'M5 4L2 8l3 4M11 4l3 4-3 4',
		list: 'M4 4h10M4 8h10M4 12h10M2 4h0M2 8h0M2 12h0',
		quote: 'M4 4h8M4 7h6M1 3v8',
		hr: 'M2 8h12',
		image: 'M2 2h12v12H2zM5 5l-3 7h12l-4-5-2 2.5',
	};
</script>

<!-- Root node (only rendered at top level) -->
{#if rootLabel && onrootclick}
	<div class="tree-node">
		<button
			type="button"
			class="tree-node__btn tree-node__btn--rune"
			class:active={isRootActive}
			onclick={onrootclick}
		>
			<span class="tree-node__indicator">▾</span>
			<span class="tree-node__rune-dot"></span>
			<span class="tree-node__label tree-node__label--rune">{rootLabel}</span>
		</button>
	</div>
{/if}

{#each nodes as node, i}
	{@const nodePath = [...pathPrefix, i]}
	{@const isRune = node.type === 'rune'}
	{@const isActive = isActivePath(nodePath)}
	{@const isAncestor = isInActivePath(nodePath) && !isActive}
	{@const hasChildren = isRune && !node.selfClosing && node.children && node.children.length > 0}

	<div class="tree-node" style="padding-left: {(depth + (rootLabel ? 1 : 0)) * 16}px">
		{#if isRune}
			<button
				type="button"
				class="tree-node__btn tree-node__btn--rune"
				class:active={isActive}
				class:ancestor={isAncestor}
				onclick={() => onselect(nodePath)}
			>
				<span class="tree-node__indicator">{hasChildren ? '▾' : '▸'}</span>
				<span class="tree-node__rune-dot"></span>
				<span class="tree-node__label tree-node__label--rune">{node.label}</span>
			</button>
		{:else}
			<button
				type="button"
				class="tree-node__btn tree-node__btn--content"
				class:active={isActive}
				onclick={() => onselect(nodePath)}
			>
				<svg class="tree-node__icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d={TYPE_ICONS[node.type] ?? 'M2 4h12M2 8h12M2 12h8'} />
				</svg>
				<span class="tree-node__label tree-node__label--content">{node.label}</span>
			</button>
		{/if}
	</div>

	{#if hasChildren && node.children}
		<svelte:self
			nodes={node.children}
			{activePath}
			{onselect}
			depth={depth + 1}
			pathPrefix={nodePath}
		/>
	{/if}
{/each}

<style>
	.tree-node {
		display: flex;
	}

	.tree-node__btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		width: 100%;
		padding: 0.2rem 0.4rem;
		border: none;
		border-radius: calc(var(--ed-radius-sm, 4px) - 1px);
		background: transparent;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		text-align: left;
		transition: background var(--ed-transition-fast);
	}

	.tree-node__btn:hover {
		background: var(--ed-surface-2);
	}

	.tree-node__btn.active {
		background: var(--ed-accent-muted);
		color: var(--ed-accent);
	}

	.tree-node__btn.ancestor {
		color: var(--ed-text-primary);
	}

	.tree-node__btn--content {
		color: var(--ed-text-muted);
		font-size: var(--ed-text-xs);
	}

	.tree-node__btn--content.active {
		background: var(--ed-surface-2);
		color: var(--ed-text-secondary);
	}

	.tree-node__indicator {
		width: 10px;
		font-size: 9px;
		color: var(--ed-text-muted);
		flex-shrink: 0;
		text-align: center;
	}

	.tree-node__rune-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ed-warning);
		flex-shrink: 0;
	}

	.tree-node__icon {
		flex-shrink: 0;
		opacity: 0.5;
	}

	.tree-node__label--rune {
		font-weight: 500;
	}

	.tree-node__label--content {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
</style>
