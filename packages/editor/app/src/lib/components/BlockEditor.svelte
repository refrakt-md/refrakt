<script lang="ts">
	import type { RuneInfo } from '../api/client.js';
	import type { RendererNode } from '@refrakt-md/transform';
	import type { ThemeConfig } from '@refrakt-md/transform';
	import {
		parseBlocks,
		serializeBlocks,
		buildRuneMap,
		blockLabel,
		extractRuneInner,
		rebuildRuneSource,
		type ParsedBlock,
		type RuneBlock,
	} from '../editor/block-parser.js';
	import { findSectionMapping, applySectionEdit, findActionMapping, applyActionEdit, findCommandMapping, applyCommandEdit, type SectionMapping, type ActionMapping, type CommandMapping } from '../editor/section-mapper.js';
	import { stripInlineMarkdown } from '../editor/inline-markdown.js';
	import { editorState } from '../state/editor.svelte.js';
	import BlockCard from './BlockCard.svelte';
	import type { SectionClickInfo } from './BlockCard.svelte';
	import BlockEditPanel from './BlockEditPanel.svelte';
	import FrontmatterEditPanel from './FrontmatterEditPanel.svelte';
	import InsertBlockDialog from './InsertBlockDialog.svelte';
	import InlineEditPopover from './InlineEditPopover.svelte';
	import ActionEditPopover from './ActionEditPopover.svelte';
	import CodeEditPopover from './CodeEditPopover.svelte';

	interface Props {
		bodyContent: string;
		onchange: (body: string) => void;
		runes: RuneInfo[];
		themeConfig: ThemeConfig | null;
		themeCss: string;
		highlightCss?: string;
		highlightTransform?: ((tree: RendererNode) => RendererNode) | null;
		showInsertMenu?: boolean;
		frontmatter?: Record<string, unknown>;
		readOnly?: boolean;
		communityTags?: Record<string, unknown> | null;
		communityPostTransforms?: Record<string, Function> | null;
		communityStyles?: Record<string, Record<string, unknown>> | null;
		aggregated?: Record<string, unknown>;
	}

	let {
		bodyContent,
		onchange,
		runes,
		themeConfig,
		themeCss,
		highlightCss = '',
		highlightTransform = null,
		showInsertMenu: showInsertMenuProp = true,
		frontmatter = {},
		readOnly = false,
		communityTags = null,
		communityPostTransforms = null,
		communityStyles = null,
		aggregated = {},
	}: Props = $props();

	let blocks: ParsedBlock[] = $state([]);
	let runeMap = $derived(buildRuneMap(runes));

	// Track the source we last parsed from, to avoid re-parsing our own updates
	let lastParsedSource = '';

	/** Match new blocks to old blocks and reuse IDs for edited-in-place blocks */
	function reconcileIds(prev: ParsedBlock[], next: ParsedBlock[]): void {
		if (prev.length === 0) return;

		const prevIdSet = new Set(prev.map(b => b.id));
		const nextIdSet = new Set(next.map(b => b.id));

		// Old blocks whose content changed (ID no longer present in next)
		const lost = prev.filter(b => !nextIdSet.has(b.id));
		// New blocks with no matching old ID
		const gained = next.filter(b => !prevIdSet.has(b.id));

		if (lost.length === 0 || gained.length === 0) return;

		// Match each gained block to the closest lost block by position + type
		const available = [...lost];
		for (const nb of gained) {
			let best = -1;
			let bestScore = Infinity;
			for (let j = 0; j < available.length; j++) {
				const ob = available[j];
				const typeBonus = ob.type === nb.type ? 0 : 1000;
				const score = Math.abs(ob.startLine - nb.startLine) + typeBonus;
				if (score < bestScore) {
					bestScore = score;
					best = j;
				}
			}
			if (best >= 0) {
				nb.id = available[best].id;
				available.splice(best, 1);
			}
		}
	}

	// Parse blocks when body content changes (from outside, e.g. file switch)
	$effect(() => {
		const body = bodyContent;
		if (body !== lastParsedSource) {
			const newBlocks = parseBlocks(body);
			reconcileIds(blocks, newBlocks);
			blocks = newBlocks;
			lastParsedSource = body;
			// Close edit panel and inline popover when switching files
			activeIndex = null;
			editingFrontmatter = false;
			anchorPoint = null;
			inlineEdit = null;
		}
	});

	/** Sync blocks back to source text */
	function syncToSource() {
		const newSource = serializeBlocks(blocks);
		lastParsedSource = newSource;
		onchange(newSource);
	}

	// ── Frontmatter summary for visual mode header ──────────────

	let editingFrontmatter = $state(false);
	let fmTitle = $derived((frontmatter.title as string) || '');
	let fmDesc = $derived(() => {
		const desc = (frontmatter.description as string) || '';
		return desc.length > 80 ? desc.slice(0, 80) + '...' : desc;
	});

	// ── Active block (rail selection) ────────────────────────────

	let activeIndex: number | null = $state(null);
	let hoveredIndex: number | null = $state(null);
	let anchorPoint: { x: number; y: number } | null = $state(null);
	let pendingRuneIndex: number | null = $state(null);
	let editSessionId: number = $state(0);

	// ── Popover positioning ─────────────────────────────────────

	const POPOVER_WIDTH = 420;
	const POPOVER_GAP = 12;

	let popoverStyle = $derived.by(() => {
		if (!anchorPoint) return '';

		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Prefer placing to the right of the click point
		let left = anchorPoint.x + POPOVER_GAP;
		if (left + POPOVER_WIDTH > vw - 16) {
			left = anchorPoint.x - POPOVER_WIDTH - POPOVER_GAP;
		}
		if (left < 16) {
			left = vw - POPOVER_WIDTH - 16;
		}

		// Vertical: start at click Y, clamped to viewport
		let top = anchorPoint.y;
		const maxH = vh - 120;
		const maxTop = vh - Math.min(600, maxH) - 16;
		if (top > maxTop) top = maxTop;
		if (top < 60) top = 60;

		return `left: ${left}px; top: ${top}px; max-height: min(600px, ${maxH}px);`;
	});

	function toggleBlock(index: number, x: number, y: number) {
		editingFrontmatter = false;
		if (activeIndex === index) {
			activeIndex = null;
			anchorPoint = null;
			pendingRuneIndex = null;
		} else {
			editSessionId++;
			activeIndex = index;
			anchorPoint = { x, y };
			pendingRuneIndex = null;
		}
	}

	function handleRuneClick(index: number, x: number, y: number, nestedRuneIndex?: number) {
		editingFrontmatter = false;
		editSessionId++;
		activeIndex = index;
		anchorPoint = { x, y };
		pendingRuneIndex = nestedRuneIndex ?? null;
	}

	function toggleFrontmatter(e: MouseEvent) {
		activeIndex = null;
		if (editingFrontmatter) {
			editingFrontmatter = false;
			anchorPoint = null;
		} else {
			editingFrontmatter = true;
			anchorPoint = { x: e.clientX, y: e.clientY };
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (readOnly) return;
		if (e.key === 'Escape') {
			if (activeIndex !== null || editingFrontmatter) {
				activeIndex = null;
				editingFrontmatter = false;
				anchorPoint = null;
				pendingRuneIndex = null;
			}
		}
	}

	function handleListScroll() {
		if (activeIndex !== null || editingFrontmatter) {
			activeIndex = null;
			editingFrontmatter = false;
			anchorPoint = null;
			pendingRuneIndex = null;
		}
	}

	function handleResize() {
		if (anchorPoint) anchorPoint = { ...anchorPoint };
	}

	// ── Block operations ─────────────────────────────────────────

	function handleUpdateBlock(index: number, updated: ParsedBlock) {
		blocks = blocks.map((b, i) => (i === index ? updated : b));
		syncToSource();
	}

	function handleRemoveBlock(index: number) {
		// Adjust activeIndex
		if (activeIndex !== null) {
			if (activeIndex === index) {
				activeIndex = null;
			} else if (activeIndex > index) {
				activeIndex--;
			}
		}
		blocks = blocks.filter((_, i) => i !== index);
		syncToSource();
	}

	// ── Drag and drop ────────────────────────────────────────────

	let dragIndex: number | null = $state(null);
	let dropIndex: number | null = $state(null);

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		activeIndex = null;
		editingFrontmatter = false;
		anchorPoint = null;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dropIndex = index;
	}

	function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (dragIndex !== null && dragIndex !== index) {
			const moved = blocks[dragIndex];
			const next = blocks.filter((_, i) => i !== dragIndex);
			next.splice(index, 0, moved);
			blocks = next;

			// Update activeIndex to follow the active block
			if (activeIndex !== null) {
				if (activeIndex === dragIndex) {
					activeIndex = index > dragIndex ? index - 1 : index;
				} else {
					// Adjust if the move shifts the active block's position
					let newActive = activeIndex;
					if (dragIndex < activeIndex && index >= activeIndex) {
						newActive--;
					} else if (dragIndex > activeIndex && index <= activeIndex) {
						newActive++;
					}
					activeIndex = newActive;
				}
			}

			syncToSource();
		}
		dragIndex = null;
		dropIndex = null;
	}

	// ── Insert block menu ────────────────────────────────────────

	let showInsertMenu = $state(false);
	let insertAtIndex: number | null = $state(null);

	function openInsertAt(index: number) {
		insertAtIndex = index;
		showInsertMenu = true;
	}

	function closeInsertMenu() {
		showInsertMenu = false;
		insertAtIndex = null;
	}

	function insertBlock(type: 'heading' | 'paragraph' | 'fence' | 'hr' | 'rune', runeName?: string) {
		let newBlock: ParsedBlock;
		const id = `blk_new_${Date.now()}`;

		switch (type) {
			case 'heading':
				newBlock = {
					id,
					type: 'heading',
					source: '## New heading',
					startLine: 0,
					endLine: 0,
					level: 2,
					text: 'New heading',
				};
				break;
			case 'paragraph':
				newBlock = {
					id,
					type: 'paragraph',
					source: 'New paragraph text.',
					startLine: 0,
					endLine: 0,
				};
				break;
			case 'fence':
				newBlock = {
					id,
					type: 'fence',
					source: '```\n\n```',
					startLine: 0,
					endLine: 0,
					language: '',
					code: '',
				};
				break;
			case 'hr':
				newBlock = {
					id,
					type: 'hr',
					source: '---',
					startLine: 0,
					endLine: 0,
				};
				break;
			case 'rune': {
				const name = runeName ?? 'hint';
				const info = runeMap.get(name);
				const selfClosing = info?.selfClosing ?? false;
				// Pre-fill required attributes
				const attrs: Record<string, string> = {};
				if (info) {
					for (const [attrName, attrInfo] of Object.entries(info.attributes)) {
						if (attrInfo.required) {
							attrs[attrName] = attrInfo.values?.[0] ?? '';
						}
					}
				}
				const attrStr = Object.entries(attrs)
					.map(([k, v]) => `${k}="${v}"`)
					.join(' ');
				const attrPart = attrStr ? ' ' + attrStr : '';
				if (selfClosing) {
					newBlock = {
						id,
						type: 'rune',
						source: `{% ${name}${attrPart} /%}`,
						startLine: 0,
						endLine: 0,
						runeName: name,
						selfClosing: true,
						attributes: attrs,
						innerContent: '',
					};
				} else {
					const inner = info?.example ? extractRuneInner(info.example, name) : '';
					newBlock = {
						id,
						type: 'rune',
						source: `{% ${name}${attrPart} %}\n${inner}\n{% /${name} %}`,
						startLine: 0,
						endLine: 0,
						runeName: name,
						selfClosing: false,
						attributes: attrs,
						innerContent: inner,
					};
				}
				break;
			}
		}

		const pos = insertAtIndex ?? blocks.length;
		blocks = [...blocks.slice(0, pos), newBlock, ...blocks.slice(pos)];
		insertAtIndex = null;
		showInsertMenu = false;
		editingFrontmatter = false;
		activeIndex = pos;
		syncToSource();
	}

	// ── Inline section editing ──────────────────────────────────

	let inlineEdit: {
		blockIndex: number;
		dataName: string;
		inlineSource: string;
		rect: DOMRect;
		mapping: SectionMapping;
	} | null = $state(null);

	function handleSectionClick(index: number, info: SectionClickInfo) {
		const block = blocks[index];
		if (block.type !== 'rune') return;
		const rb = block as RuneBlock;

		if (info.editType === 'link') {
			const mapping = findActionMapping(rb.innerContent, info.text, info.href ?? '');
			if (!mapping) return;

			actionEdit = {
				blockIndex: index,
				rect: info.rect,
				mapping,
			};
			return;
		}

		if (info.editType === 'code') {
			const mapping = findCommandMapping(rb.innerContent, info.text);
			if (!mapping) return;

			commandEdit = {
				blockIndex: index,
				rect: info.rect,
				mapping,
			};
			return;
		}

		// Default: inline text editing
		const mapping = findSectionMapping(rb.innerContent, info.dataName, info.text);
		if (!mapping) return;

		inlineEdit = {
			blockIndex: index,
			dataName: info.dataName,
			inlineSource: mapping.inlineSource,
			rect: info.rect,
			mapping,
		};
	}

	function handleInlineEditChange(newInlineSource: string) {
		if (!inlineEdit) return;
		const block = blocks[inlineEdit.blockIndex];
		if (block.type !== 'rune') return;
		const rb = block as RuneBlock;

		const newInner = applySectionEdit(rb.innerContent, inlineEdit.mapping, newInlineSource);
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);

		// Update the mapping to reflect the new source so subsequent edits work
		inlineEdit = {
			...inlineEdit,
			inlineSource: newInlineSource,
			mapping: {
				...inlineEdit.mapping,
				text: stripInlineMarkdown(newInlineSource),
				source: inlineEdit.mapping.sourcePrefix + newInlineSource,
				inlineSource: newInlineSource,
			},
		};

		handleUpdateBlock(inlineEdit.blockIndex, updated);
	}

	function closeInlineEdit() {
		inlineEdit = null;
	}

	// ── Action item editing ────────────────────────────────────

	let actionEdit: {
		blockIndex: number;
		rect: DOMRect;
		mapping: ActionMapping;
	} | null = $state(null);

	function handleActionEditChange(newText: string, newHref: string) {
		if (!actionEdit) return;
		const block = blocks[actionEdit.blockIndex];
		if (block.type !== 'rune') return;
		const rb = block as RuneBlock;

		const newInner = applyActionEdit(rb.innerContent, actionEdit.mapping, newText, newHref);
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);

		handleUpdateBlock(actionEdit.blockIndex, updated);
	}

	function handleActionRemove() {
		if (!actionEdit) return;
		const blockIndex = actionEdit.blockIndex;
		const block = blocks[blockIndex];
		if (block.type !== 'rune') return;
		const rb = block as RuneBlock;

		// Remove the entire list item line from the inner content
		const newInner = rb.innerContent.replace(actionEdit.mapping.source + '\n', '').replace(actionEdit.mapping.source, '');
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);

		actionEdit = null;
		handleUpdateBlock(blockIndex, updated);
	}

	function closeActionEdit() {
		actionEdit = null;
	}

	// ── Command (code block) editing ──────────────────────────

	let commandEdit: {
		blockIndex: number;
		rect: DOMRect;
		mapping: CommandMapping;
	} | null = $state(null);

	function handleCommandEditChange(newCode: string) {
		if (!commandEdit) return;
		const block = blocks[commandEdit.blockIndex];
		if (block.type !== 'rune') return;
		const rb = block as RuneBlock;

		const newInner = applyCommandEdit(rb.innerContent, commandEdit.mapping, newCode);
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);

		handleUpdateBlock(commandEdit.blockIndex, updated);
	}

	function handleCommandRemove() {
		if (!commandEdit) return;
		const blockIndex = commandEdit.blockIndex;
		const block = blocks[blockIndex];
		if (block.type !== 'rune') return;
		const rb = block as RuneBlock;

		// Remove the entire fenced code block from the inner content
		const newInner = rb.innerContent.replace(commandEdit.mapping.source + '\n', '').replace(commandEdit.mapping.source, '');
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);

		commandEdit = null;
		handleUpdateBlock(blockIndex, updated);
	}

	function closeCommandEdit() {
		commandEdit = null;
	}

	// Group runes by category for the insert menu
	let runesByCategory = $derived.by(() => {
		const map = new Map<string, RuneInfo[]>();
		for (const r of runes) {
			const list = map.get(r.category) ?? [];
			list.push(r);
			map.set(r.category, list);
		}
		return map;
	});
</script>

<svelte:window onkeydown={handleKeydown} onresize={handleResize} />

<div class="block-editor">
	{#if blocks.length === 0 && !readOnly}
		<div class="block-editor__empty">
			<svg class="block-editor__empty-icon" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="6" y="8" width="36" height="32" rx="3" />
				<line x1="14" y1="18" x2="34" y2="18" />
				<line x1="14" y1="24" x2="28" y2="24" />
				<line x1="14" y1="30" x2="22" y2="30" />
			</svg>
			<span class="block-editor__empty-text">No content blocks yet</span>
			<span class="block-editor__empty-hint">Use the + button to add your first block</span>
		</div>
	{/if}

	<div class="block-editor__stage">
		<!-- Scrollable block list -->
		<div class="block-editor__scroll">
			<div class="block-editor__list-wrap" onscroll={handleListScroll}>
				<!-- Frontmatter summary header (blocks mode only) -->
				{#if !readOnly}
					<div class="block-editor__fm-header">
						<div class="block-editor__fm-info">
							<span class="block-editor__fm-title">{fmTitle || 'Untitled'}</span>
							{#if fmDesc()}
								<span class="block-editor__fm-desc">{fmDesc()}</span>
							{/if}
						</div>
						<button
							class="block-editor__fm-edit"
							class:active={editingFrontmatter}
							onclick={(e) => toggleFrontmatter(e)}
							title="Edit frontmatter"
						>
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
							</svg>
							Edit
						</button>
					</div>
				{/if}

				{#each blocks as block, i (block.id)}
					<div
						class="block-editor__row"
						class:hovered={!readOnly && hoveredIndex === i}
						class:active={!readOnly && activeIndex === i}
						class:drag-source={!readOnly && dragIndex === i}
						class:drag-over={!readOnly && dropIndex === i && dragIndex !== i}
						onmouseenter={() => { if (!readOnly) hoveredIndex = i; }}
						onmouseleave={() => { if (!readOnly && hoveredIndex === i) hoveredIndex = null; }}
					>
						<div class="block-editor__block-cell">
							<BlockCard
								{block}
								{themeConfig}
								{themeCss}
								{highlightCss}
								{highlightTransform}
								{communityTags}
								{communityPostTransforms}
								{communityStyles}
								{aggregated}
								{readOnly}
								onsectionclick={readOnly ? undefined : (info) => handleSectionClick(i, info)}
								onruneclick={readOnly ? undefined : (info) => handleRuneClick(i, info.x, info.y, info.nestedRuneIndex)}
								ondragstart={readOnly ? undefined : (e) => handleDragStart(e, i)}
								ondragover={readOnly ? undefined : (e) => handleDragOver(e, i)}
								ondrop={readOnly ? undefined : (e) => handleDrop(e, i)}
							/>
						</div>
						{#if !readOnly && showInsertMenuProp}
							<!-- Insert markers — top and bottom edges -->
							<button
								class="block-editor__insert-marker block-editor__insert-marker--top"
								onclick={() => openInsertAt(i)}
								title="Insert block above"
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
									<line x1="5" y1="2" x2="5" y2="8" />
									<line x1="2" y1="5" x2="8" y2="5" />
								</svg>
							</button>
							<button
								class="block-editor__insert-marker block-editor__insert-marker--bottom"
								onclick={() => openInsertAt(i + 1)}
								title="Insert block below"
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
									<line x1="5" y1="2" x2="5" y2="8" />
									<line x1="2" y1="5" x2="8" y2="5" />
								</svg>
							</button>
						{/if}
						{#if !readOnly}
							<!-- Block label — slides in from right on hover, pinned when active -->
							<button
								class="block-editor__hover-label"
								onclick={(e) => toggleBlock(i, e.clientX, e.clientY)}
								aria-pressed={activeIndex === i}
							>
								{blockLabel(block)}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>

	</div>

	<!-- Popover edit panel — anchored to click position -->
	{#if !readOnly && (activeIndex !== null || editingFrontmatter)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="block-editor__popover-backdrop"
			onmousedown={() => { activeIndex = null; editingFrontmatter = false; anchorPoint = null; pendingRuneIndex = null; }}
		></div>
		<div class="block-editor__popover" style={popoverStyle}>
			{#if editingFrontmatter}
				<FrontmatterEditPanel
					onclose={() => { editingFrontmatter = false; anchorPoint = null; }}
				/>
			{:else if activeIndex !== null && blocks[activeIndex]}
				{#key editSessionId}
					<BlockEditPanel
						block={blocks[activeIndex]}
						{runeMap}
						runes={() => runes}
						{aggregated}
						initialRuneIndex={pendingRuneIndex}
						onupdate={(updated) => handleUpdateBlock(activeIndex!, updated)}
						onremove={() => { const idx = activeIndex!; activeIndex = null; anchorPoint = null; pendingRuneIndex = null; handleRemoveBlock(idx); }}
						onclose={() => { activeIndex = null; anchorPoint = null; pendingRuneIndex = null; }}
					/>
				{/key}
			{/if}
		</div>
	{/if}

	{#if showInsertMenu}
		<InsertBlockDialog
			{runes}
			{runesByCategory}
			oninsert={insertBlock}
			onclose={closeInsertMenu}
		/>
	{/if}

	{#if inlineEdit}
		<InlineEditPopover
			anchorRect={inlineEdit.rect}
			dataName={inlineEdit.dataName}
			inlineSource={inlineEdit.inlineSource}
			onchange={handleInlineEditChange}
			onclose={closeInlineEdit}
		/>
	{/if}

	{#if actionEdit}
		<ActionEditPopover
			anchorRect={actionEdit.rect}
			text={actionEdit.mapping.text}
			href={actionEdit.mapping.href}
			onchange={handleActionEditChange}
			onremove={handleActionRemove}
			onclose={closeActionEdit}
		/>
	{/if}

	{#if commandEdit}
		<CodeEditPopover
			anchorRect={commandEdit.rect}
			code={commandEdit.mapping.code}
			language={commandEdit.mapping.language}
			onchange={handleCommandEditChange}
			onremove={handleCommandRemove}
			onclose={closeCommandEdit}
		/>
	{/if}
</div>


<style>
	.block-editor {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* Stage: flex container for scroll area + edit panel */
	.block-editor__stage {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	/* Scrollable block list */
	.block-editor__scroll {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.block-editor__list-wrap {
		width: 100%;
		padding: 0;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	/* Frontmatter summary header */
	.block-editor__fm-header {
		display: flex;
		align-items: center;
		gap: var(--ed-space-3);
		padding: var(--ed-space-5) var(--ed-space-5);
		margin-bottom: var(--ed-space-2);
	}

	.block-editor__fm-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.block-editor__fm-title {
		font-size: var(--ed-text-md);
		font-weight: 600;
		color: var(--ed-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.block-editor__fm-desc {
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.block-editor__fm-edit {
		display: flex;
		align-items: center;
		gap: var(--ed-space-1);
		padding: var(--ed-space-1) var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
		font-size: var(--ed-text-xs);
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: color var(--ed-transition-fast), border-color var(--ed-transition-fast), background var(--ed-transition-fast);
		flex-shrink: 0;
	}

	.block-editor__fm-edit:hover {
		color: var(--ed-text-secondary);
		border-color: var(--ed-border-strong);
	}

	.block-editor__fm-edit.active {
		background: var(--ed-accent-muted);
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	/* Block row */
	.block-editor__row {
		position: relative;
		transition: transform var(--ed-transition-fast), opacity var(--ed-transition-fast);
	}

	.block-editor__block-cell {
		min-width: 0;
	}

	.block-editor__row.drag-source {
		opacity: 0.6;
		transform: rotate(0.5deg);
	}

	.block-editor__row.drag-over {
		box-shadow: 0 -3px 10px var(--ed-accent-ring);
		border-top: 2px solid var(--ed-accent);
		padding-top: 2px;
	}

	/* ── Hover controls (insert markers + label) ─────────────── */

	/* Shared base for insert markers and label */
	.block-editor__insert-marker,
	.block-editor__hover-label {
		position: absolute;
		right: 20px;
		z-index: 2;
		border: none;
		cursor: pointer;
		border-radius: 9999px;
		background: var(--ed-surface-2);
		color: var(--ed-text-muted);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		opacity: 0;
		pointer-events: none;
		transition: opacity 100ms ease-out, transform 100ms ease-out, background 100ms ease-out, color 100ms ease-out;
	}

	/* Insert markers — top/bottom edges */
	.block-editor__insert-marker {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		color: var(--ed-text-tertiary);
	}

	.block-editor__insert-marker--top {
		top: -11px;
	}

	.block-editor__insert-marker--bottom {
		bottom: -11px;
	}

	/* Label — right side, vertically centered */
	.block-editor__hover-label {
		top: 50%;
		transform: translateX(6px) translateY(-50%);
		padding: 4px 10px;
		white-space: nowrap;
		line-height: 1.3;
	}

	/* Show controls on hover */
	.block-editor__row.hovered .block-editor__insert-marker,
	.block-editor__row.hovered .block-editor__hover-label {
		opacity: 1;
		pointer-events: auto;
	}

	.block-editor__row.hovered .block-editor__hover-label {
		transform: translateX(0) translateY(-50%);
	}

	/* Pinned label when edit panel is open */
	.block-editor__row.active .block-editor__hover-label {
		opacity: 1;
		pointer-events: auto;
		transform: translateX(0) translateY(-50%);
		background: var(--ed-accent-muted);
		color: var(--ed-accent);
		font-weight: 700;
	}

	/* Insert marker hover */
	.block-editor__insert-marker:hover {
		background: var(--ed-accent);
		color: white;
	}

	/* Label hover */
	.block-editor__hover-label:hover {
		color: var(--ed-text-secondary);
		background: var(--ed-surface-3, var(--ed-border-default));
	}

	.block-editor__row.active .block-editor__hover-label:hover {
		background: var(--ed-accent);
		color: white;
	}

	/* Popover backdrop — transparent click target */
	.block-editor__popover-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9;
	}

	/* Popover container — anchored to block card */
	.block-editor__popover {
		position: fixed;
		width: 420px;
		overflow-y: auto;
		background: var(--ed-surface-0);
		border-radius: var(--ed-radius-lg);
		border: 1px solid var(--ed-border-default);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
					0 8px 10px -6px rgba(0, 0, 0, 0.1);
		z-index: 10;
		animation: popover-enter 0.15s ease-out;
	}

	@keyframes popover-enter {
		from {
			opacity: 0;
			transform: translateY(4px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Empty state */
	.block-editor__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		gap: var(--ed-space-2);
	}

	.block-editor__empty-icon {
		color: var(--ed-border-strong);
		margin-bottom: var(--ed-space-1);
	}

	.block-editor__empty-text {
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-md);
		font-weight: 500;
	}

	.block-editor__empty-hint {
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
	}

</style>
