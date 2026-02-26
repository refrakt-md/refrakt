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
	import { editorState } from '../state/editor.svelte.js';
	import { renderBlockPreview } from '../preview/block-renderer.js';
	import { initRuneBehaviors } from '@refrakt-md/behaviors';
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

	let editing = $state(false);

	// ── Inline preview via Shadow DOM ─────────────────────────────
	let previewContainer: HTMLDivElement | undefined = $state();
	let shadowRoot: ShadowRoot | null = null;
	let previewDebounce: ReturnType<typeof setTimeout>;
	let behaviorCleanup: (() => void) | null = null;

	$effect(() => {
		if (!previewContainer || !editorState.themeConfig) return;

		// Attach shadow root once
		if (!shadowRoot) {
			shadowRoot = previewContainer.attachShadow({ mode: 'open' });
		}

		const source = block.source;
		const config = editorState.themeConfig;
		const css = editorState.themeCss;
		const hlCss = editorState.highlightCss || '';
		const hlTransform = editorState.highlightTransform;

		clearTimeout(previewDebounce);
		previewDebounce = setTimeout(() => {
			if (!shadowRoot) return;

			// Clean up previous behaviors before re-rendering
			if (behaviorCleanup) {
				behaviorCleanup();
				behaviorCleanup = null;
			}

			try {
				const { html, isComponent } = renderBlockPreview(source, config, hlTransform);
				if (isComponent) {
					shadowRoot.innerHTML = `<style>
						:host { display: block; padding: 0.75rem 1.5rem; }
						.placeholder { display: flex; align-items: center; gap: 0.5rem; color: #888; font-family: system-ui, sans-serif; font-size: 13px; }
						.placeholder svg { opacity: 0.5; }
					</style>
					<div class="placeholder">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<rect x="2" y="2" width="12" height="12" rx="2" />
							<path d="M6 6l4 4M10 6l-4 4" />
						</svg>
						Interactive component — see full preview
					</div>`;
				} else {
					// Re-scope :root to :host so CSS custom properties apply within the shadow tree
					const scopedCss = css.replace(/:root/g, ':host');
					shadowRoot.innerHTML = `<style>${scopedCss}
${hlCss}
						:host { display: block; }
						.rf-preview-wrapper { padding: 0.5rem 1.5rem; font-family: var(--rf-font-sans, system-ui, -apple-system, sans-serif); color: var(--rf-color-text, #1a1a2e); line-height: 1.6; }
					</style>
					<div class="rf-preview-wrapper">${html}</div>`;

					// Run behaviors (tabs, accordion, copy, etc.) on the rendered content
					const wrapper = shadowRoot.querySelector('.rf-preview-wrapper') as HTMLElement | null;
					if (wrapper) {
						behaviorCleanup = initRuneBehaviors(wrapper);
					}
				}
			} catch {
				if (shadowRoot) {
					shadowRoot.innerHTML = `<style>:host { display: block; padding: 0.75rem 1.5rem; color: #999; font-family: system-ui; font-size: 12px; }</style><em>Preview unavailable</em>`;
				}
			}
		}, 50);

		return () => {
			clearTimeout(previewDebounce);
			if (behaviorCleanup) {
				behaviorCleanup();
				behaviorCleanup = null;
			}
		};
	});

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
	class:editing
	draggable={dragHandle ? 'true' : 'false'}
	ondragstart={ondragstart}
	ondragover={ondragover}
	ondrop={ondrop}
>
	<!-- Thin block header — visible on hover -->
	<div class="block-card__header">
		{#if dragHandle}
			<span class="block-card__drag" title="Drag to reorder">
				<svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
					<circle cx="2" cy="2" r="1.2" />
					<circle cx="6" cy="2" r="1.2" />
					<circle cx="2" cy="7" r="1.2" />
					<circle cx="6" cy="7" r="1.2" />
					<circle cx="2" cy="12" r="1.2" />
					<circle cx="6" cy="12" r="1.2" />
				</svg>
			</span>
		{/if}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="block-card__header-toggle"
			onclick={() => { editing = !editing; }}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editing = !editing; } }}
			tabindex="0"
			role="button"
			aria-expanded={editing}
		>
			<span class="block-card__type">{label}</span>

			{#if category}
				<span class="block-card__category">{category}</span>
			{/if}

			<svg class="block-card__chevron" class:collapsed={!editing} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="6 4 10 8 6 12" />
			</svg>
		</div>

		<button
			class="block-card__btn block-card__btn--danger"
			onclick={onremove}
			title="Remove block"
		>&times;</button>
	</div>

	<!-- Editing controls — shown when editing -->
	{#if editing}
		{#if block.type !== 'paragraph'}
		<div class="block-card__editor">
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

		<!-- Content editor for runes, paragraphs, and fences -->
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

	<!-- Inline preview (Shadow DOM) — always visible -->
	{#if editorState.themeConfig}
		<div class="block-card__inline-preview" bind:this={previewContainer}></div>
	{/if}
</div>

<style>
	.block-card {
		position: relative;
		border-left: 2px solid transparent;
		transition: border-color var(--ed-transition-fast);
	}

	.block-card:hover {
		border-left-color: var(--ed-border-strong);
	}

	.block-card.editing {
		border-left-color: var(--ed-accent);
	}

	/* Type accent on hover */
	.block-card--heading:hover {
		border-left-color: var(--ed-heading);
	}

	.block-card--rune:hover {
		border-left-color: var(--ed-warning);
	}

	.block-card--heading.editing {
		border-left-color: var(--ed-heading);
	}

	.block-card--rune.editing {
		border-left-color: var(--ed-warning);
	}

	/* Header — thin overlay, shows on hover */
	.block-card__header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.15rem var(--ed-space-3);
		cursor: default;
		min-height: 28px;
		opacity: 0;
		transition: opacity var(--ed-transition-fast);
		background: var(--ed-surface-0);
		border-bottom: 1px solid var(--ed-border-subtle);
	}

	.block-card:hover .block-card__header,
	.block-card.editing .block-card__header {
		opacity: 1;
	}

	.block-card__drag {
		cursor: grab;
		color: var(--ed-text-muted);
		padding: 0.1rem;
		user-select: none;
		display: flex;
		align-items: center;
		opacity: 0.5;
		transition: opacity var(--ed-transition-fast);
	}

	.block-card:hover .block-card__drag {
		opacity: 1;
	}

	.block-card__drag:active {
		cursor: grabbing;
	}

	.block-card__type {
		font-size: 11px;
		font-weight: 600;
		color: var(--ed-text-tertiary);
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

	.block-card__header-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: 1;
		min-width: 0;
		cursor: pointer;
		border-radius: var(--ed-radius-sm);
		padding: 0.1rem var(--ed-space-1);
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
		transition: color var(--ed-transition-fast), background var(--ed-transition-fast);
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
		transition: transform var(--ed-transition-fast);
		transform: rotate(90deg);
		color: var(--ed-text-muted);
		margin-left: auto;
		flex-shrink: 0;
	}

	.block-card__chevron.collapsed {
		transform: rotate(0deg);
	}

	/* Editor panel — editing controls */
	.block-card__editor {
		padding: var(--ed-space-3) var(--ed-space-4);
		border-bottom: 1px solid var(--ed-border-subtle);
		background: var(--ed-surface-1);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		animation: card-expand var(--ed-transition-slow);
	}

	@keyframes card-expand {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Footer — content editor */
	.block-card__footer {
		border-bottom: 1px solid var(--ed-border-subtle);
		overflow: hidden;
		animation: card-expand var(--ed-transition-slow);
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
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
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
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
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
		background: var(--ed-surface-0);
		outline: none;
		resize: vertical;
		font-family: inherit;
		line-height: 1.6;
		min-height: 3rem;
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.block-card__textarea:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 3px var(--ed-accent-ring);
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

	/* Inline preview — always visible, seamless */
	.block-card__inline-preview {
		overflow: hidden;
	}
</style>
