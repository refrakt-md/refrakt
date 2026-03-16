<script lang="ts">
	import type { ResolvedStructure, ResolvedField, ResolvedZone } from '../editor/content-model-resolver.js';
	import type { ContentNode } from '../editor/block-parser.js';

	interface Props {
		structure: ResolvedStructure;
		rootLabel: string;
		onaddfield: (fieldName: string, zoneName?: string) => void;
		onremovefield: (fieldName: string, zoneName?: string) => void;
		onfieldselect: (fieldName: string, zoneName?: string) => void;
		selectedField?: string | null;
	}

	let {
		structure,
		rootLabel,
		onaddfield,
		onremovefield,
		onfieldselect,
		selectedField = null,
	}: Props = $props();

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

	/** Generate a preview string for matched content */
	function contentPreview(nodes: ContentNode[]): string[] {
		const previews: string[] = [];
		for (const node of nodes) {
			if (node.type === 'heading' && node.headingText) {
				previews.push(node.headingText);
			} else if (node.type === 'paragraph') {
				const text = node.source.replace(/\n/g, ' ').trim();
				previews.push(text.length > 60 ? text.slice(0, 57) + '...' : text);
			} else if (node.type === 'rune' && node.runeName) {
				previews.push(node.runeName);
			} else if (node.type === 'fence') {
				const lang = node.fenceLanguage ? `[${node.fenceLanguage}]` : '[code]';
				previews.push(lang);
			} else if (node.type === 'list') {
				// Show abbreviated list items from source
				const items = node.source.split('\n')
					.filter(l => l.match(/^[-*\d.]\s/))
					.map(l => l.replace(/^[-*\d.]+\s+/, '').trim())
					.filter(Boolean);
				for (const item of items.slice(0, 3)) {
					previews.push(item.length > 50 ? item.slice(0, 47) + '...' : item);
				}
				if (items.length > 3) previews.push(`... +${items.length - 3} more`);
			} else if (node.type === 'image') {
				previews.push('[image]');
			} else {
				const text = node.source.replace(/\n/g, ' ').trim();
				if (text) previews.push(text.length > 50 ? text.slice(0, 47) + '...' : text);
			}
		}
		return previews;
	}
</script>

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
				{#if field.filled && previews.length > 0}
					<div class="cm-tree__previews">
						{#each previews as preview}
							<div class="cm-tree__preview-line">{preview}</div>
						{/each}
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
						{#if field.filled && previews.length > 0}
							<div class="cm-tree__previews">
								{#each previews as preview}
									<div class="cm-tree__preview-line">{preview}</div>
								{/each}
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

	/* Description fallback for sections/custom */
	.cm-tree__description {
		padding: 0.5rem 1.2rem;
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		font-style: italic;
	}
</style>
