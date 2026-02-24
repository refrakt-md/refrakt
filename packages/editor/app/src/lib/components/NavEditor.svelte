<script lang="ts">
	import {
		extractNavContent, replaceNavContent,
		parseNavContent, serializeNavContent,
		type ParsedNav, type NavGroup,
	} from '../utils/layout-parser.js';
	import NavItemRow from './NavItemRow.svelte';

	interface Props {
		content: string;
		onchange: (content: string) => void;
	}

	let { content, onchange }: Props = $props();

	let nav: ParsedNav = $state({ groups: [], ungrouped: [] });
	let addItemGroupIdx: number | null = $state(null);
	let addItemValue = $state('');
	let addGroupValue = $state('');
	let showAddGroup = $state(false);

	// Drag state
	let dragSource: { groupIdx: number; itemIdx: number } | null = $state(null);
	let dragOverTarget: { groupIdx: number; itemIdx: number } | null = $state(null);

	// Parse content into nav structure
	$effect(() => {
		const inner = extractNavContent(content);
		if (inner !== null) {
			nav = parseNavContent(inner);
		}
	});

	function emitChange() {
		const inner = serializeNavContent(nav);
		const newContent = replaceNavContent(content, inner);
		onchange(newContent);
	}

	// ── Group operations ─────────────────────────────────────────

	function handleGroupTitleChange(idx: number, title: string) {
		nav.groups[idx] = { ...nav.groups[idx], title };
		nav = { ...nav };
		emitChange();
	}

	function handleDeleteGroup(idx: number) {
		const group = nav.groups[idx];
		if (group.items.length > 0) {
			if (!confirm(`Delete group "${group.title}" and its ${group.items.length} items?`)) return;
		}
		nav.groups.splice(idx, 1);
		nav = { ...nav };
		emitChange();
	}

	function handleAddGroup() {
		const title = addGroupValue.trim();
		if (!title) return;
		nav.groups.push({ title, items: [] });
		nav = { ...nav };
		addGroupValue = '';
		showAddGroup = false;
		emitChange();
	}

	// ── Item operations ──────────────────────────────────────────

	function handleItemChange(groupIdx: number, itemIdx: number, newSlug: string) {
		nav.groups[groupIdx].items[itemIdx] = newSlug;
		nav = { ...nav };
		emitChange();
	}

	function handleItemDelete(groupIdx: number, itemIdx: number) {
		nav.groups[groupIdx].items.splice(itemIdx, 1);
		nav = { ...nav };
		emitChange();
	}

	function handleAddItem(groupIdx: number) {
		const slug = addItemValue.trim();
		if (!slug) return;
		nav.groups[groupIdx].items.push(slug);
		nav = { ...nav };
		addItemValue = '';
		addItemGroupIdx = null;
		emitChange();
	}

	function handleAddItemKeydown(e: KeyboardEvent, groupIdx: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddItem(groupIdx);
		} else if (e.key === 'Escape') {
			addItemGroupIdx = null;
			addItemValue = '';
		}
	}

	function handleAddGroupKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddGroup();
		} else if (e.key === 'Escape') {
			showAddGroup = false;
			addGroupValue = '';
		}
	}

	// ── Drag and drop ────────────────────────────────────────────

	function handleDragStart(e: PointerEvent, groupIdx: number, itemIdx: number) {
		const el = e.currentTarget as HTMLElement;
		el.setPointerCapture(e.pointerId);
		dragSource = { groupIdx, itemIdx };
	}

	function handleDragMove(e: PointerEvent, groupIdx: number, itemIdx: number) {
		if (!dragSource) return;
		dragOverTarget = { groupIdx, itemIdx };
	}

	function handleDragEnd(e: PointerEvent) {
		if (!dragSource || !dragOverTarget) {
			dragSource = null;
			dragOverTarget = null;
			return;
		}

		const { groupIdx: srcGroup, itemIdx: srcItem } = dragSource;
		const { groupIdx: dstGroup, itemIdx: dstItem } = dragOverTarget;

		if (srcGroup === dstGroup && srcItem === dstItem) {
			dragSource = null;
			dragOverTarget = null;
			return;
		}

		// Remove from source
		const [removed] = nav.groups[srcGroup].items.splice(srcItem, 1);

		// Insert at destination (adjust index if same group and source was before dest)
		let insertIdx = dstItem;
		if (srcGroup === dstGroup && srcItem < dstItem) {
			insertIdx = dstItem - 1;
		}

		nav.groups[dstGroup].items.splice(insertIdx, 0, removed);
		nav = { ...nav };

		dragSource = null;
		dragOverTarget = null;
		emitChange();
	}
</script>

<div class="nav-editor">
	{#each nav.groups as group, groupIdx}
		<div class="nav-editor__group">
			<div class="nav-editor__group-header">
				<input
					class="nav-editor__group-title"
					type="text"
					value={group.title}
					oninput={(e) => handleGroupTitleChange(groupIdx, (e.target as HTMLInputElement).value)}
					placeholder="Group title"
				/>
				<button
					class="nav-editor__group-delete"
					onclick={() => handleDeleteGroup(groupIdx)}
					title="Delete group"
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
						<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</button>
			</div>
			<div class="nav-editor__items">
				{#each group.items as slug, itemIdx}
					<div
						class="nav-editor__item-wrapper"
						class:drag-over={dragOverTarget?.groupIdx === groupIdx && dragOverTarget?.itemIdx === itemIdx}
						onpointermove={(e) => handleDragMove(e, groupIdx, itemIdx)}
						onpointerup={handleDragEnd}
						role="listitem"
					>
						<NavItemRow
							{slug}
							onchange={(newSlug) => handleItemChange(groupIdx, itemIdx, newSlug)}
							ondelete={() => handleItemDelete(groupIdx, itemIdx)}
							ondragstart={(e) => handleDragStart(e, groupIdx, itemIdx)}
						/>
					</div>
				{/each}
			</div>
			{#if addItemGroupIdx === groupIdx}
				<div class="nav-editor__add-item">
					<input
						class="nav-editor__add-input"
						type="text"
						bind:value={addItemValue}
						onkeydown={(e) => handleAddItemKeydown(e, groupIdx)}
						onblur={() => { addItemGroupIdx = null; addItemValue = ''; }}
						placeholder="Page slug..."
						autofocus
					/>
				</div>
			{:else}
				<button
					class="nav-editor__add-item-btn"
					onclick={() => { addItemGroupIdx = groupIdx; addItemValue = ''; }}
				>
					+ Add item
				</button>
			{/if}
		</div>
	{/each}

	{#if showAddGroup}
		<div class="nav-editor__add-group">
			<input
				class="nav-editor__add-input"
				type="text"
				bind:value={addGroupValue}
				onkeydown={handleAddGroupKeydown}
				onblur={() => { showAddGroup = false; addGroupValue = ''; }}
				placeholder="Group title..."
				autofocus
			/>
		</div>
	{:else}
		<button
			class="nav-editor__add-group-btn"
			onclick={() => { showAddGroup = true; addGroupValue = ''; }}
		>
			+ Add group
		</button>
	{/if}
</div>

<style>
	.nav-editor {
		padding: 0.5rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.nav-editor__group {
		border: 1px solid #e2e8f0;
		border-radius: 5px;
		overflow: hidden;
	}

	.nav-editor__group-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	.nav-editor__group-title {
		flex: 1;
		font-size: 0.75rem;
		font-weight: 600;
		color: #1a1a2e;
		border: 1px solid transparent;
		border-radius: 3px;
		padding: 0.1rem 0.25rem;
		background: transparent;
		outline: none;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.nav-editor__group-title:focus {
		border-color: #0ea5e9;
		background: #ffffff;
		text-transform: none;
	}

	.nav-editor__group-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: none;
		background: none;
		color: #cbd5e1;
		cursor: pointer;
		border-radius: 3px;
	}

	.nav-editor__group-delete:hover {
		color: #ef4444;
		background: #fef2f2;
	}

	.nav-editor__items {
		padding: 0.25rem 0.25rem;
	}

	.nav-editor__item-wrapper.drag-over {
		border-top: 2px solid #0ea5e9;
	}

	.nav-editor__add-item {
		padding: 0.25rem 0.5rem 0.35rem;
	}

	.nav-editor__add-input {
		width: 100%;
		font-size: 0.75rem;
		padding: 0.2rem 0.35rem;
		border: 1px solid #0ea5e9;
		border-radius: 3px;
		outline: none;
		color: #1a1a2e;
		background: #ffffff;
	}

	.nav-editor__add-item-btn {
		font-size: 0.7rem;
		color: #94a3b8;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.2rem 0.5rem 0.35rem;
		text-align: left;
	}

	.nav-editor__add-item-btn:hover {
		color: #0ea5e9;
	}

	.nav-editor__add-group {
		padding: 0.25rem 0;
	}

	.nav-editor__add-group-btn {
		font-size: 0.75rem;
		color: #94a3b8;
		background: none;
		border: 1px dashed #e2e8f0;
		border-radius: 5px;
		cursor: pointer;
		padding: 0.4rem 0.75rem;
		width: 100%;
		text-align: center;
	}

	.nav-editor__add-group-btn:hover {
		color: #0ea5e9;
		border-color: #0ea5e9;
	}
</style>
