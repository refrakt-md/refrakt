<script lang="ts">
	import type { ResolvedStructure, ResolvedField, ResolvedZone } from '../editor/content-model-resolver.js';
	import type { ContentNode } from '../editor/block-parser.js';
	import { splitListItems } from '../editor/block-parser.js';

	interface PreviewItem {
		text: string;
		type: 'text' | 'rune';
		/** Index within field.nodes — used for rune navigation and greedy field editing */
		nodeIndex?: number;
	}

	interface Props {
		structure: ResolvedStructure;
		rootLabel: string;
		onaddfield: (fieldName: string, zoneName?: string) => void;
		onremovefield: (fieldName: string, zoneName?: string) => void;
		onappenditem: (fieldName: string, zoneName?: string) => void;
		onremovelistitem: (fieldName: string, itemIndex: number, zoneName?: string) => void;
		onreorderlistitem: (fieldName: string, fromIndex: number, toIndex: number, zoneName?: string) => void;
		oneditfield: (fieldName: string, rect: DOMRect, zoneName?: string, nodeIndex?: number) => void;
		oneditlistitem: (fieldName: string, itemIndex: number, rect: DOMRect, zoneName?: string) => void;
		onnavigaterune: (fieldName: string, nodeIndex: number, zoneName?: string) => void;
		onfieldselect: (fieldName: string, zoneName?: string) => void;
		selectedField?: string | null;
	}

	let {
		structure,
		rootLabel,
		onaddfield,
		onremovefield,
		onappenditem,
		onremovelistitem,
		onreorderlistitem,
		oneditfield,
		oneditlistitem,
		onnavigaterune,
		onfieldselect,
		selectedField = null,
	}: Props = $props();

	// ── Drag and drop state ──────────────────────────────────────
	let dragFieldName: string | null = $state(null);
	let dragZoneName: string | undefined = $state(undefined);
	let dragFromIndex: number | null = $state(null);
	let dragOverIndex: number | null = $state(null);

	function handleItemDragStart(e: DragEvent, fieldName: string, index: number, zoneName?: string) {
		dragFieldName = fieldName;
		dragZoneName = zoneName;
		dragFromIndex = index;
		dragOverIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleItemDragOver(e: DragEvent, index: number) {
		if (dragFromIndex === null) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function handleItemDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (dragFromIndex !== null && dragFromIndex !== index && dragFieldName !== null) {
			onreorderlistitem(dragFieldName, dragFromIndex, index, dragZoneName);
		}
		dragFieldName = null;
		dragZoneName = undefined;
		dragFromIndex = null;
		dragOverIndex = null;
	}

	function handleItemDragEnd() {
		dragFieldName = null;
		dragZoneName = undefined;
		dragFromIndex = null;
		dragOverIndex = null;
	}

	function isListField(match: string): boolean {
		return match === 'list' || match.startsWith('list:');
	}

	function isGreedyItemField(field: ResolvedField): boolean {
		return field.greedy && field.filled && field.match !== 'any';
	}

	/** Extract individual items from a greedy field for per-item rendering */
	function greedyItemPreviews(field: ResolvedField): { text: string; index: number }[] {
		return field.nodes.map((node, i) => {
			let text: string;
			if (node.type === 'fence') {
				text = node.fenceLanguage ? `[${node.fenceLanguage}]` : '[code]';
			} else if (node.type === 'heading' && node.headingText) {
				text = node.headingText;
			} else if (node.type === 'rune' && node.runeName) {
				text = node.runeName;
			} else if (node.type === 'image') {
				text = '[image]';
			} else {
				const raw = node.source.replace(/\n/g, ' ').trim();
				text = raw.length > 50 ? raw.slice(0, 47) + '...' : raw;
			}
			return { text: text.length > 50 ? text.slice(0, 47) + '...' : text, index: i };
		});
	}

	/** Icon SVG path for a match type */
	function matchIcon(match: string): string {
		// Take first alternative for pipe-separated matches
		const primary = match.includes('|') ? match.split('|')[0] : match;
		switch (primary) {
			case 'heading':
			case 'heading:1': case 'heading:2': case 'heading:3':
			case 'heading:4': case 'heading:5': case 'heading:6':
				return 'M3 3v10M13 3v10M3 8h10';
			case 'paragraph':
				return 'M2 4h12M2 8h12M2 12h8';
			case 'fence':
				return 'M5 4L2 8l3 4M11 4l3 4-3 4';
			case 'list': case 'list:ordered': case 'list:unordered':
				return 'M4 4h10M4 8h10M4 12h10M2 4h0M2 8h0M2 12h0';
			case 'blockquote': case 'quote':
				return 'M4 4h8M4 7h6M1 3v8';
			case 'image':
				return 'M2 2h12v12H2zM5 5l-3 7h12l-4-5-2 2.5';
			case 'any':
				return 'M2 8h12M8 2v12';
			default:
				return 'M2 4h12M2 8h12M2 12h8';
		}
	}

	/** Extract individual list items with their indices for per-item rendering */
	function listItemPreviews(nodes: ContentNode[]): { text: string; index: number }[] {
		const result: { text: string; index: number }[] = [];
		for (const node of nodes) {
			if (node.type !== 'list') continue;
			const items = splitListItems(node.source);
			for (let i = 0; i < items.length; i++) {
				const firstLine = items[i].split('\n')[0];
				const text = firstLine.replace(/^[-*+]\s+|^\d+\.\s+/, '').trim();
				if (text) {
					result.push({ text: text.length > 50 ? text.slice(0, 47) + '...' : text, index: i });
				}
			}
		}
		return result;
	}

	/** Generate preview items for matched content */
	function contentPreview(nodes: ContentNode[]): PreviewItem[] {
		const previews: PreviewItem[] = [];
		for (let idx = 0; idx < nodes.length; idx++) {
			const node = nodes[idx];
			if (node.type === 'heading' && node.headingText) {
				previews.push({ text: node.headingText, type: 'text', nodeIndex: idx });
			} else if (node.type === 'paragraph') {
				const text = node.source.replace(/\n/g, ' ').trim();
				previews.push({ text: text.length > 60 ? text.slice(0, 57) + '...' : text, type: 'text', nodeIndex: idx });
			} else if (node.type === 'rune' && node.runeName) {
				previews.push({ text: node.runeName, type: 'rune', nodeIndex: idx });
			} else if (node.type === 'fence') {
				const lang = node.fenceLanguage ? `[${node.fenceLanguage}]` : '[code]';
				previews.push({ text: lang, type: 'text', nodeIndex: idx });
			} else if (node.type === 'list') {
				// Show abbreviated list items from source
				const items = node.source.split('\n')
					.filter(l => l.match(/^[-*\d.]\s/))
					.map(l => l.replace(/^[-*\d.]+\s+/, '').trim())
					.filter(Boolean);
				for (const item of items.slice(0, 3)) {
					previews.push({ text: item.length > 50 ? item.slice(0, 47) + '...' : item, type: 'text' });
				}
				if (items.length > 3) previews.push({ text: `... +${items.length - 3} more`, type: 'text' });
			} else if (node.type === 'image') {
				previews.push({ text: '[image]', type: 'text', nodeIndex: idx });
			} else {
				const text = node.source.replace(/\n/g, ' ').trim();
				if (text) previews.push({ text: text.length > 50 ? text.slice(0, 47) + '...' : text, type: 'text', nodeIndex: idx });
			}
		}
		return previews;
	}
</script>

{#snippet previewItems(previews: PreviewItem[], fieldName: string, zoneName?: string)}
	{#each previews as preview}
		{#if preview.type === 'rune' && preview.nodeIndex !== undefined}
			<button
				type="button"
				class="cm-tree__preview-line cm-tree__preview-line--rune"
				onclick={() => onnavigaterune(fieldName, preview.nodeIndex!, zoneName)}
			>
				<span class="cm-tree__rune-dot"></span>
				{preview.text}
			</button>
		{:else}
			<button
				type="button"
				class="cm-tree__preview-line cm-tree__preview-line--clickable"
				onclick={(e) => oneditfield(fieldName, (e.currentTarget as HTMLElement).getBoundingClientRect(), zoneName, preview.nodeIndex)}
			>
				{preview.text}
			</button>
		{/if}
	{/each}
{/snippet}

{#snippet listItemRows(listItems: { text: string; index: number }[], fieldName: string, zoneName?: string)}
	{#each listItems as item}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="cm-tree__preview-item"
			class:cm-tree__preview-item--drag-over={dragFieldName === fieldName && dragZoneName === zoneName && dragOverIndex === item.index && dragFromIndex !== item.index}
			class:cm-tree__preview-item--dragging={dragFieldName === fieldName && dragZoneName === zoneName && dragFromIndex === item.index}
			draggable="true"
			ondragstart={(e) => handleItemDragStart(e, fieldName, item.index, zoneName)}
			ondragover={(e) => handleItemDragOver(e, item.index)}
			ondrop={(e) => handleItemDrop(e, item.index)}
			ondragend={handleItemDragEnd}
		>
			<span
				class="cm-tree__preview-grip"
				title="Drag to reorder"
			>
				<svg width="6" height="10" viewBox="0 0 6 10" fill="none">
					<circle cx="1.5" cy="1.5" r="1" fill="currentColor"/>
					<circle cx="4.5" cy="1.5" r="1" fill="currentColor"/>
					<circle cx="1.5" cy="5" r="1" fill="currentColor"/>
					<circle cx="4.5" cy="5" r="1" fill="currentColor"/>
					<circle cx="1.5" cy="8.5" r="1" fill="currentColor"/>
					<circle cx="4.5" cy="8.5" r="1" fill="currentColor"/>
				</svg>
			</span>
			<button
				type="button"
				class="cm-tree__preview-text cm-tree__preview-text--clickable"
				onclick={(e) => {
					e.stopPropagation();
					oneditlistitem(fieldName, item.index, (e.currentTarget as HTMLElement).getBoundingClientRect(), zoneName);
				}}
			>
				{item.text}
			</button>
			<button
				type="button"
				class="cm-tree__preview-remove"
				title="Remove item"
				onclick={() => onremovelistitem(fieldName, item.index, zoneName)}
			>
				<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="4" y1="4" x2="12" y2="12" />
					<line x1="12" y1="4" x2="4" y2="12" />
				</svg>
			</button>
		</div>
	{/each}
{/snippet}

{#snippet greedyItemRows(items: { text: string; index: number }[], fieldName: string, zoneName?: string)}
	{#each items as item}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="cm-tree__preview-item"
			class:cm-tree__preview-item--drag-over={dragFieldName === fieldName && dragZoneName === zoneName && dragOverIndex === item.index && dragFromIndex !== item.index}
			class:cm-tree__preview-item--dragging={dragFieldName === fieldName && dragZoneName === zoneName && dragFromIndex === item.index}
			draggable="true"
			ondragstart={(e) => handleItemDragStart(e, fieldName, item.index, zoneName)}
			ondragover={(e) => handleItemDragOver(e, item.index)}
			ondrop={(e) => handleItemDrop(e, item.index)}
			ondragend={handleItemDragEnd}
		>
			<span
				class="cm-tree__preview-grip"
				title="Drag to reorder"
			>
				<svg width="6" height="10" viewBox="0 0 6 10" fill="none">
					<circle cx="1.5" cy="1.5" r="1" fill="currentColor"/>
					<circle cx="4.5" cy="1.5" r="1" fill="currentColor"/>
					<circle cx="1.5" cy="5" r="1" fill="currentColor"/>
					<circle cx="4.5" cy="5" r="1" fill="currentColor"/>
					<circle cx="1.5" cy="8.5" r="1" fill="currentColor"/>
					<circle cx="4.5" cy="8.5" r="1" fill="currentColor"/>
				</svg>
			</span>
			<button
				type="button"
				class="cm-tree__preview-text cm-tree__preview-text--clickable"
				onclick={(e) => {
					e.stopPropagation();
					oneditfield(fieldName, (e.currentTarget as HTMLElement).getBoundingClientRect(), zoneName, item.index);
				}}
			>
				{item.text}
			</button>
			<button
				type="button"
				class="cm-tree__preview-remove"
				title="Remove item"
				onclick={() => onremovelistitem(fieldName, item.index, zoneName)}
			>
				<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="4" y1="4" x2="12" y2="12" />
					<line x1="12" y1="4" x2="4" y2="12" />
				</svg>
			</button>
		</div>
	{/each}
{/snippet}

<div class="cm-tree">
	<!-- Root node -->
	<div class="cm-tree__root">
		<span class="cm-tree__rune-dot"></span>
		<span class="cm-tree__root-label">{rootLabel}</span>
	</div>

	{#if structure.type === 'sequence'}
		<div class="cm-tree__fields">
			{#each structure.fields as field}
				{@const previews = contentPreview(field.nodes)}
				{@const listItems = isListField(field.match) ? listItemPreviews(field.nodes) : []}
				{@const greedyItems = isGreedyItemField(field) ? greedyItemPreviews(field) : []}
				<button
					type="button"
					class="cm-tree__field"
					class:cm-tree__field--filled={field.filled}
					class:cm-tree__field--empty={!field.filled}
					class:cm-tree__field--required={!field.optional && !field.filled}
					class:cm-tree__field--selected={selectedField === field.name}
					onclick={() => onfieldselect(field.name)}
				>
					<svg class="cm-tree__field-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d={matchIcon(field.match)} />
					</svg>
					<span class="cm-tree__field-name">{field.name}</span>
					{#if !field.optional && !field.filled}
						<span class="cm-tree__required-badge">required</span>
					{/if}
					<span class="cm-tree__field-spacer"></span>
					{#if field.filled}
						{#if isListField(field.match) || isGreedyItemField(field)}
							<button
								type="button"
								class="cm-tree__action cm-tree__action--add"
								title="Add item to {field.name}"
								onclick={(e) => { e.stopPropagation(); onappenditem(field.name); }}
							>
								<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
									<line x1="8" y1="3" x2="8" y2="13" />
									<line x1="3" y1="8" x2="13" y2="8" />
								</svg>
							</button>
						{/if}
						<button
							type="button"
							class="cm-tree__action cm-tree__action--remove"
							title="Remove {field.name}"
							onclick={(e) => { e.stopPropagation(); onremovefield(field.name); }}
						>
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<polyline points="3 6 3 14 13 14 13 6" />
								<line x1="1" y1="4" x2="15" y2="4" />
								<line x1="6" y1="8" x2="6" y2="12" />
								<line x1="10" y1="8" x2="10" y2="12" />
							</svg>
						</button>
					{:else}
						<button
							type="button"
							class="cm-tree__action cm-tree__action--add"
							title="Add {field.name}"
							onclick={(e) => { e.stopPropagation(); onaddfield(field.name); }}
						>
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
								<line x1="8" y1="3" x2="8" y2="13" />
								<line x1="3" y1="8" x2="13" y2="8" />
							</svg>
						</button>
					{/if}
				</button>
				{#if field.filled && isListField(field.match) && listItems.length > 0}
					<div class="cm-tree__previews">
						{@render listItemRows(listItems, field.name)}
					</div>
				{:else if field.filled && greedyItems.length > 0}
					<div class="cm-tree__previews">
						{@render greedyItemRows(greedyItems, field.name)}
					</div>
				{:else if field.filled && previews.length > 0}
					<div class="cm-tree__previews">
						{@render previewItems(previews, field.name)}
					</div>
				{/if}
			{/each}
		</div>

	{:else if structure.type === 'delimited'}
		{#each structure.zones as zone, zoneIdx}
			{#if zoneIdx > 0}
				<div class="cm-tree__delimiter">
					<span class="cm-tree__delimiter-line"></span>
				</div>
			{/if}
			<div class="cm-tree__zone">
				<div class="cm-tree__zone-label">{zone.name}</div>
				<div class="cm-tree__fields">
					{#each zone.fields as field}
						{@const previews = contentPreview(field.nodes)}
						{@const listItems = isListField(field.match) ? listItemPreviews(field.nodes) : []}
						{@const greedyItems = isGreedyItemField(field) ? greedyItemPreviews(field) : []}
						<button
							type="button"
							class="cm-tree__field"
							class:cm-tree__field--filled={field.filled}
							class:cm-tree__field--empty={!field.filled}
							class:cm-tree__field--required={!field.optional && !field.filled}
							class:cm-tree__field--selected={selectedField === `${zone.name}.${field.name}`}
							onclick={() => onfieldselect(field.name, zone.name)}
						>
							<svg class="cm-tree__field-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d={matchIcon(field.match)} />
							</svg>
							<span class="cm-tree__field-name">{field.name}</span>
							{#if !field.optional && !field.filled}
								<span class="cm-tree__required-badge">required</span>
							{/if}
							<span class="cm-tree__field-spacer"></span>
							{#if field.filled}
								{#if isListField(field.match) || isGreedyItemField(field)}
									<button
										type="button"
										class="cm-tree__action cm-tree__action--add"
										title="Add item to {field.name}"
										onclick={(e) => { e.stopPropagation(); onappenditem(field.name, zone.name); }}
									>
										<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
											<line x1="8" y1="3" x2="8" y2="13" />
											<line x1="3" y1="8" x2="13" y2="8" />
										</svg>
									</button>
								{/if}
								<button
									type="button"
									class="cm-tree__action cm-tree__action--remove"
									title="Remove {field.name}"
									onclick={(e) => { e.stopPropagation(); onremovefield(field.name, zone.name); }}
								>
									<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="3 6 3 14 13 14 13 6" />
										<line x1="1" y1="4" x2="15" y2="4" />
										<line x1="6" y1="8" x2="6" y2="12" />
										<line x1="10" y1="8" x2="10" y2="12" />
									</svg>
								</button>
							{:else}
								<button
									type="button"
									class="cm-tree__action cm-tree__action--add"
									title="Add {field.name}"
									onclick={(e) => { e.stopPropagation(); onaddfield(field.name, zone.name); }}
								>
									<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
										<line x1="8" y1="3" x2="8" y2="13" />
										<line x1="3" y1="8" x2="13" y2="8" />
									</svg>
								</button>
							{/if}
						</button>
						{#if field.filled && isListField(field.match) && listItems.length > 0}
							<div class="cm-tree__previews">
								{@render listItemRows(listItems, field.name, zone.name)}
							</div>
						{:else if field.filled && greedyItems.length > 0}
							<div class="cm-tree__previews">
								{@render greedyItemRows(greedyItems, field.name, zone.name)}
							</div>
						{:else if field.filled && previews.length > 0}
							<div class="cm-tree__previews">
								{@render previewItems(previews, field.name, zone.name)}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}

	{:else if structure.type === 'sections' || structure.type === 'custom'}
		<div class="cm-tree__description">
			{structure.description}
		</div>
	{/if}
</div>

<style>
	.cm-tree {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.cm-tree__root {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.4rem;
		font-weight: 500;
		color: var(--ed-text-primary);
		font-size: var(--ed-text-base);
	}

	.cm-tree__rune-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ed-warning);
		flex-shrink: 0;
	}

	.cm-tree__root-label {
		font-weight: 600;
	}

	/* Zone */
	.cm-tree__zone {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.cm-tree__zone-label {
		padding: 0.2rem 0.4rem 0.15rem 1.2rem;
		font-size: var(--ed-text-xs);
		font-weight: 600;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.cm-tree__delimiter {
		display: flex;
		align-items: center;
		padding: 0.3rem 1.2rem;
	}

	.cm-tree__delimiter-line {
		flex: 1;
		height: 1px;
		background: var(--ed-border-subtle);
	}

	/* Fields */
	.cm-tree__fields {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.cm-tree__field {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		width: 100%;
		padding: 0.25rem 0.4rem 0.25rem 1.6rem;
		border: none;
		border-radius: calc(var(--ed-radius-sm, 4px) - 1px);
		background: transparent;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		text-align: left;
		transition: background var(--ed-transition-fast);
	}

	.cm-tree__field:hover {
		background: var(--ed-surface-2);
	}

	.cm-tree__field--selected {
		background: var(--ed-accent-muted);
		color: var(--ed-accent);
	}

	.cm-tree__field--empty {
		color: var(--ed-text-muted);
	}

	.cm-tree__field--required {
		color: var(--ed-warning-text);
	}

	.cm-tree__field-icon {
		flex-shrink: 0;
		opacity: 0.6;
	}

	.cm-tree__field--empty .cm-tree__field-icon {
		opacity: 0.3;
	}

	.cm-tree__field-name {
		font-weight: 500;
		white-space: nowrap;
	}

	.cm-tree__field--filled .cm-tree__field-name {
		color: var(--ed-text-primary);
	}

	.cm-tree__required-badge {
		font-size: 9px;
		font-weight: 600;
		padding: 0.05rem 0.3rem;
		border-radius: 99px;
		background: var(--ed-warning-subtle);
		color: var(--ed-warning-text);
		white-space: nowrap;
		line-height: 1.2;
	}

	.cm-tree__field-spacer {
		flex: 1;
	}

	/* Action buttons */
	.cm-tree__action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		border: none;
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-muted);
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--ed-transition-fast), color var(--ed-transition-fast), background var(--ed-transition-fast);
	}

	.cm-tree__field:hover .cm-tree__action {
		opacity: 1;
	}

	.cm-tree__action--add:hover {
		color: var(--ed-accent);
		background: var(--ed-accent-muted);
	}

	.cm-tree__action--remove:hover {
		color: var(--ed-danger);
		background: var(--ed-danger-subtle);
	}

	/* Content previews */
	.cm-tree__previews {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
		padding-left: 2.8rem;
		padding-bottom: 0.15rem;
	}

	.cm-tree__preview-line {
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.4;
	}

	.cm-tree__preview-line--clickable {
		display: block;
		width: 100%;
		background: none;
		border: none;
		padding: 0.05rem 0.25rem;
		cursor: pointer;
		text-align: left;
		font: inherit;
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		border-radius: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.4;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.cm-tree__preview-line--clickable:hover {
		background: var(--ed-surface-2);
		color: var(--ed-text-secondary);
	}

	.cm-tree__preview-line--rune {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		background: none;
		border: none;
		padding: 0.05rem 0.25rem;
		cursor: pointer;
		text-align: left;
		font: inherit;
		font-size: var(--ed-text-xs);
		color: var(--ed-warning-text);
		font-weight: 500;
		border-radius: 2px;
		line-height: 1.4;
		transition: background var(--ed-transition-fast);
	}

	.cm-tree__preview-line--rune:hover {
		background: var(--ed-warning-subtle);
	}

	.cm-tree__preview-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		line-height: 1.4;
		border-top: 2px solid transparent;
		transition: border-color var(--ed-transition-fast);
	}

	.cm-tree__preview-item--drag-over {
		border-top-color: var(--ed-accent);
	}

	.cm-tree__preview-item--dragging {
		opacity: 0.4;
	}

	.cm-tree__preview-text {
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.cm-tree__preview-text--clickable {
		background: none;
		border: none;
		padding: 0.05rem 0.15rem;
		cursor: pointer;
		font: inherit;
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		text-align: left;
		border-radius: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		transition: color var(--ed-transition-fast), background var(--ed-transition-fast);
	}

	.cm-tree__preview-text--clickable:hover {
		color: var(--ed-text-secondary);
		background: var(--ed-surface-2);
	}

	/* Drag grip handle */
	.cm-tree__preview-grip {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 16px;
		padding: 0;
		color: var(--ed-text-muted);
		cursor: grab;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.cm-tree__preview-item:hover .cm-tree__preview-grip {
		opacity: 0.6;
	}

	.cm-tree__preview-grip:hover {
		opacity: 1 !important;
		color: var(--ed-text-secondary);
	}

	.cm-tree__preview-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		border: none;
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-muted);
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity var(--ed-transition-fast), color var(--ed-transition-fast), background var(--ed-transition-fast);
	}

	.cm-tree__preview-item:hover .cm-tree__preview-remove {
		opacity: 1;
	}

	.cm-tree__preview-remove:hover {
		color: var(--ed-danger);
		background: var(--ed-danger-subtle);
	}

	/* Description fallback for sections/custom */
	.cm-tree__description {
		padding: 0.5rem 1.2rem;
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		font-style: italic;
	}
</style>
