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
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: #f8fafc;
	}

	.block-editor.hidden {
		display: none;
	}

	.block-editor__list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.block-editor__item {
		transition: transform 0.1s;
	}

	.block-editor__item.drag-over {
		border-top: 2px solid #0ea5e9;
		padding-top: 2px;
	}

	.block-editor__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.block-editor__empty-text {
		color: #94a3b8;
		font-size: 0.85rem;
	}

	.block-editor__placeholder {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.block-editor__placeholder-text {
		color: #475569;
		font-size: 0.9rem;
	}

	/* Insert block controls */
	.block-editor__insert {
		padding-top: 0.25rem;
	}

	.block-editor__add-btn {
		width: 100%;
		padding: 0.5rem;
		border: 2px dashed #e2e8f0;
		border-radius: 6px;
		background: transparent;
		color: #94a3b8;
		font-size: 0.8rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.block-editor__add-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	/* Insert menu */
	.insert-menu {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #ffffff;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.insert-menu__section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.insert-menu__label {
		font-size: 0.6rem;
		font-weight: 600;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.insert-menu__options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.insert-menu__btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		background: #fafbfc;
		color: #475569;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s;
	}

	.insert-menu__btn:hover {
		background: #f0f9ff;
		border-color: #0ea5e9;
		color: #0369a1;
	}

	.insert-menu__btn--rune {
		background: #fffbeb;
		border-color: #fde68a;
		color: #92400e;
	}

	.insert-menu__btn--rune:hover {
		background: #fef3c7;
		border-color: #d97706;
		color: #78350f;
	}

	.insert-menu__close {
		align-self: flex-end;
		padding: 0.2rem 0.5rem;
		border: none;
		background: none;
		color: #94a3b8;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.insert-menu__close:hover {
		color: #475569;
	}
</style>
