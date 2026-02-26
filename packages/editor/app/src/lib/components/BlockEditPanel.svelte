<script lang="ts">
	import type { RuneInfo } from '../api/client.js';
	import type {
		ParsedBlock,
		HeadingBlock,
		RuneBlock,
		FenceBlock,
	} from '../editor/block-parser.js';
	import {
		rebuildRuneSource,
		rebuildHeadingSource,
		rebuildFenceSource,
		blockLabel,
	} from '../editor/block-parser.js';
	import RuneAttributes from './RuneAttributes.svelte';
	import InlineEditor from './InlineEditor.svelte';

	interface Props {
		block: ParsedBlock;
		runeMap: Map<string, RuneInfo>;
		runes: () => RuneInfo[];
		onupdate: (block: ParsedBlock) => void;
		onremove: () => void;
		onclose: () => void;
	}

	let { block, runeMap, runes, onupdate, onremove, onclose }: Props = $props();

	let label = $derived(blockLabel(block));

	let runeInfo = $derived(
		block.type === 'rune' ? runeMap.get((block as RuneBlock).runeName) ?? null : null
	);

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

<div class="edit-panel">
	<div class="edit-panel__header">
		<span class="edit-panel__type">{label}</span>
		{#if category}
			<span class="edit-panel__category">{category}</span>
		{/if}
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

	<div class="edit-panel__body">
		{#if block.type === 'heading'}
			{@const hb = block as HeadingBlock}
			<div class="edit-panel__field-group">
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Level</span>
					<select
						class="edit-panel__select"
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
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Text</span>
					<input
						class="edit-panel__input"
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
				<div class="edit-panel__unknown">
					<span class="edit-panel__unknown-label">Unknown rune: {rb.runeName}</span>
					{#each Object.entries(rb.attributes) as [key, val]}
						<label class="edit-panel__field">
							<span class="edit-panel__field-label">{key}</span>
							<input
								class="edit-panel__input"
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
			{#if !rb.selfClosing}
				<div class="edit-panel__content-editor">
					<InlineEditor
						content={rb.innerContent}
						onchange={handleRuneContentChange}
						{runes}
					/>
				</div>
			{/if}

		{:else if block.type === 'fence'}
			{@const fb = block as FenceBlock}
			<div class="edit-panel__field-group">
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Language</span>
					<input
						class="edit-panel__input"
						type="text"
						value={fb.language}
						oninput={(e) => handleFenceLangChange((e.target as HTMLInputElement).value)}
						placeholder="e.g. js, python, html"
					/>
				</label>
			</div>
			<div class="edit-panel__content-editor">
				<InlineEditor
					content={fb.code}
					onchange={handleFenceCodeChange}
					language={fb.language}
					{runes}
				/>
			</div>

		{:else if block.type === 'paragraph'}
			<div class="edit-panel__content-editor">
				<InlineEditor
					content={block.source}
					onchange={handleSourceChange}
					{runes}
				/>
			</div>

		{:else}
			<!-- List, quote, image, etc. — raw source editing -->
			<div class="edit-panel__field-group">
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Source</span>
					<textarea
						class="edit-panel__textarea"
						value={block.source}
						oninput={(e) => handleSourceChange((e.target as HTMLTextAreaElement).value)}
						rows={Math.max(4, block.source.split('\n').length)}
					></textarea>
				</label>
			</div>
		{/if}
	</div>
</div>

<style>
	.edit-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.edit-panel__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--ed-space-3) var(--ed-space-4);
		border-bottom: 1px solid var(--ed-border-default);
		background: transparent;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.edit-panel__type {
		font-size: 12px;
		font-weight: 700;
		color: var(--ed-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.edit-panel__category {
		display: inline-flex;
		align-items: center;
		font-size: 10px;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 99px;
		background: var(--ed-warning-subtle);
		color: var(--ed-warning-text);
		white-space: nowrap;
		line-height: 1.2;
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

	.edit-panel__body {
		flex: 1;
		overflow-y: auto;
		padding: var(--ed-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-4);
	}

	.edit-panel__field-group {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
	}

	.edit-panel__field {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-1);
	}

	.edit-panel__field-label {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.edit-panel__input {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		font-family: inherit;
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.edit-panel__input:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.edit-panel__select {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		cursor: pointer;
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.edit-panel__select:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.edit-panel__textarea {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		resize: vertical;
		font-family: inherit;
		line-height: 1.6;
		min-height: 6rem;
		width: 100%;
		box-sizing: border-box;
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.edit-panel__textarea:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.edit-panel__content-editor {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		margin-left: calc(-1 * var(--ed-space-4));
		margin-right: calc(-1 * var(--ed-space-4));
		border-top: 1px solid var(--ed-border-subtle);
	}

	.edit-panel__unknown {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.edit-panel__unknown-label {
		font-size: var(--ed-text-sm);
		color: var(--ed-unsaved);
		font-style: italic;
	}
</style>
