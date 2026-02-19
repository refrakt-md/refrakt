<script lang="ts">
	import SafeRenderer from './SafeRenderer.svelte';
	import SourceEditor from './SourceEditor.svelte';
	import RefinePanel from './RefinePanel.svelte';
	import type { PageStore } from './page.svelte.js';

	interface Props {
		pageStore: PageStore;
		mode: string;
		model?: string;
	}

	let { pageStore, mode, model }: Props = $props();

	let dragPinId: string | null = $state(null);
	let dragOverIndex: number | null = $state(null);
	let editingPinId: string | null = $state(null);
	let refiningPinId: string | null = $state(null);

	function handleDragStart(e: DragEvent, pinId: string) {
		dragPinId = pinId;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (dragPinId) {
			pageStore.reorder(dragPinId, targetIndex);
		}
		dragPinId = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		dragPinId = null;
		dragOverIndex = null;
	}

	function toggleEdit(pinId: string) {
		if (refiningPinId) refiningPinId = null;
		editingPinId = editingPinId === pinId ? null : pinId;
	}

	function toggleRefine(pinId: string) {
		if (editingPinId) editingPinId = null;
		refiningPinId = refiningPinId === pinId ? null : pinId;
	}

	function handleRefineAccept(pinId: string, newSource: string) {
		pageStore.replaceBlockSource(pinId, newSource);
		refiningPinId = null;
	}

	function handleRefineKeepBoth(pinId: string, newSource: string) {
		const pin = pageStore.page.pins.find((p) => p.id === pinId);
		if (pin) {
			pageStore.insertPinAfter(pinId, newSource, pin.label, pin.type);
		}
		refiningPinId = null;
	}

	function handleRefineDiscard() {
		refiningPinId = null;
	}
</script>

<aside class="page-panel">
	<div class="page-panel__header">
		<h2 class="page-panel__title">Page</h2>
		<button class="page-panel__close" onclick={() => pageStore.close()} title="Close page panel">
			&times;
		</button>
	</div>

	{#if pageStore.page.pins.length === 0}
		<div class="page-panel__empty">
			<p>Pin blocks from AI responses to build your page.</p>
		</div>
	{:else}
		<div class="page-panel__meta">
			<input
				type="text"
				class="page-panel__meta-input"
				placeholder="Page title"
				value={pageStore.page.title}
				oninput={(e) => pageStore.updateMeta(e.currentTarget.value, pageStore.page.description)}
			/>
			<textarea
				class="page-panel__meta-textarea"
				placeholder="Description (optional)"
				rows="2"
				value={pageStore.page.description}
				oninput={(e) => pageStore.updateMeta(pageStore.page.title, e.currentTarget.value)}
			></textarea>
		</div>

		<ol class="page-panel__pins" role="list" aria-label="Pinned blocks">
			{#each pageStore.page.pins as pin, i (pin.id)}
				<li
					class="pin-item"
					class:pin-item--dragging={dragPinId === pin.id}
					class:pin-item--drag-over={dragOverIndex === i && dragPinId !== pin.id}
					class:pin-item--editing={editingPinId === pin.id}
					class:pin-item--refining={refiningPinId === pin.id}
					draggable={editingPinId !== pin.id && refiningPinId !== pin.id ? 'true' : 'false'}
					ondragstart={(e) => handleDragStart(e, pin.id)}
					ondragover={(e) => handleDragOver(e, i)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, i)}
					ondragend={handleDragEnd}
					role="listitem"
				>
					<div class="pin-item__handle" title="Drag to reorder">
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
							<circle cx="4" cy="3" r="1" fill="currentColor"/>
							<circle cx="8" cy="3" r="1" fill="currentColor"/>
							<circle cx="4" cy="6" r="1" fill="currentColor"/>
							<circle cx="8" cy="6" r="1" fill="currentColor"/>
							<circle cx="4" cy="9" r="1" fill="currentColor"/>
							<circle cx="8" cy="9" r="1" fill="currentColor"/>
						</svg>
					</div>
					<div class="pin-item__content">
						{#if pin.isEdited}
							<span class="pin-item__edited-badge">edited</span>
						{/if}

						{#if editingPinId === pin.id}
							<SourceEditor
								source={pageStore.getBlockSource(pin.id)}
								onchange={(s) => pageStore.updateBlockSource(pin.id, s)}
								onclose={() => editingPinId = null}
							/>
						{:else}
							<SafeRenderer node={pin.snapshot} inProgressBlocks={[]} />
						{/if}

						{#if refiningPinId === pin.id}
							<RefinePanel
								pinId={pin.id}
								currentSource={pageStore.getBlockSource(pin.id)}
								{mode}
								{model}
								onaccept={(src) => handleRefineAccept(pin.id, src)}
								onkeepboth={(src) => handleRefineKeepBoth(pin.id, src)}
								ondiscard={handleRefineDiscard}
							/>
						{/if}
					</div>
					<div class="pin-item__actions">
						{#if pin.source}
							<button
								class="pin-item__action-btn"
								onclick={() => toggleEdit(pin.id)}
								title={editingPinId === pin.id ? 'Close editor' : 'Edit source'}
								disabled={refiningPinId === pin.id}
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
									<path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
								</svg>
							</button>
							<button
								class="pin-item__action-btn pin-item__action-btn--refine"
								onclick={() => toggleRefine(pin.id)}
								title={refiningPinId === pin.id ? 'Close refine' : 'Refine with AI'}
								disabled={editingPinId === pin.id}
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
									<path d="M8 2l1.5 3L13 6.5 9.5 8 8 14l-1.5-6L3 6.5 6.5 5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
								</svg>
							</button>
						{/if}
						{#if pin.isEdited}
							<button
								class="pin-item__action-btn pin-item__action-btn--revert"
								onclick={() => pageStore.revertBlockSource(pin.id)}
								title="Revert to original"
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
									<path d="M2 6h8a4 4 0 010 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M5 3L2 6l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
						{/if}
						<button
							class="pin-item__action-btn pin-item__action-btn--remove"
							onclick={() => pageStore.unpin(pin.id)}
							title="Remove from page"
						>
							&times;
						</button>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</aside>

<style>
	.page-panel {
		flex: 1;
		min-width: 480px;
		max-width: 1280px;
		background: #ffffff;
		border-left: 1px solid var(--rf-color-border, #e2e8f0);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	@media (min-width: 1200px) {
		.page-panel {
			margin: 1.5rem;
			margin-left: auto;
			border-left: none;
			border: 1px solid var(--rf-color-border, #e2e8f0);
			border-radius: 1rem;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
		}
	}

	.page-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
	}

	.page-panel__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.page-panel__close {
		background: transparent;
		border: none;
		font-size: 1.25rem;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		line-height: 1;
	}

	.page-panel__close:hover {
		color: var(--rf-color-text, #1e293b);
		background: var(--rf-color-border, #e2e8f0);
	}

	.page-panel__empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		text-align: center;
		color: var(--rf-color-text-muted, #94a3b8);
		font-size: 0.875rem;
	}

	.page-panel__meta {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.page-panel__meta-input,
	.page-panel__meta-textarea {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--rf-color-border, #e2e8f0);
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-family: inherit;
		background: transparent;
		color: inherit;
		resize: none;
	}

	.page-panel__meta-input:focus,
	.page-panel__meta-textarea:focus {
		outline: none;
		border-color: var(--rf-color-primary, #0ea5e9);
	}

	.page-panel__meta-input {
		font-weight: 600;
	}

	.page-panel__pins {
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
		overflow-y: auto;
	}

	.pin-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--rf-color-border, #e2e8f0);
		position: relative;
		transition: opacity 0.15s, background 0.15s;
	}

	.pin-item--dragging {
		opacity: 0.4;
	}

	.pin-item--drag-over {
		background: var(--rf-color-primary-50, #f0f9ff);
		border-top: 2px solid var(--rf-color-primary, #0ea5e9);
	}

	.pin-item--editing,
	.pin-item--refining {
		background: var(--rf-color-surface-alt, #f8fafc);
	}

	.pin-item__handle {
		flex-shrink: 0;
		cursor: grab;
		color: var(--rf-color-text-muted, #94a3b8);
		padding: 0.25rem 0.125rem;
		margin-top: 0.125rem;
	}

	.pin-item__handle:active {
		cursor: grabbing;
	}

	.pin-item__content {
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.pin-item__edited-badge {
		display: inline-block;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-primary-50, #f0f9ff);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		margin-bottom: 0.375rem;
	}

	.pin-item__actions {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.1s;
	}

	.pin-item:hover .pin-item__actions,
	.pin-item--editing .pin-item__actions,
	.pin-item--refining .pin-item__actions {
		opacity: 1;
	}

	.pin-item__action-btn {
		background: transparent;
		border: none;
		color: var(--rf-color-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.1s, background 0.1s;
	}

	.pin-item__action-btn:hover {
		color: var(--rf-color-text, #1e293b);
		background: var(--rf-color-border, #e2e8f0);
	}

	.pin-item__action-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.pin-item__action-btn:disabled:hover {
		color: var(--rf-color-text-muted, #94a3b8);
		background: transparent;
	}

	.pin-item__action-btn--refine:hover {
		color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-primary-50, #f0f9ff);
	}

	.pin-item__action-btn--revert:hover {
		color: var(--rf-color-primary, #0ea5e9);
		background: var(--rf-color-primary-50, #f0f9ff);
	}

	.pin-item__action-btn--remove {
		font-size: 1rem;
	}

	.pin-item__action-btn--remove:hover {
		color: var(--rf-color-danger-700, #b91c1c);
		background: var(--rf-color-danger-50, #fef2f2);
	}

	@media (max-width: 768px) {
		.page-panel {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			min-width: 0;
			z-index: 100;
		}

		.pin-item__actions {
			opacity: 1;
		}
	}
</style>
