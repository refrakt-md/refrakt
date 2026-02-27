<script lang="ts">
	import type { RuneInfo } from '../api/client.js';
	import type { RendererNode } from '@refrakt-md/transform';
	import type { ThemeConfig } from '@refrakt-md/transform';
	import {
		parseBlocks,
		serializeBlocks,
		buildRuneMap,
		blockLabel,
		type ParsedBlock,
	} from '../editor/block-parser.js';
	import BlockCard from './BlockCard.svelte';
	import BlockEditPanel from './BlockEditPanel.svelte';
	import FrontmatterEditPanel from './FrontmatterEditPanel.svelte';

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
	}: Props = $props();

	let blocks: ParsedBlock[] = $state([]);
	let runeMap = $derived(buildRuneMap(runes));

	// Track the source we last parsed from, to avoid re-parsing our own updates
	let lastParsedSource = '';

	// Parse blocks when body content changes (from outside, e.g. file switch)
	$effect(() => {
		const body = bodyContent;
		if (body !== lastParsedSource) {
			blocks = parseBlocks(body);
			lastParsedSource = body;
			// Close edit panel when switching files
			activeIndex = null;
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

	function toggleBlock(index: number) {
		editingFrontmatter = false;
		activeIndex = activeIndex === index ? null : index;
	}

	function toggleFrontmatter() {
		activeIndex = null;
		editingFrontmatter = !editingFrontmatter;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && (activeIndex !== null || editingFrontmatter)) {
			activeIndex = null;
			editingFrontmatter = false;
		}
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
					newBlock = {
						id,
						type: 'rune',
						source: `{% ${name}${attrPart} %}\n\n{% /${name} %}`,
						startLine: 0,
						endLine: 0,
						runeName: name,
						selfClosing: false,
						attributes: attrs,
						innerContent: '',
					};
				}
				break;
			}
		}

		blocks = [...blocks, newBlock];
		showInsertMenu = false;
		syncToSource();
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

<svelte:window onkeydown={handleKeydown} />

<div class="block-editor">
	{#if blocks.length === 0}
		<div class="block-editor__empty">
			<svg class="block-editor__empty-icon" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="6" y="8" width="36" height="32" rx="3" />
				<line x1="14" y1="18" x2="34" y2="18" />
				<line x1="14" y1="24" x2="28" y2="24" />
				<line x1="14" y1="30" x2="22" y2="30" />
			</svg>
			<span class="block-editor__empty-text">No content blocks yet</span>
			<span class="block-editor__empty-hint">Click "Add block" below to start building</span>
		</div>
	{/if}

	<div class="block-editor__stage" class:editing={activeIndex !== null || editingFrontmatter}>
		<!-- Scrollable list + rail area -->
		<div class="block-editor__scroll">
			<div class="block-editor__list-wrap">
				<!-- Frontmatter summary header -->
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
						onclick={toggleFrontmatter}
						title="Edit frontmatter"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
						</svg>
						Edit
					</button>
				</div>

				{#each blocks as block, i (block.id)}
					<div
						class="block-editor__row"
						class:drag-source={dragIndex === i}
						class:drag-over={dropIndex === i && dragIndex !== i}
					>
						<div class="block-editor__block-cell">
							<BlockCard
								{block}
								{themeConfig}
								{themeCss}
								{highlightCss}
								{highlightTransform}
								ondragstart={(e) => handleDragStart(e, i)}
								ondragover={(e) => handleDragOver(e, i)}
								ondrop={(e) => handleDrop(e, i)}
							/>
						</div>
						<button
							class="block-editor__rail-label"
							class:active={activeIndex === i}
							onclick={() => toggleBlock(i)}
							aria-pressed={activeIndex === i}
						>
							{blockLabel(block)}
						</button>
					</div>
				{/each}

				<!-- Insert block bar -->
				{#if showInsertMenuProp}
					<div class="block-editor__insert">
						{#if showInsertMenu}
							<div class="insert-menu">
								<div class="insert-menu__section">
									<span class="insert-menu__label">Content</span>
									<div class="insert-menu__grid">
										<button class="insert-menu__btn" onclick={() => insertBlock('heading')}>
											<svg class="insert-menu__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
												<path d="M3 3v10M13 3v10M3 8h10" />
											</svg>
											Heading
										</button>
										<button class="insert-menu__btn" onclick={() => insertBlock('paragraph')}>
											<svg class="insert-menu__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
												<line x1="2" y1="4" x2="14" y2="4" />
												<line x1="2" y1="8" x2="14" y2="8" />
												<line x1="2" y1="12" x2="10" y2="12" />
											</svg>
											Paragraph
										</button>
										<button class="insert-menu__btn" onclick={() => insertBlock('fence')}>
											<svg class="insert-menu__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
												<polyline points="5 4 2 8 5 12" />
												<polyline points="11 4 14 8 11 12" />
											</svg>
											Code Block
										</button>
										<button class="insert-menu__btn" onclick={() => insertBlock('hr')}>
											<svg class="insert-menu__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
												<line x1="2" y1="8" x2="14" y2="8" />
											</svg>
											Divider
										</button>
									</div>
								</div>
								{#each [...runesByCategory.entries()] as [category, runes]}
									<div class="insert-menu__section">
										<span class="insert-menu__label">{category}</span>
										<div class="insert-menu__grid">
											{#each runes as rune}
												<button
													class="insert-menu__btn insert-menu__btn--rune"
													onclick={() => insertBlock('rune', rune.name)}
												>
													<span class="insert-menu__rune-dot"></span>
													<span class="insert-menu__rune-info">
														<span class="insert-menu__rune-name">{rune.name}</span>
														{#if rune.description}
															<span class="insert-menu__rune-desc">{rune.description}</span>
														{/if}
													</span>
												</button>
											{/each}
										</div>
									</div>
								{/each}
								<button class="insert-menu__close" onclick={() => { showInsertMenu = false; }}>&times; Close</button>
							</div>
						{:else}
							<button
								class="block-editor__add-btn"
								onclick={() => { showInsertMenu = true; }}
							>+ Add block</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Edit panel — slides in from the right -->
		{#if editingFrontmatter}
			<div class="block-editor__edit-panel">
				<FrontmatterEditPanel
					onclose={() => { editingFrontmatter = false; }}
				/>
			</div>
		{:else if activeIndex !== null && blocks[activeIndex]}
			<div class="block-editor__edit-panel">
				<BlockEditPanel
					block={blocks[activeIndex]}
					{runeMap}
					runes={() => runes}
					onupdate={(updated) => handleUpdateBlock(activeIndex!, updated)}
					onremove={() => { const idx = activeIndex!; activeIndex = null; handleRemoveBlock(idx); }}
					onclose={() => { activeIndex = null; }}
				/>
			</div>
		{/if}
	</div>
</div>


<style>
	.block-editor {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background: var(--ed-surface-1);
	}

	/* Stage: flex container for scroll area + edit panel */
	.block-editor__stage {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	/* Scrollable block list + rail area */
	.block-editor__scroll {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: var(--ed-space-5);
		transition: margin-right var(--ed-transition-slow);
	}

	.block-editor__stage.editing .block-editor__scroll {
		margin-right: 480px;
	}

	.block-editor__list-wrap {
		max-width: 1100px;
		margin: 0 auto;
		width: 100%;
		padding: var(--ed-space-4);
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		background: var(--ed-surface-0);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-lg);
		box-shadow: var(--ed-shadow-md);
	}

	/* Frontmatter summary header */
	.block-editor__fm-header {
		display: flex;
		align-items: center;
		gap: var(--ed-space-3);
		padding: var(--ed-space-3) var(--ed-space-4);
		border-bottom: 1px solid var(--ed-border-subtle);
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

	/* Block row: preview cell + rail label */
	.block-editor__row {
		display: flex;
		align-items: flex-start;
		transition: transform var(--ed-transition-fast), opacity var(--ed-transition-fast);
	}

	.block-editor__block-cell {
		flex: 1;
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

	/* Rail labels — aligned to the right of each block */
	.block-editor__rail-label {
		position: relative;
		width: 80px;
		flex-shrink: 0;
		margin-left: var(--ed-space-5);
		padding: 0.5rem 0.6rem 0.5rem 0.75rem;
		font-size: 10px;
		font-weight: 600;
		color: var(--ed-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		text-align: left;
		background: none;
		border: none;
		border-left: 1px solid var(--ed-border-subtle);
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color var(--ed-transition-fast);
		align-self: stretch;
		line-height: 1.3;
	}

	/* Gap in the line at the label — cut the border around the text */
	.block-editor__rail-label::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 0;
		height: 4px;
		width: 1px;
		background: var(--ed-surface-0);
	}

	.block-editor__rail-label::after {
		content: '';
		position: absolute;
		left: -1px;
		top: calc(0.5rem + 1.3em + 2px);
		bottom: 0;
		width: 1px;
		background: var(--ed-surface-0);
	}

	/* First label: hide top gap masker */
	.block-editor__row:first-of-type .block-editor__rail-label::before {
		top: 0;
		height: 0.5rem;
	}

	/* Last label: extend bottom gap masker */
	.block-editor__row:last-of-type .block-editor__rail-label::after {
		bottom: 0;
	}

	.block-editor__rail-label:hover {
		color: var(--ed-text-secondary);
	}

	.block-editor__rail-label.active {
		color: var(--ed-accent);
		font-weight: 700;
	}

	/* Edit panel — absolutely positioned on the right */
	.block-editor__edit-panel {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 480px;
		overflow-y: auto;
		background: var(--ed-surface-1);
		border-left: 1px solid var(--ed-border-default);
		transform: translateX(100%);
		transition: transform var(--ed-transition-slow);
		z-index: 2;
	}

	.block-editor__stage.editing .block-editor__edit-panel {
		transform: translateX(0);
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

	/* Insert block controls */
	.block-editor__insert {
		padding-top: var(--ed-space-1);
	}

	.block-editor__add-btn {
		width: 100%;
		padding: var(--ed-space-2);
		border: 2px dashed var(--ed-border-default);
		border-radius: var(--ed-radius-md);
		background: transparent;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		transition: border-color var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.block-editor__add-btn:hover {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	/* Insert menu */
	.insert-menu {
		border: 1px solid var(--ed-border-default);
		border-radius: 10px;
		background: var(--ed-surface-0);
		padding: var(--ed-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		box-shadow: var(--ed-shadow-lg);
		animation: menu-enter var(--ed-transition-normal);
	}

	@keyframes menu-enter {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.insert-menu__section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.insert-menu__label {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		color: var(--ed-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.insert-menu__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.35rem;
	}

	.insert-menu__btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: var(--ed-space-2) var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-1);
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		transition: background var(--ed-transition-fast), border-color var(--ed-transition-fast);
		text-align: left;
	}

	.insert-menu__btn:hover {
		background: var(--ed-accent-muted);
		border-color: var(--ed-accent);
		color: var(--ed-heading);
	}

	.insert-menu__icon {
		flex-shrink: 0;
		opacity: 0.6;
	}

	/* Rune buttons */
	.insert-menu__btn--rune {
		align-items: flex-start;
		padding: var(--ed-space-2);
	}

	.insert-menu__rune-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ed-warning);
		flex-shrink: 0;
		margin-top: 0.3rem;
	}

	.insert-menu__rune-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.insert-menu__rune-name {
		font-weight: 500;
	}

	.insert-menu__rune-desc {
		font-size: 10px;
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.insert-menu__btn--rune:hover {
		background: var(--ed-warning-subtle);
		border-color: var(--ed-warning);
	}

	.insert-menu__close {
		align-self: flex-end;
		padding: var(--ed-space-1) var(--ed-space-2);
		border: none;
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.insert-menu__close:hover {
		background: var(--ed-surface-2);
		color: var(--ed-text-secondary);
	}
</style>
