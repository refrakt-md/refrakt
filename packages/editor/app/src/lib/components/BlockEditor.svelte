<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import {
		parseBlocks,
		serializeBlocks,
		buildRuneMap,
		type ParsedBlock,
	} from '../editor/block-parser.js';
	import BlockCard from './BlockCard.svelte';

	let blocks: ParsedBlock[] = $state([]);
	let runeMap = $derived(buildRuneMap(editorState.runes));

	// Track the source we last parsed from, to avoid re-parsing our own updates
	let lastParsedSource = '';

	// Parse blocks when body content changes (from outside, e.g. file switch)
	$effect(() => {
		const body = editorState.bodyContent;
		if (body !== lastParsedSource) {
			blocks = parseBlocks(body);
			lastParsedSource = body;
		}
	});

	/** Sync blocks back to source text */
	function syncToSource() {
		const newSource = serializeBlocks(blocks);
		lastParsedSource = newSource;
		editorState.updateBody(newSource);
	}

	// ── Block operations ─────────────────────────────────────────

	function handleUpdateBlock(index: number, updated: ParsedBlock) {
		blocks = blocks.map((b, i) => (i === index ? updated : b));
		syncToSource();
	}

	function handleRemoveBlock(index: number) {
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
		const map = new Map<string, typeof editorState.runes>();
		for (const r of editorState.runes) {
			const list = map.get(r.category) ?? [];
			list.push(r);
			map.set(r.category, list);
		}
		return map;
	});
</script>

<div class="block-editor" class:hidden={!editorState.currentPath}>
	{#if blocks.length === 0 && editorState.currentPath}
		<div class="block-editor__empty">
			<span class="block-editor__empty-text">No content blocks yet</span>
		</div>
	{/if}

	<div class="block-editor__list">
		{#each blocks as block, i (block.id)}
			<div
				class="block-editor__item"
				class:drag-over={dropIndex === i && dragIndex !== i}
			>
				<BlockCard
					{block}
					{runeMap}
					runes={() => editorState.runes}
					onupdate={(updated) => handleUpdateBlock(i, updated)}
					onremove={() => handleRemoveBlock(i)}
					ondragstart={(e) => handleDragStart(e, i)}
					ondragover={(e) => handleDragOver(e, i)}
					ondrop={(e) => handleDrop(e, i)}
				/>
			</div>
		{/each}
	</div>

	<!-- Insert block bar -->
	{#if editorState.currentPath}
		<div class="block-editor__insert">
			{#if showInsertMenu}
				<div class="insert-menu">
					<div class="insert-menu__section">
						<span class="insert-menu__label">Content</span>
						<div class="insert-menu__options">
							<button class="insert-menu__btn" onclick={() => insertBlock('heading')}>Heading</button>
							<button class="insert-menu__btn" onclick={() => insertBlock('paragraph')}>Paragraph</button>
							<button class="insert-menu__btn" onclick={() => insertBlock('fence')}>Code Block</button>
							<button class="insert-menu__btn" onclick={() => insertBlock('hr')}>Divider</button>
						</div>
					</div>
					{#each [...runesByCategory.entries()] as [category, runes]}
						<div class="insert-menu__section">
							<span class="insert-menu__label">{category}</span>
							<div class="insert-menu__options">
								{#each runes as rune}
									<button
										class="insert-menu__btn insert-menu__btn--rune"
										onclick={() => insertBlock('rune', rune.name)}
										title={rune.description}
									>{rune.name}</button>
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

{#if !editorState.currentPath}
	<div class="block-editor__placeholder">
		<span class="block-editor__placeholder-text">Select a file to edit</span>
	</div>
{/if}

<style>
	.block-editor {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		background: var(--ed-surface-1);
	}

	.block-editor.hidden {
		display: none;
	}

	.block-editor__list {
		display: flex;
		flex-direction: column;
	}

	.block-editor__item {
		transition: transform var(--ed-transition-fast);
	}

	.block-editor__item.drag-over {
		border-top: 2px solid var(--ed-accent);
		padding-top: 2px;
	}

	.block-editor__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.block-editor__empty-text {
		color: var(--ed-text-muted);
		font-size: var(--ed-text-md);
	}

	.block-editor__placeholder {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.block-editor__placeholder-text {
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-md);
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
		font-size: var(--ed-text-base);
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
		border-radius: var(--ed-radius-lg);
		background: var(--ed-surface-0);
		padding: var(--ed-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		box-shadow: var(--ed-shadow-md);
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

	.insert-menu__options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.insert-menu__btn {
		padding: var(--ed-space-1) var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-1);
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		transition: background var(--ed-transition-fast), border-color var(--ed-transition-fast);
	}

	.insert-menu__btn:hover {
		background: var(--ed-accent-muted);
		border-color: var(--ed-accent);
		color: var(--ed-heading);
	}

	.insert-menu__btn--rune {
		background: var(--ed-warning-subtle);
		border-color: var(--ed-warning);
		color: var(--ed-warning-text);
	}

	.insert-menu__btn--rune:hover {
		background: var(--ed-warning-subtle);
		border-color: var(--ed-warning);
		color: var(--ed-warning-text);
		filter: brightness(0.95);
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
