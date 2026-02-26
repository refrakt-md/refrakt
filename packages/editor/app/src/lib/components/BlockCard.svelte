<script lang="ts">
	import type { RuneInfo } from '../api/client.js';
	import type {
		ParsedBlock,
		HeadingBlock,
		RuneBlock,
		FenceBlock,
		ListBlock,
	} from '../editor/block-parser.js';
	import {
		rebuildRuneSource,
		rebuildHeadingSource,
		rebuildFenceSource,
	} from '../editor/block-parser.js';
	import RuneAttributes from './RuneAttributes.svelte';
	import InlineEditor from './InlineEditor.svelte';

	interface Props {
		block: ParsedBlock;
		runeMap: Map<string, RuneInfo>;
		runes: () => RuneInfo[];
		dragHandle?: boolean;
		onupdate: (block: ParsedBlock) => void;
		onremove: () => void;
		ondragstart: (e: DragEvent) => void;
		ondragover: (e: DragEvent) => void;
		ondrop: (e: DragEvent) => void;
	}

	let {
		block,
		runeMap,
		runes,
		dragHandle = true,
		onupdate,
		onremove,
		ondragstart,
		ondragover,
		ondrop,
	}: Props = $props();

	let expanded = $state(false);

	/** Label shown in the block header */
	let label = $derived.by(() => {
		switch (block.type) {
			case 'heading':
				return `H${(block as HeadingBlock).level}`;
			case 'rune':
				return (block as RuneBlock).runeName;
			case 'fence':
				return (block as FenceBlock).language
					? `Code (${(block as FenceBlock).language})`
					: 'Code';
			case 'list':
				return (block as ListBlock).ordered ? 'Ordered List' : 'List';
			case 'quote':
				return 'Blockquote';
			case 'hr':
				return 'Divider';
			case 'image':
				return 'Image';
			case 'paragraph':
				return 'Paragraph';
			default:
				return block.type;
		}
	});

	/** CSS class modifier for the block type */
	let typeClass = $derived(
		block.type === 'rune' ? 'rune' : block.type === 'heading' ? 'heading' : 'content'
	);

	/** For rune blocks, get the RuneInfo if available */
	let runeInfo = $derived(
		block.type === 'rune' ? runeMap.get((block as RuneBlock).runeName) ?? null : null
	);

	/** Category badge for rune blocks */
	let category = $derived(runeInfo?.category ?? null);

	// ── Edit handlers ────────────────────────────────────────────

	function handleHeadingTextChange(text: string) {
		const b = block as HeadingBlock;
		const updated: HeadingBlock = { ...b, text, source: '' };
		updated.source = rebuildHeadingSource(updated);
		onupdate(updated);
	}

	function handleHeadingLevelChange(level: number) {
		const b = block as HeadingBlock;
		const updated: HeadingBlock = { ...b, level, source: '' };
		updated.source = rebuildHeadingSource(updated);
		onupdate(updated);
	}

	function handleRuneAttrsChange(attrs: Record<string, string>) {
		const b = block as RuneBlock;
		const updated: RuneBlock = { ...b, attributes: attrs, source: '' };
		updated.source = rebuildRuneSource(updated);
		onupdate(updated);
	}

	function handleRuneContentChange(content: string) {
		const b = block as RuneBlock;
		const updated: RuneBlock = { ...b, innerContent: content, source: '' };
		updated.source = rebuildRuneSource(updated);
		onupdate(updated);
	}

	function handleFenceCodeChange(code: string) {
		const b = block as FenceBlock;
		const updated: FenceBlock = { ...b, code, source: '' };
		updated.source = rebuildFenceSource(updated);
		onupdate(updated);
	}

	function handleFenceLangChange(language: string) {
		const b = block as FenceBlock;
		const updated: FenceBlock = { ...b, language, source: '' };
		updated.source = rebuildFenceSource(updated);
		onupdate(updated);
	}

	function handleSourceChange(source: string) {
		onupdate({ ...block, source });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="block-card block-card--{typeClass}"
	class:collapsed={!expanded}
	draggable={dragHandle ? 'true' : 'false'}
	ondragstart={ondragstart}
	ondragover={ondragover}
	ondrop={ondrop}
>
	<!-- Header bar -->
	<div class="block-card__header">
		{#if dragHandle}
			<span class="block-card__drag" title="Drag to reorder">&#x2630;</span>
		{/if}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="block-card__header-toggle"
			onclick={() => { expanded = !expanded; }}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expanded = !expanded; } }}
			tabindex="0"
			role="button"
			aria-expanded={expanded}
		>
			<span class="block-card__type">{label}</span>

			{#if category}
				<span class="block-card__category">{category}</span>
			{/if}

			{#if block.type === 'heading'}
				<span class="block-card__preview">{(block as HeadingBlock).text}</span>
			{:else if block.type === 'paragraph'}
				<span class="block-card__preview">{block.source.slice(0, 60)}{block.source.length > 60 ? '...' : ''}</span>
			{/if}

			<span class="block-card__chevron" class:collapsed={!expanded}>&#x25B8;</span>
		</div>

		<button
			class="block-card__btn block-card__btn--danger"
			onclick={onremove}
			title="Remove block"
		>&times;</button>
	</div>

	<!-- Expanded body -->
	{#if expanded}
		{#if block.type !== 'paragraph'}
		<div class="block-card__body">
			{#if block.type === 'heading'}
				{@const hb = block as HeadingBlock}
				<div class="block-card__row">
					<label class="block-card__inline-field">
						<span class="block-card__field-label">Level</span>
						<select
							class="block-card__select"
							value={String(hb.level)}
							onchange={(e) => handleHeadingLevelChange(Number((e.target as HTMLSelectElement).value))}
						>
							<option value="1">H1</option>
							<option value="2">H2</option>
							<option value="3">H3</option>
							<option value="4">H4</option>
							<option value="5">H5</option>
							<option value="6">H6</option>
						</select>
					</label>
					<label class="block-card__inline-field block-card__inline-field--grow">
						<span class="block-card__field-label">Text</span>
						<input
							class="block-card__input"
							type="text"
							value={hb.text}
							oninput={(e) => handleHeadingTextChange((e.target as HTMLInputElement).value)}
						/>
					</label>
				</div>

			{:else if block.type === 'rune'}
				{@const rb = block as RuneBlock}
				{#if runeInfo}
					<RuneAttributes
						{runeInfo}
						attributes={rb.attributes}
						onchange={handleRuneAttrsChange}
					/>
				{:else}
					<!-- Unknown rune: show raw attributes -->
					<div class="block-card__unknown">
						<span class="block-card__unknown-label">Unknown rune: {rb.runeName}</span>
						{#each Object.entries(rb.attributes) as [key, val]}
							<label class="block-card__inline-field">
								<span class="block-card__field-label">{key}</span>
								<input
									class="block-card__input"
									type="text"
									value={val}
									oninput={(e) => {
										const next = { ...rb.attributes, [key]: (e.target as HTMLInputElement).value };
										handleRuneAttrsChange(next);
									}}
								/>
							</label>
						{/each}
					</div>
				{/if}

			{:else if block.type === 'fence'}
				{@const fb = block as FenceBlock}
				<div class="block-card__row">
					<label class="block-card__inline-field">
						<span class="block-card__field-label">Language</span>
						<input
							class="block-card__input"
							type="text"
							value={fb.language}
							oninput={(e) => handleFenceLangChange((e.target as HTMLInputElement).value)}
							placeholder="e.g. js, python, html"
						/>
					</label>
				</div>
				{:else if block.type !== 'paragraph'}
				<!-- List, quote, etc. - edit raw source -->
				<textarea
					class="block-card__textarea"
					value={block.source}
					oninput={(e) => handleSourceChange((e.target as HTMLTextAreaElement).value)}
					rows={Math.max(2, block.source.split('\n').length)}
				></textarea>
			{/if}
		</div>
		{/if}

		<!-- Footer: content editor for runes, paragraphs, and fences -->
		{#if block.type === 'rune' && !(block as RuneBlock).selfClosing}
			{@const rb = block as RuneBlock}
			<div class="block-card__footer">
				<InlineEditor
					content={rb.innerContent}
					onchange={handleRuneContentChange}
					{runes}
				/>
			</div>
		{:else if block.type === 'paragraph'}
			<div class="block-card__footer">
				<InlineEditor
					content={block.source}
					onchange={handleSourceChange}
					{runes}
				/>
			</div>
		{:else if block.type === 'fence'}
			<div class="block-card__footer">
				<InlineEditor
					content={(block as FenceBlock).code}
					onchange={handleFenceCodeChange}
					language={(block as FenceBlock).language}
					{runes}
				/>
			</div>
		{/if}
	{/if}
</div>

<style>
	.block-card {
		transition: box-shadow var(--ed-transition-fast);
	}

	.block-card:hover {
		box-shadow: var(--ed-shadow-md);
	}

	.block-card.collapsed {
		border-color: var(--ed-border-subtle);
	}

	/* Header */
	.block-card__header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: var(--ed-space-4);
		cursor: default;
		min-height: 36px;
	}

	.block-card__drag {
		cursor: grab;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		padding: 0 0.15rem;
		user-select: none;
	}

	.block-card__drag:active {
		cursor: grabbing;
	}

	.block-card__type {
		font-size: var(--ed-text-sm);
		font-weight: 600;
		color: var(--ed-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.block-card--rune .block-card__type {
		color: var(--ed-warning);
	}

	.block-card--heading .block-card__type {
		color: var(--ed-heading);
	}

	.block-card__category {
		font-size: var(--ed-text-xs);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: var(--ed-warning-subtle);
		color: var(--ed-warning-text);
		white-space: nowrap;
	}

	.block-card__preview {
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.block-card__header-toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 0;
		cursor: pointer;
		border-radius: var(--ed-radius-sm);
		padding: 0.15rem var(--ed-space-1);
		outline: none;
	}

	.block-card__header-toggle:focus-visible {
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.block-card__btn {
		background: none;
		border: none;
		color: var(--ed-text-muted);
		cursor: pointer;
		padding: 0.1rem var(--ed-space-1);
		font-size: var(--ed-text-base);
		line-height: 1;
		border-radius: var(--ed-radius-sm);
	}

	.block-card__btn:hover {
		color: var(--ed-text-secondary);
		background: var(--ed-surface-2);
	}

	.block-card__btn--danger:hover {
		color: var(--ed-danger);
		background: var(--ed-danger-subtle);
	}

	.block-card__chevron {
		display: inline-block;
		transition: transform var(--ed-transition-fast);
		transform: rotate(90deg);
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		margin-left: auto;
		flex-shrink: 0;
	}

	.block-card__chevron.collapsed {
		transform: rotate(0deg);
	}

	/* Body */
	.block-card__body {
		padding: var(--ed-space-4);
		border-top: 1px solid var(--ed-border-subtle);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
	}

	/* Footer */
	.block-card__footer {
		border-top: 1px solid var(--ed-border-subtle);
		overflow: hidden;
		border-radius: 0 0 var(--ed-radius-md) var(--ed-radius-md);
	}

	.block-card__row {
		display: flex;
		gap: var(--ed-space-3);
		align-items: flex-end;
	}

	.block-card__inline-field {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-1);
	}

	.block-card__inline-field--grow {
		flex: 1;
	}

	.block-card__field-label {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.block-card__input {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		font-family: inherit;
	}

	.block-card__input:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.block-card__select {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		cursor: pointer;
	}

	.block-card__select:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.block-card__textarea {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-1);
		outline: none;
		resize: vertical;
		font-family: inherit;
		line-height: 1.6;
		min-height: 3rem;
	}

	.block-card__textarea:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.block-card__textarea--code {
		font-family: var(--ed-font-mono);
		font-size: var(--ed-text-sm);
		background: var(--ed-surface-1);
	}

	.block-card__unknown {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.block-card__unknown-label {
		font-size: var(--ed-text-sm);
		color: var(--ed-unsaved);
		font-style: italic;
	}
</style>
