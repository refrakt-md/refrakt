<script lang="ts">
	import type { RuneInfo } from '../api/client.js';
	import type {
		ParsedBlock,
		HeadingBlock,
		RuneBlock,
		FenceBlock,
		ContentNode,
	} from '../editor/block-parser.js';
	import {
		rebuildRuneSource,
		rebuildHeadingSource,
		rebuildFenceSource,
		blockLabel,
		parseContentTree,
		serializeAttributes,
		replaceNodeSource,
		insertFieldContent,
		removeFieldContent,
		appendListItem,
		removeListItem,
		reorderListItem,
	} from '../editor/block-parser.js';
	import { resolveContentStructure } from '../editor/content-model-resolver.js';
	import type { SectionMapping } from '../editor/section-mapper.js';
	import { stripInlineMarkdown } from '../editor/inline-markdown.js';
	import RuneAttributes from './RuneAttributes.svelte';
	import ContentTree from './ContentTree.svelte';
	import ContentModelTree from './ContentModelTree.svelte';
	import InlineEditor from './InlineEditor.svelte';

	interface Props {
		block: ParsedBlock;
		runeMap: Map<string, RuneInfo>;
		runes: () => RuneInfo[];
		aggregated?: Record<string, unknown>;
		/** When set, auto-navigate to the Nth nested rune (DFS order) on mount */
		initialRuneIndex?: number | null;
		onupdate: (block: ParsedBlock) => void;
		onremove: () => void;
		onclose: () => void;
		oneditfield?: (dataName: string, inlineSource: string, rect: DOMRect, mapping: SectionMapping) => void;
	}

	let { block, runeMap, runes, aggregated = {}, initialRuneIndex = null, onupdate, onremove, onclose, oneditfield }: Props = $props();

	let label = $derived(blockLabel(block));

	let runeInfo = $derived(
		block.type === 'rune' ? runeMap.get((block as RuneBlock).runeName) ?? null : null
	);

	let category = $derived(runeInfo?.category ?? null);

	// ── Nested rune tree ─────────────────────────────────────────

	/** Path of indices into the content tree for the selected nested rune */
	let activePath: number[] = $state([]);

	/** Parse inner content into a tree (for rune blocks with content) */
	let contentTree = $derived.by(() => {
		if (block.type !== 'rune') return [];
		const rb = block as RuneBlock;
		if (rb.selfClosing || !rb.innerContent.trim()) return [];
		return parseContentTree(rb.innerContent);
	});

	/** Whether this rune has any nested rune children worth showing a tree for */
	let hasNestedRunes = $derived(
		contentTree.some(n => n.type === 'rune')
	);

	/** The effective rune info for the structure tab — nested rune if selected, root otherwise */
	let effectiveRuneInfo = $derived.by(() => {
		if (activeNode?.type === 'rune' && activeRuneInfo) return activeRuneInfo;
		return runeInfo;
	});

	/** Content tree for the effective rune (nested rune's children or root's) */
	let effectiveContentTree = $derived.by(() => {
		if (activeNode?.type === 'rune' && activeNode.children) return activeNode.children;
		return contentTree;
	});

	/** Whether the effective rune has a declarative content model */
	let hasContentModel = $derived(effectiveRuneInfo?.contentModel != null);

	/** Resolved structure: effective content tree matched against effective content model */
	let resolvedStructure = $derived.by(() => {
		if (!effectiveRuneInfo?.contentModel) return null;
		return resolveContentStructure(effectiveContentTree, effectiveRuneInfo.contentModel);
	});

	/** Currently selected field in the content model tree */
	let selectedField: string | null = $state(null);

	/** Find the path to the Nth rune node in DFS order */
	function findRunePathByDfsIndex(nodes: ContentNode[], target: number): number[] | null {
		let count = 0;
		function walk(ns: ContentNode[], path: number[]): number[] | null {
			for (let i = 0; i < ns.length; i++) {
				if (ns[i].type === 'rune') {
					if (count === target) return [...path, i];
					count++;
					const found = walk(ns[i].children ?? [], [...path, i]);
					if (found) return found;
				}
			}
			return null;
		}
		return walk(nodes, []);
	}

	// Auto-navigate to a nested rune when initialRuneIndex is provided
	$effect(() => {
		if (initialRuneIndex != null && contentTree.length > 0) {
			const path = findRunePathByDfsIndex(contentTree, initialRuneIndex);
			if (path) activePath = path;
		}
	});

	/** Resolve the active nested node from the path */
	function resolveNode(nodes: ContentNode[], path: number[]): ContentNode | null {
		if (path.length === 0) return null;
		const [head, ...rest] = path;
		const node = nodes[head];
		if (!node) return null;
		if (rest.length === 0) return node;
		return resolveNode(node.children ?? [], rest);
	}

	let activeNode = $derived(resolveNode(contentTree, activePath));

	let activeRuneInfo = $derived(
		activeNode?.runeName ? runeMap.get(activeNode.runeName) ?? null : null
	);

	/** Whether the active node is a non-rune content node */
	let activeIsContent = $derived(activeNode != null && activeNode.type !== 'rune');

	/** Display label for header — show content node type when one is selected */
	let headerLabel = $derived.by(() => {
		if (!activeNode) return label;
		if (activeNode.type === 'rune') return activeNode.runeName ?? label;
		return activeNode.type;
	});

	type TabId = 'settings' | 'structure' | 'content';
	let activeTab: TabId = $state('settings');

	let availableTabs = $derived.by(() => {
		if (block.type !== 'rune') return [] as TabId[];
		const rb = block as RuneBlock;
		const tabs: TabId[] = ['settings'];
		// Show structure tab when the effective rune has a content model,
		// or when no nested rune is selected and root has nested runes (legacy tree)
		if (hasContentModel || (!activeNode && hasNestedRunes)) tabs.push('structure');
		if (!rb.selfClosing) tabs.push('content');
		return tabs;
	});

	// Auto-switch away from structure tab if it becomes unavailable
	$effect(() => {
		if (activeTab === 'structure' && !availableTabs.includes('structure')) {
			activeTab = 'settings';
		}
	});

	function handleTreeSelect(path: number[]) {
		activePath = path;
		// Auto-switch to Content tab when selecting a content node
		const node = resolveNode(contentTree, path);
		if (node && node.type !== 'rune') {
			activeTab = 'content';
		}
	}

	function navigateToRoot() {
		activePath = [];
	}

	// ── Content model field handlers ─────────────────────────────

	function handleFieldSelect(fieldName: string, zoneName?: string) {
		selectedField = zoneName ? `${zoneName}.${fieldName}` : fieldName;
	}

	/** Apply a field content change — works for both root and nested runes */
	function applyFieldChange(updater: (content: string) => string) {
		const rb = block as RuneBlock;
		if (activeNode?.type === 'rune' && activeNode.innerContent !== undefined) {
			// Nested rune: update its inner content, then replace in root
			const newNestedInner = updater(activeNode.innerContent);
			if (newNestedInner === activeNode.innerContent) return;
			const attrStr = serializeAttributes(activeNode.attributes ?? {});
			const inner = newNestedInner.trim();
			const newSource = inner
				? `{% ${activeNode.runeName}${attrStr} %}\n${inner}\n{% /${activeNode.runeName} %}`
				: `{% ${activeNode.runeName}${attrStr} %}\n\n{% /${activeNode.runeName} %}`;
			const newRootInner = replaceNodeSource(rb.innerContent, activeNode.source, newSource);
			const updated: RuneBlock = { ...rb, innerContent: newRootInner, source: '' };
			updated.source = rebuildRuneSource(updated);
			onupdate(updated);
		} else {
			// Root rune
			const newInner = updater(rb.innerContent);
			if (newInner === rb.innerContent) return;
			const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
			updated.source = rebuildRuneSource(updated);
			onupdate(updated);
		}
	}

	function handleAddField(fieldName: string, zoneName?: string) {
		if (!resolvedStructure) return;
		applyFieldChange(content => insertFieldContent(content, resolvedStructure!, fieldName, zoneName));
	}

	function handleRemoveField(fieldName: string, zoneName?: string) {
		if (!resolvedStructure) return;
		applyFieldChange(content => removeFieldContent(content, resolvedStructure!, fieldName, zoneName));
	}

	function handleAppendItem(fieldName: string, zoneName?: string) {
		if (!resolvedStructure) return;
		applyFieldChange(content => appendListItem(content, resolvedStructure!, fieldName, zoneName));
	}

	function handleRemoveListItem(fieldName: string, itemIndex: number, zoneName?: string) {
		if (!resolvedStructure) return;
		applyFieldChange(content => removeListItem(content, resolvedStructure!, fieldName, itemIndex, zoneName));
	}

	function handleReorderListItem(fieldName: string, fromIndex: number, toIndex: number, zoneName?: string) {
		if (!resolvedStructure) return;
		applyFieldChange(content => reorderListItem(content, resolvedStructure!, fieldName, fromIndex, toIndex, zoneName));
	}

	function handleEditField(fieldName: string, rect: DOMRect, zoneName?: string) {
		if (!resolvedStructure || !oneditfield) return;
		// Find the field in the resolved structure
		let field;
		if (resolvedStructure.type === 'sequence') {
			field = resolvedStructure.fields.find(f => f.name === fieldName);
		} else if (resolvedStructure.type === 'delimited' && zoneName) {
			const zone = resolvedStructure.zones.find(z => z.name === zoneName);
			field = zone?.fields.find(f => f.name === fieldName);
		}
		if (!field || !field.filled || field.nodes.length !== 1) return;

		const source = field.nodes[0].source;
		const trimmed = source.trim();

		// Strip markdown prefix (heading markers, blockquote markers)
		let prefix = '';
		let inlineContent = trimmed;
		const headingMatch = trimmed.match(/^(#{1,6}\s+)(.*)/);
		if (headingMatch) {
			prefix = headingMatch[1];
			inlineContent = headingMatch[2];
		} else {
			const quoteMatch = trimmed.match(/^(>\s*)(.*)/);
			if (quoteMatch) {
				prefix = quoteMatch[1];
				inlineContent = quoteMatch[2];
			}
		}

		const mapping: SectionMapping = {
			dataName: fieldName,
			text: stripInlineMarkdown(inlineContent),
			source,
			sourcePrefix: prefix,
			inlineSource: inlineContent,
		};
		oneditfield(fieldName, inlineContent, rect, mapping);
	}

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

	/** Handle attribute changes for a nested rune node */
	function handleNestedAttrsChange(attrs: Record<string, string>) {
		if (!activeNode || !activeNode.runeName) return;
		const oldSource = activeNode.source;
		// Rebuild the nested rune's source with new attributes
		const attrStr = serializeAttributes(attrs);
		let newSource: string;
		if (activeNode.selfClosing) {
			newSource = `{% ${activeNode.runeName}${attrStr} /%}`;
		} else {
			const inner = (activeNode.innerContent ?? '').trim();
			newSource = inner
				? `{% ${activeNode.runeName}${attrStr} %}\n${inner}\n{% /${activeNode.runeName} %}`
				: `{% ${activeNode.runeName}${attrStr} %}\n\n{% /${activeNode.runeName} %}`;
		}
		// Replace in the top-level block's inner content
		const rb = block as RuneBlock;
		const newInner = replaceNodeSource(rb.innerContent, oldSource, newSource);
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);
		onupdate(updated);
	}

	/** Handle inner content changes for a nested rune node */
	function handleNestedContentChange(content: string) {
		if (!activeNode || !activeNode.runeName) return;
		const oldSource = activeNode.source;
		const attrStr = serializeAttributes(activeNode.attributes ?? {});
		const inner = content.trim();
		const newSource = inner
			? `{% ${activeNode.runeName}${attrStr} %}\n${inner}\n{% /${activeNode.runeName} %}`
			: `{% ${activeNode.runeName}${attrStr} %}\n\n{% /${activeNode.runeName} %}`;
		const rb = block as RuneBlock;
		const newInner = replaceNodeSource(rb.innerContent, oldSource, newSource);
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
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

	// ── Nested content node edit handlers ────────────────────────

	/** Replace a nested content node's source within the parent rune's inner content */
	function replaceNestedSource(newSource: string) {
		if (!activeNode) return;
		const rb = block as RuneBlock;
		const newInner = replaceNodeSource(rb.innerContent, activeNode.source, newSource);
		const updated: RuneBlock = { ...rb, innerContent: newInner, source: '' };
		updated.source = rebuildRuneSource(updated);
		onupdate(updated);
	}

	function handleNestedHeadingLevelChange(level: number) {
		if (!activeNode) return;
		replaceNestedSource(`${'#'.repeat(level)} ${activeNode.headingText ?? ''}`);
	}

	function handleNestedHeadingTextChange(text: string) {
		if (!activeNode) return;
		replaceNestedSource(`${'#'.repeat(activeNode.headingLevel ?? 1)} ${text}`);
	}

	function handleNestedFenceLangChange(lang: string) {
		if (!activeNode) return;
		const code = activeNode.fenceCode ?? '';
		replaceNestedSource(`\`\`\`${lang}\n${code}\n\`\`\``);
	}

	function handleNestedFenceCodeChange(code: string) {
		if (!activeNode) return;
		const lang = activeNode.fenceLanguage ?? '';
		replaceNestedSource(`\`\`\`${lang}\n${code}\n\`\`\``);
	}

	function handleNestedSourceChange(source: string) {
		replaceNestedSource(source);
	}

</script>

<div class="edit-panel">
	<div class="edit-panel__top">
		<div class="edit-panel__header">
			<span class="edit-panel__type">{headerLabel}</span>
			{#if !activeIsContent && category}
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

		{#if block.type === 'rune' && availableTabs.length > 1}
			<div class="edit-panel__tabs">
				{#each availableTabs as tab}
					<button
						type="button"
						class="edit-panel__tab"
						class:active={activeTab === tab}
						onclick={() => activeTab = tab}
					>
						{#if tab === 'settings'}
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="8" cy="8" r="2" />
								<path d="M6.7 1.6h2.6l.4 1.8.8.4 1.7-.7 1.8 1.8-.7 1.7.4.8 1.8.4v2.6l-1.8.4-.4.8.7 1.7-1.8 1.8-1.7-.7-.8.4-.4 1.8H6.7l-.4-1.8-.8-.4-1.7.7-1.8-1.8.7-1.7-.4-.8-1.8-.4V6.7l1.8-.4.4-.8-.7-1.7 1.8-1.8 1.7.7.8-.4z" />
							</svg>
							Settings
						{:else if tab === 'structure'}
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M2 3h4M2 7h4M6 11h4M6 15h4M4 3v8M8 11v4" />
							</svg>
							Structure
						{:else if tab === 'content'}
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M2 4h12M2 8h12M2 12h8" />
							</svg>
							Content
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if block.type === 'rune'}
		{@const rb = block as RuneBlock}

		<!-- Settings tab -->
		{#if activeTab === 'settings'}
			<div class="edit-panel__tab-panel">
				{#if activeIsContent && activeNode}
					{#if activeNode.type === 'heading'}
						<div class="edit-panel__field-group">
							<label class="edit-panel__field">
								<span class="edit-panel__field-label">Level</span>
								<select
									class="edit-panel__select"
									value={String(activeNode.headingLevel ?? 1)}
									onchange={(e) => handleNestedHeadingLevelChange(Number((e.target as HTMLSelectElement).value))}
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
									value={activeNode.headingText ?? ''}
									oninput={(e) => handleNestedHeadingTextChange((e.target as HTMLInputElement).value)}
								/>
							</label>
						</div>
					{:else if activeNode.type === 'fence'}
						<div class="edit-panel__field-group">
							<label class="edit-panel__field">
								<span class="edit-panel__field-label">Language</span>
								<input
									class="edit-panel__input"
									type="text"
									value={activeNode.fenceLanguage ?? ''}
									oninput={(e) => handleNestedFenceLangChange((e.target as HTMLInputElement).value)}
									placeholder="e.g. js, python, html"
								/>
							</label>
						</div>
					{:else}
						<div class="edit-panel__empty-tab">
							<span class="edit-panel__empty-tab-text">No settings for this element</span>
						</div>
					{/if}

				{:else if activeNode && activeRuneInfo}
					<RuneAttributes
						runeInfo={activeRuneInfo}
						attributes={activeNode.attributes ?? {}}
						onchange={handleNestedAttrsChange}
					/>

				{:else if !activeNode}
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
				{/if}
			</div>
		{/if}

		<!-- Structure tab -->
		{#if activeTab === 'structure'}
			<div class="edit-panel__tab-panel">
				{#if hasContentModel && resolvedStructure}
					<ContentModelTree
						structure={resolvedStructure}
						rootLabel={activeNode?.runeName ?? rb.runeName}
						onaddfield={handleAddField}
						onremovefield={handleRemoveField}
						onappenditem={handleAppendItem}
						onremovelistitem={handleRemoveListItem}
						onreorderlistitem={handleReorderListItem}
						oneditfield={handleEditField}
						onfieldselect={handleFieldSelect}
						{selectedField}
					/>
				{:else if !activeNode && hasNestedRunes}
					<ContentTree
						nodes={contentTree}
						{activePath}
						onselect={handleTreeSelect}
						rootLabel={rb.runeName}
						onrootclick={navigateToRoot}
						isRootActive={activePath.length === 0}
					/>
				{/if}
			</div>
		{/if}

		<!-- Content tab -->
		{#if activeTab === 'content' && !rb.selfClosing}
			<div class="edit-panel__tab-panel">
				{#if activeIsContent && activeNode}
					{#if activeNode.type === 'fence'}
						<div class="edit-panel__content-editor">
							<InlineEditor
								content={activeNode.fenceCode ?? ''}
								onchange={handleNestedFenceCodeChange}
								language={activeNode.fenceLanguage}
								{runes}
								aggregated={() => aggregated}
							/>
						</div>
					{:else if activeNode.type === 'paragraph'}
						<div class="edit-panel__content-editor">
							<InlineEditor
								content={activeNode.source}
								onchange={handleNestedSourceChange}
								{runes}
								aggregated={() => aggregated}
							/>
						</div>
					{:else if activeNode.type === 'heading'}
						<div class="edit-panel__empty-tab">
							<span class="edit-panel__empty-tab-text">Edit heading text in Settings</span>
						</div>
					{:else}
						<div class="edit-panel__field-group">
							<label class="edit-panel__field">
								<span class="edit-panel__field-label">Source</span>
								<textarea
									class="edit-panel__textarea"
									value={activeNode.source}
									oninput={(e) => handleNestedSourceChange((e.target as HTMLTextAreaElement).value)}
									rows={Math.max(4, activeNode.source.split('\n').length)}
								></textarea>
							</label>
						</div>
					{/if}

				{:else if activeNode && activeRuneInfo}
					{#if !activeNode.selfClosing && activeNode.innerContent !== undefined}
						<div class="edit-panel__content-editor">
							<InlineEditor
								content={activeNode.innerContent}
								onchange={handleNestedContentChange}
								{runes}
								aggregated={() => aggregated}
							/>
						</div>
					{:else}
						<div class="edit-panel__empty-tab">
							<span class="edit-panel__empty-tab-text">This rune has no inner content</span>
						</div>
					{/if}

				{:else if !activeNode}
					<div class="edit-panel__content-editor">
						<InlineEditor
							content={rb.innerContent}
							onchange={handleRuneContentChange}
							{runes}
							aggregated={() => aggregated}
						/>
					</div>
				{/if}
			</div>
		{/if}

	{:else}
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
						aggregated={() => aggregated}
					/>
				</div>

			{:else if block.type === 'paragraph'}
				<div class="edit-panel__content-editor">
					<InlineEditor
						content={block.source}
						onchange={handleSourceChange}
						{runes}
						aggregated={() => aggregated}
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
	{/if}
</div>

<style>
	.edit-panel {
		display: flex;
		flex-direction: column;
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
		padding: var(--ed-space-5);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-5);
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
		margin-left: calc(-1 * var(--ed-space-5));
		margin-right: calc(-1 * var(--ed-space-5));
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
		padding: var(--ed-space-5);
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-5);
	}

	/* Empty tab state */
	.edit-panel__empty-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--ed-space-8) var(--ed-space-4);
	}

	.edit-panel__empty-tab-text {
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		font-style: italic;
	}
</style>
