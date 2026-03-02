<script lang="ts">
	import { editorState, type TreeNode } from '../state/editor.svelte.js';
	import type { RouteRule } from '../api/client.js';
	import FileTreeNode from './FileTreeNode.svelte';

	interface Props {
		onselectfile: (path: string) => void;
		onnewpage: (directory: string | undefined, anchorRect: DOMRect) => void;
		onnewdirectory: (parent?: string) => void;
		onnewcategory: (anchorRect: DOMRect) => void;
		oncontextmenu?: (e: MouseEvent, node: TreeNode) => void;
	}

	let { onselectfile, onnewpage, onnewdirectory, onnewcategory, oncontextmenu }: Props = $props();

	interface Category {
		name: string;
		pattern: string;
		layout: string;
		/** The directory prefix (e.g. "docs", "blog") — empty string for catch-all */
		dirPrefix: string;
		/** The tree node for this category's directory, if it exists */
		treeNode: TreeNode | null;
		/** Root-level pages that belong to this category (for catch-all only) */
		rootPages: TreeNode[];
	}

	/**
	 * Extract the directory prefix from a route rule pattern.
	 * "docs/**" → "docs", "blog/*" → "blog", "**" → ""
	 */
	function patternToPrefix(pattern: string): string {
		return pattern.replace(/\/?\*+$/, '');
	}

	/**
	 * Derive a display name from a pattern prefix.
	 * "docs" → "Docs", "blog" → "Blog", "" → "Pages"
	 */
	function prefixToName(prefix: string): string {
		if (!prefix) return 'Pages';
		const name = prefix.split('/').pop()!;
		return name.charAt(0).toUpperCase() + name.slice(1);
	}

	/**
	 * Build categories from routeRules + tree.
	 * Each routeRule with a directory-style pattern becomes a category.
	 * The catch-all "**" becomes the "Pages" category containing root-level files.
	 */
	let categories = $derived.by(() => {
		const tree = editorState.tree;
		const rules = editorState.routeRules;
		if (!tree) return [];

		const cats: Category[] = [];
		const claimedDirs = new Set<string>();

		for (const rule of rules) {
			const prefix = patternToPrefix(rule.pattern);

			if (!prefix) {
				// Catch-all: collect root-level pages not in any category dir
				continue;
			}

			// Find the matching directory in the tree
			const dirNode = tree.children?.find(
				(c: TreeNode) => c.type === 'directory' && c.name === prefix
			) ?? null;

			claimedDirs.add(prefix);
			cats.push({
				name: prefixToName(prefix),
				pattern: rule.pattern,
				layout: rule.layout,
				dirPrefix: prefix,
				treeNode: dirNode,
				rootPages: [],
			});
		}

		// Build the "Pages" category from root-level pages + unclaimed directories
		const rootPages = (tree.children ?? []).filter(
			(c: TreeNode) => c.type !== 'directory' || !claimedDirs.has(c.name)
		);

		// Pages section always goes first
		cats.unshift({
			name: 'Pages',
			pattern: '**',
			layout: 'default',
			dirPrefix: '',
			treeNode: null,
			rootPages,
		});

		return cats;
	});
</script>

<nav class="cat-nav">
	<div class="cat-nav__header">
		<span class="cat-nav__title">Content</span>
		<div class="cat-nav__actions">
			<button class="cat-nav__icon-btn" onclick={(e: MouseEvent) => onnewcategory((e.currentTarget as HTMLElement).getBoundingClientRect())} title="New category">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M1 3h5l1.5 1.5H15v10H1V3z" stroke="currentColor" stroke-width="1.2"/>
					<path d="M8 7.5v3M6.5 9h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
	</div>

	{#if editorState.treeLoading}
		<div class="cat-nav__skeleton">
			<div class="skeleton-bar" style="width: 70%"></div>
			<div class="skeleton-bar" style="width: 55%"></div>
			<div class="skeleton-bar" style="width: 85%"></div>
			<div class="skeleton-bar" style="width: 60%; margin-left: 1rem"></div>
			<div class="skeleton-bar" style="width: 50%; margin-left: 1rem"></div>
		</div>
	{:else}
		<div class="cat-nav__list">
			{#each categories as cat}
				<div class="cat-nav__section">
					<div class="cat-nav__section-header">
						<span class="cat-nav__section-name">{cat.name}</span>
						<button
							class="cat-nav__icon-btn"
							title="Add to {cat.name}"
							onclick={(e: MouseEvent) => {
								const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
								onnewpage(cat.dirPrefix || undefined, rect);
							}}
						>
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<line x1="8" y1="3" x2="8" y2="13" />
								<line x1="3" y1="8" x2="13" y2="8" />
							</svg>
						</button>
					</div>

					{#if cat.dirPrefix && cat.treeNode}
						<!-- Category with its own directory -->
						<FileTreeNode node={cat.treeNode} depth={0} {onselectfile} {oncontextmenu} {onnewpage} />
					{:else if !cat.dirPrefix}
						<!-- Pages: root-level items -->
						{#each cat.rootPages as item}
							{#if item.type === 'directory'}
								<FileTreeNode node={item} depth={1} {onselectfile} {oncontextmenu} {onnewpage} />
							{:else}
								<button
									class="tree-item"
									class:active={editorState.currentPath === item.path}
									style="--depth: 0"
									onclick={() => onselectfile(item.path)}
									oncontextmenu={(e) => { if (oncontextmenu) { e.preventDefault(); oncontextmenu(e, item); } }}
								>
									<svg class="tree-item__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
										<path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V6L9 1.5Z" />
										<polyline points="9 1.5 9 6 13.5 6" />
									</svg>
									<span class="tree-item__name">{item.name}</span>
									{#if item.draft}
										<span class="tree-item__badge">Draft</span>
									{/if}
								</button>
							{/if}
						{/each}
					{:else}
						<!-- Category dir doesn't exist yet -->
						<div class="cat-nav__empty">No content yet</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</nav>

<style>
	.cat-nav {
		overflow-y: auto;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.cat-nav__header {
		display: flex;
		align-items: center;
		height: 60px;
		padding: 0 var(--ed-space-3);
		flex-shrink: 0;
	}

	.cat-nav__title {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-muted);
	}

	.cat-nav__actions {
		margin-left: auto;
		display: flex;
		gap: 0.15rem;
	}

	.cat-nav__icon-btn {
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

	.cat-nav__icon-btn:hover {
		background: var(--ed-surface-2);
		color: var(--ed-accent);
	}

	.cat-nav__list {
		flex: 1;
		overflow-y: auto;
	}

	/* ── Section ──────────────────────────────────────── */

	.cat-nav__section {
		padding-bottom: var(--ed-space-2);
	}

	.cat-nav__section-header {
		display: flex;
		align-items: center;
		padding: var(--ed-space-2) var(--ed-space-3);
		border-bottom: 1px solid var(--ed-border-subtle);
	}

	.cat-nav__section-name {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-muted);
		flex: 1;
	}

	.cat-nav__empty {
		padding: var(--ed-space-2) var(--ed-space-3);
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		font-style: italic;
	}

	/* ── Skeleton loading ─────────────────────────────── */

	.cat-nav__skeleton {
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

	/* ── Inline file items (for Pages section) ────────── */
	/* Reusing FileTreeNode styles — these handle the root pages directly */

	.tree-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		min-height: 30px;
		padding: 0.35rem var(--ed-space-3) 0.35rem calc(var(--ed-space-3) + var(--depth, 0) * 1rem + 12px + 0.3rem);
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

	:global(.tree-item__icon) {
		flex-shrink: 0;
		color: var(--ed-text-muted);
	}

	.tree-item.active :global(.tree-item__icon) {
		color: var(--ed-accent);
	}

	.tree-item__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

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
