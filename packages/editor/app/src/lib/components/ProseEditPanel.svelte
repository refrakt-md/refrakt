<script lang="ts">
	import type { RuneInfo } from '../api/client.js';
	import type {
		ProseBlock,
		ParsedBlock,
		HeadingBlock,
		FenceBlock,
		ListBlock,
	} from '../editor/block-parser.js';
	import {
		blockLabel,
		parseBlocks,
		serializeBlocks,
	} from '../editor/block-parser.js';
	import InlineEditor from './InlineEditor.svelte';

	interface Props {
		block: ProseBlock;
		runes: () => RuneInfo[];
		aggregated?: Record<string, unknown>;
		onupdate: (block: ProseBlock) => void;
		onremove: () => void;
		onclose: () => void;
	}

	let { block, runes, aggregated = {}, onupdate, onremove, onclose }: Props = $props();

	type TabId = 'structure' | 'content';
	let activeTab: TabId = $state('structure');

	// ── Structure tab: child list ────────────────────────────────

	/** Short preview text for a child block */
	function childPreview(child: ParsedBlock): string {
		switch (child.type) {
			case 'heading':
				return (child as HeadingBlock).text;
			case 'paragraph':
				return child.source.length > 60 ? child.source.slice(0, 60) + '...' : child.source;
			case 'fence': {
				const fb = child as FenceBlock;
				const lang = fb.language ? `${fb.language}: ` : '';
				const code = fb.code.split('\n')[0] ?? '';
				return lang + (code.length > 50 ? code.slice(0, 50) + '...' : code);
			}
			case 'list':
				return child.source.split('\n')[0] ?? '';
			case 'quote':
				return child.source.replace(/^>\s*/gm, '').split('\n')[0] ?? '';
			case 'hr':
				return '---';
			case 'image':
				return child.source;
			default:
				return child.source.split('\n')[0] ?? '';
		}
	}

	/** Icon SVG for a child block type */
	function childIcon(child: ParsedBlock): string {
		switch (child.type) {
			case 'heading':
				return '<path d="M3 3v10M13 3v10M3 8h10" />';
			case 'paragraph':
				return '<path d="M2 4h12M2 8h12M2 12h8" />';
			case 'fence':
				return '<polyline points="4 6 1 9 4 12" /><polyline points="12 6 15 9 12 12" />';
			case 'list':
				return '<circle cx="3" cy="4" r="1" fill="currentColor" /><line x1="6" y1="4" x2="14" y2="4" /><circle cx="3" cy="8" r="1" fill="currentColor" /><line x1="6" y1="8" x2="14" y2="8" /><circle cx="3" cy="12" r="1" fill="currentColor" /><line x1="6" y1="12" x2="14" y2="12" />';
			case 'quote':
				return '<path d="M3 5h10M5 5v8M5 9h6" />';
			case 'hr':
				return '<line x1="2" y1="8" x2="14" y2="8" />';
			case 'image':
				return '<rect x="2" y="2" width="12" height="12" rx="1" /><circle cx="5.5" cy="5.5" r="1.5" /><path d="M14 10l-3-3-5 5" />';
			default:
				return '<path d="M2 4h12M2 8h12M2 12h8" />';
		}
	}

	// ── Drag reorder ─────────────────────────────────────────────

	let dragIdx: number | null = $state(null);
	let dropIdx: number | null = $state(null);

	function handleDragStart(e: DragEvent, idx: number) {
		dragIdx = idx;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(idx));
		}
	}

	function handleDragOver(e: DragEvent, idx: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropIdx = idx;
	}

	function handleDrop(e: DragEvent, idx: number) {
		e.preventDefault();
		if (dragIdx !== null && dragIdx !== idx) {
			reorderChild(dragIdx, idx);
		}
		dragIdx = null;
		dropIdx = null;
	}

	function handleDragEnd() {
		dragIdx = null;
		dropIdx = null;
	}

	function reorderChild(from: number, to: number) {
		const children = [...block.children];
		const [moved] = children.splice(from, 1);
		children.splice(to, 0, moved);
		const newSource = serializeBlocks(children);
		onupdate({ ...block, children, source: newSource });
	}

	function removeChild(idx: number) {
		const children = block.children.filter((_, i) => i !== idx);
		if (children.length === 0) {
			onremove();
			return;
		}
		const newSource = serializeBlocks(children);
		onupdate({ ...block, children, source: newSource });
	}

	// ── Content tab ──────────────────────────────────────────────

	function handleContentChange(content: string) {
		if (!content.trim()) {
			onremove();
			return;
		}
		const newChildren = parseBlocks(content);
		onupdate({ ...block, children: newChildren, source: content });
	}
</script>

<div class="edit-panel">
	<div class="edit-panel__top">
		<div class="edit-panel__header">
			<span class="edit-panel__type">prose</span>
			<span class="edit-panel__count">{block.children.length} block{block.children.length !== 1 ? 's' : ''}</span>
			<div class="edit-panel__spacer"></div>
			<button
				class="edit-panel__btn edit-panel__btn--danger"
				onclick={onremove}
				title="Remove block"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3 6 3 14 13 14 13 6" />
					<line x1="1" y1="4" x2="15" y2="4" />
					<line x1="6" y1="2" x2="10" y2="2" />
					<line x1="6" y1="8" x2="6" y2="12" />
					<line x1="10" y1="8" x2="10" y2="12" />
				</svg>
			</button>
			<button
				class="edit-panel__btn"
				onclick={onclose}
				title="Close panel"
			>&times;</button>
		</div>

		<div class="edit-panel__tabs">
			<button
				type="button"
				class="edit-panel__tab"
				class:active={activeTab === 'structure'}
				onclick={() => activeTab = 'structure'}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M2 3h4M2 7h4M6 11h4M6 15h4M4 3v8M8 11v4" />
				</svg>
				Structure
			</button>
			<button
				type="button"
				class="edit-panel__tab"
				class:active={activeTab === 'content'}
				onclick={() => activeTab = 'content'}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M2 4h12M2 8h12M2 12h8" />
				</svg>
				Content
			</button>
		</div>
	</div>

	{#if activeTab === 'structure'}
		<div class="edit-panel__tab-panel">
			<div class="structure-list">
				{#each block.children as child, i (child.id)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="structure-item"
						class:drag-source={dragIdx === i}
						class:drag-over={dropIdx === i && dragIdx !== i}
						draggable="true"
						ondragstart={(e) => handleDragStart(e, i)}
						ondragover={(e) => handleDragOver(e, i)}
						ondrop={(e) => handleDrop(e, i)}
						ondragend={handleDragEnd}
					>
						<span class="structure-item__drag" title="Drag to reorder">
							<svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
								<circle cx="2" cy="2" r="1" />
								<circle cx="6" cy="2" r="1" />
								<circle cx="2" cy="6" r="1" />
								<circle cx="6" cy="6" r="1" />
								<circle cx="2" cy="10" r="1" />
								<circle cx="6" cy="10" r="1" />
							</svg>
						</span>
						<span class="structure-item__icon">
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								{@html childIcon(child)}
							</svg>
						</span>
						<span class="structure-item__info">
							<span class="structure-item__type">{blockLabel(child)}</span>
							<span class="structure-item__preview">{childPreview(child)}</span>
						</span>
						<button
							class="structure-item__remove"
							onclick={() => removeChild(i)}
							title="Remove"
						>
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<line x1="4" y1="4" x2="12" y2="12" />
								<line x1="12" y1="4" x2="4" y2="12" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if activeTab === 'content'}
		<div class="edit-panel__tab-panel">
			<div class="edit-panel__content-editor">
				<InlineEditor
					content={block.source}
					onchange={handleContentChange}
					{runes}
					aggregated={() => aggregated}
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	.edit-panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.edit-panel__top {
		flex-shrink: 0;
		background: var(--ed-surface-0);
		border-bottom: 1px solid var(--ed-border-default);
	}

	.edit-panel__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--ed-space-4) var(--ed-space-5);
	}

	.edit-panel__type {
		font-size: 12px;
		font-weight: 700;
		color: var(--ed-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.edit-panel__count {
		font-size: 11px;
		color: var(--ed-text-muted);
	}

	.edit-panel__spacer {
		flex: 1;
	}

	.edit-panel__btn {
		background: none;
		border: none;
		color: var(--ed-text-muted);
		cursor: pointer;
		padding: 0.25rem;
		font-size: 18px;
		line-height: 1;
		border-radius: var(--ed-radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--ed-transition-fast), background var(--ed-transition-fast);
	}

	.edit-panel__btn:hover {
		color: var(--ed-text-secondary);
		background: var(--ed-surface-2);
	}

	.edit-panel__btn--danger:hover {
		color: var(--ed-danger);
		background: var(--ed-danger-subtle);
	}

	/* Tab strip */
	.edit-panel__tabs {
		display: flex;
		gap: 2px;
		background: var(--ed-surface-2);
		border-radius: var(--ed-radius-sm);
		padding: 2px;
		margin: 0 var(--ed-space-4) var(--ed-space-3);
	}

	.edit-panel__tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.35rem 0.5rem;
		border: none;
		background: transparent;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		border-radius: calc(var(--ed-radius-sm) - 1px);
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.edit-panel__tab:hover {
		color: var(--ed-text-secondary);
	}

	.edit-panel__tab.active {
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	/* Tab panels */
	.edit-panel__tab-panel {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.edit-panel__content-editor {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow: hidden;
	}

	/* ── Structure list ───────────────────────────────────────── */

	.structure-list {
		display: flex;
		flex-direction: column;
		padding: var(--ed-space-3);
		gap: 2px;
	}

	.structure-item {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2);
		padding: var(--ed-space-2) var(--ed-space-3);
		border-radius: var(--ed-radius-sm);
		transition: background var(--ed-transition-fast), opacity var(--ed-transition-fast);
		cursor: grab;
	}

	.structure-item:hover {
		background: var(--ed-surface-2);
	}

	.structure-item.drag-source {
		opacity: 0.4;
	}

	.structure-item.drag-over {
		box-shadow: inset 0 -2px 0 var(--ed-accent);
	}

	.structure-item__drag {
		color: var(--ed-text-muted);
		opacity: 0.4;
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.structure-item:hover .structure-item__drag {
		opacity: 0.7;
	}

	.structure-item__icon {
		color: var(--ed-text-tertiary);
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.structure-item__info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.structure-item__type {
		font-size: 11px;
		font-weight: 600;
		color: var(--ed-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.structure-item__preview {
		font-size: 12px;
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.structure-item__remove {
		background: none;
		border: none;
		color: var(--ed-text-muted);
		cursor: pointer;
		padding: 0.2rem;
		border-radius: var(--ed-radius-sm);
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity var(--ed-transition-fast), color var(--ed-transition-fast), background var(--ed-transition-fast);
	}

	.structure-item:hover .structure-item__remove {
		opacity: 1;
	}

	.structure-item__remove:hover {
		color: var(--ed-danger);
		background: var(--ed-danger-subtle);
	}
</style>
