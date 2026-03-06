<script lang="ts">
	import type { RuneInfo } from '../api/client.js';

	interface Props {
		runes: RuneInfo[];
		runesByCategory: Map<string, RuneInfo[]>;
		oninsert: (type: 'heading' | 'paragraph' | 'fence' | 'hr' | 'rune', runeName?: string) => void;
		onclose: () => void;
	}

	let { runes, runesByCategory, oninsert, onclose }: Props = $props();

	// Preferred tab order
	const TAB_ORDER = ['Content', 'Section', 'Layout', 'Code & Data', 'Semantic', 'Design', 'Site'];

	let activeTab = $state('Content');
	let search = $state('');
	let dialogEl: HTMLDialogElement;
	let searchEl: HTMLInputElement;

	// Sorted category names following TAB_ORDER
	let categories = $derived.by(() => {
		const present = new Set(runesByCategory.keys());
		const ordered = TAB_ORDER.filter(c => present.has(c));
		// Append any categories not in TAB_ORDER
		for (const c of present) {
			if (!ordered.includes(c)) ordered.push(c);
		}
		return ordered;
	});

	// Filtered runes when searching
	let searchResults = $derived.by(() => {
		if (!search.trim()) return null;
		const q = search.toLowerCase();
		return runes.filter(r =>
			r.name.toLowerCase().includes(q) ||
			(r.description && r.description.toLowerCase().includes(q))
		);
	});

	// Standard content blocks (shown in Content tab)
	const standardBlocks = [
		{ type: 'heading' as const, name: 'Heading', description: 'Section heading', icon: 'M3 3v10M13 3v10M3 8h10' },
		{ type: 'paragraph' as const, name: 'Paragraph', description: 'Body text', icon: 'M2 4h12M2 8h12M2 12h8' },
		{ type: 'fence' as const, name: 'Code Block', description: 'Fenced code', icon: 'M5 4L2 8l3 4M11 4l3 4-3 4' },
		{ type: 'hr' as const, name: 'Divider', description: 'Horizontal rule', icon: 'M2 8h12' },
	];

	$effect(() => {
		dialogEl?.showModal();
		// Focus search on open
		searchEl?.focus();
	});

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) onclose();
	}

	function handleInsertStandard(type: 'heading' | 'paragraph' | 'fence' | 'hr') {
		oninsert(type);
	}

	function handleInsertRune(name: string) {
		oninsert('rune', name);
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="insert-dialog"
	onclose={onclose}
	onclick={handleBackdropClick}
	onkeydown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onclose(); } }}
>
	<div class="insert-dialog__inner">
		<!-- Header -->
		<div class="insert-dialog__header">
			<h2 class="insert-dialog__title">Insert Block</h2>
			<div class="insert-dialog__search-wrap">
				<svg class="insert-dialog__search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
					<circle cx="7" cy="7" r="4.5" />
					<path d="M10.5 10.5L14 14" />
				</svg>
				<input
					bind:this={searchEl}
					class="insert-dialog__search"
					type="text"
					placeholder="Search blocks..."
					bind:value={search}
				/>
			</div>
			<button class="insert-dialog__close" onclick={onclose}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
		</div>

		<!-- Tabs -->
		{#if !searchResults}
			<div class="insert-dialog__tabs">
				{#each categories as category}
					<button
						type="button"
						class="insert-dialog__tab"
						class:active={activeTab === category}
						onclick={() => activeTab = category}
					>
						{category}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Body -->
		<div class="insert-dialog__body">
			{#if searchResults}
				<!-- Search results -->
				{#if searchResults.length === 0}
					<div class="insert-dialog__empty">No blocks match "{search}"</div>
				{:else}
					<div class="insert-dialog__grid">
						{#each searchResults as rune}
							<button
								class="insert-dialog__btn insert-dialog__btn--rune"
								onclick={() => handleInsertRune(rune.name)}
							>
								<span class="insert-dialog__rune-dot"></span>
								<span class="insert-dialog__rune-info">
									<span class="insert-dialog__rune-name">{rune.name}</span>
									{#if rune.description}
										<span class="insert-dialog__rune-desc">{rune.description}</span>
									{/if}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<!-- Tab content -->
				<div class="insert-dialog__grid">
					{#if activeTab === 'Content'}
						<!-- Standard blocks first -->
						{#each standardBlocks as block}
							<button
								class="insert-dialog__btn"
								onclick={() => handleInsertStandard(block.type)}
							>
								<svg class="insert-dialog__btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
									<path d={block.icon} />
								</svg>
								<span class="insert-dialog__btn-info">
									<span class="insert-dialog__btn-name">{block.name}</span>
									<span class="insert-dialog__btn-desc">{block.description}</span>
								</span>
							</button>
						{/each}
					{/if}
					<!-- Runes for active category -->
					{#each runesByCategory.get(activeTab) ?? [] as rune}
						<button
							class="insert-dialog__btn insert-dialog__btn--rune"
							onclick={() => handleInsertRune(rune.name)}
						>
							<span class="insert-dialog__rune-dot"></span>
							<span class="insert-dialog__rune-info">
								<span class="insert-dialog__rune-name">{rune.name}</span>
								{#if rune.description}
									<span class="insert-dialog__rune-desc">{rune.description}</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</dialog>

<style>
	.insert-dialog {
		border: none;
		border-radius: var(--ed-radius-lg, 12px);
		background: var(--ed-surface-0);
		box-shadow: var(--ed-shadow-lg);
		padding: 0;
		margin: auto;
		width: 960px;
		max-width: calc(100vw - 2rem);
		height: min(600px, calc(100vh - 4rem));
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: dialog-enter 0.15s ease-out;
	}

	.insert-dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(2px);
		animation: backdrop-fade 0.15s ease-out;
	}

	@keyframes dialog-enter {
		from { opacity: 0; transform: translateY(8px) scale(0.98); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}

	@keyframes backdrop-fade {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.insert-dialog__inner {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
	}

	/* Header */
	.insert-dialog__header {
		display: flex;
		align-items: center;
		gap: var(--ed-space-3);
		padding: var(--ed-space-3) var(--ed-space-4);
		border-bottom: 1px solid var(--ed-border-subtle);
		flex-shrink: 0;
	}

	.insert-dialog__title {
		font-size: var(--ed-text-md);
		font-weight: 600;
		color: var(--ed-text-primary);
		margin: 0;
		white-space: nowrap;
	}

	.insert-dialog__search-wrap {
		flex: 1;
		position: relative;
		max-width: 240px;
		margin-left: auto;
	}

	.insert-dialog__search-icon {
		position: absolute;
		left: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--ed-text-muted);
		pointer-events: none;
	}

	.insert-dialog__search {
		width: 100%;
		padding: var(--ed-space-1) var(--ed-space-2) var(--ed-space-1) 1.8rem;
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-sm);
		color: var(--ed-text-primary);
		background: var(--ed-surface-1);
		outline: none;
	}

	.insert-dialog__search:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.insert-dialog__close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--ed-radius-sm);
		background: transparent;
		color: var(--ed-text-muted);
		cursor: pointer;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.insert-dialog__close:hover {
		background: var(--ed-surface-2);
		color: var(--ed-text-secondary);
	}

	/* Tabs */
	.insert-dialog__tabs {
		display: flex;
		gap: 2px;
		padding: var(--ed-space-2) var(--ed-space-4);
		border-bottom: 1px solid var(--ed-border-subtle);
		background: var(--ed-surface-1);
		flex-shrink: 0;
		overflow-x: auto;
	}

	.insert-dialog__tab {
		padding: 0.3rem 0.7rem;
		border: none;
		background: transparent;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--ed-radius-sm);
		white-space: nowrap;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.insert-dialog__tab:hover {
		color: var(--ed-text-secondary);
		background: var(--ed-surface-2);
	}

	.insert-dialog__tab.active {
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	/* Body */
	.insert-dialog__body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: var(--ed-space-4);
	}

	.insert-dialog__empty {
		text-align: center;
		padding: 2rem;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
	}

	/* Grid */
	.insert-dialog__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.4rem;
	}

	/* Block buttons */
	.insert-dialog__btn {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		text-align: left;
		transition: background var(--ed-transition-fast), border-color var(--ed-transition-fast);
	}

	.insert-dialog__btn:hover {
		background: var(--ed-accent-muted);
		border-color: var(--ed-accent);
		color: var(--ed-heading);
	}

	.insert-dialog__btn-icon {
		flex-shrink: 0;
		opacity: 0.6;
		margin-top: 0.15rem;
	}

	.insert-dialog__btn-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.insert-dialog__btn-name {
		font-weight: 500;
	}

	.insert-dialog__btn-desc {
		font-size: 10px;
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Rune buttons */
	.insert-dialog__rune-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ed-warning);
		flex-shrink: 0;
		margin-top: 0.35rem;
	}

	.insert-dialog__rune-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.insert-dialog__rune-name {
		font-weight: 500;
	}

	.insert-dialog__rune-desc {
		font-size: 10px;
		color: var(--ed-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.insert-dialog__btn--rune:hover {
		background: var(--ed-warning-subtle);
		border-color: var(--ed-warning);
	}
</style>
