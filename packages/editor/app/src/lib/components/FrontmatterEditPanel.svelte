<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import TagsInput from './TagsInput.svelte';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	const KNOWN_KEYS = new Set([
		'title', 'description', 'tags', 'draft', 'order', 'date', 'author', 'slug',
	]);

	let customKey = $state('');

	let customFields = $derived(
		Object.entries(editorState.frontmatter).filter(([k]) => !KNOWN_KEYS.has(k))
	);

	function updateField(key: string, value: unknown) {
		editorState.updateFrontmatterField(key, value);
	}

	function addCustomField() {
		const key = customKey.trim();
		if (!key || key in editorState.frontmatter) return;
		editorState.updateFrontmatterField(key, '');
		customKey = '';
	}

	function removeCustomField(key: string) {
		editorState.updateFrontmatterField(key, undefined);
	}
</script>

<div class="edit-panel">
	<div class="edit-panel__header">
		<span class="edit-panel__type">Frontmatter</span>
		<div class="edit-panel__spacer"></div>
		<button
			class="edit-panel__btn"
			onclick={onclose}
			title="Close panel"
		>&times;</button>
	</div>

	<div class="edit-panel__body">
		<div class="edit-panel__field-group">
			<!-- Title -->
			<label class="edit-panel__field">
				<span class="edit-panel__field-label">Title</span>
				<input
					class="edit-panel__input"
					type="text"
					value={editorState.frontmatter.title ?? ''}
					oninput={(e) => updateField('title', (e.target as HTMLInputElement).value)}
				/>
			</label>

			<!-- Description -->
			<label class="edit-panel__field">
				<span class="edit-panel__field-label">Description</span>
				<textarea
					class="edit-panel__textarea"
					value={editorState.frontmatter.description ?? ''}
					oninput={(e) => updateField('description', (e.target as HTMLTextAreaElement).value)}
					rows={2}
				></textarea>
			</label>

			<!-- Slug -->
			<label class="edit-panel__field">
				<span class="edit-panel__field-label">Slug</span>
				<input
					class="edit-panel__input"
					type="text"
					value={editorState.frontmatter.slug ?? ''}
					oninput={(e) => updateField('slug', (e.target as HTMLInputElement).value)}
					placeholder="auto-derived from filename"
				/>
			</label>

			<!-- Two-column row: Author + Date -->
			<div class="edit-panel__row">
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Author</span>
					<input
						class="edit-panel__input"
						type="text"
						value={editorState.frontmatter.author ?? ''}
						oninput={(e) => updateField('author', (e.target as HTMLInputElement).value)}
					/>
				</label>
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Date</span>
					<input
						class="edit-panel__input"
						type="date"
						value={editorState.frontmatter.date ?? ''}
						oninput={(e) => updateField('date', (e.target as HTMLInputElement).value)}
					/>
				</label>
			</div>

			<!-- Two-column row: Order + Draft -->
			<div class="edit-panel__row">
				<label class="edit-panel__field">
					<span class="edit-panel__field-label">Order</span>
					<input
						class="edit-panel__input"
						type="number"
						value={editorState.frontmatter.order ?? ''}
						oninput={(e) => {
							const val = (e.target as HTMLInputElement).value;
							updateField('order', val === '' ? undefined : Number(val));
						}}
					/>
				</label>
				<div class="edit-panel__field">
					<span class="edit-panel__field-label">Draft</span>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="fm-toggle"
						class:active={editorState.frontmatter.draft === true}
						onclick={() => updateField('draft', editorState.frontmatter.draft === true ? undefined : true)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateField('draft', editorState.frontmatter.draft === true ? undefined : true); } }}
						role="switch"
						aria-checked={editorState.frontmatter.draft === true}
						tabindex="0"
					>
						<div class="fm-toggle__track">
							<div class="fm-toggle__thumb"></div>
						</div>
						<span class="fm-toggle__label">{editorState.frontmatter.draft === true ? 'Draft' : 'Published'}</span>
					</div>
				</div>
			</div>

			<!-- Tags -->
			<div class="edit-panel__field">
				<span class="edit-panel__field-label">Tags</span>
				<TagsInput
					tags={editorState.frontmatter.tags ?? []}
					onchange={(tags) => updateField('tags', tags)}
				/>
			</div>

			<!-- Custom fields -->
			{#if customFields.length > 0}
				<div class="edit-panel__custom-section">
					<span class="edit-panel__section-label">Custom fields</span>
					{#each customFields as [key, value]}
						<div class="edit-panel__field">
							<span class="edit-panel__field-label">{key}</span>
							<div class="edit-panel__custom-row">
								<input
									class="edit-panel__input"
									type="text"
									value={String(value ?? '')}
									oninput={(e) => updateField(key, (e.target as HTMLInputElement).value)}
								/>
								<button
									class="edit-panel__remove-btn"
									onclick={() => removeCustomField(key)}
									aria-label="Remove {key}"
								>&times;</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Add custom field -->
			<div class="edit-panel__add-field">
				<input
					class="edit-panel__input"
					type="text"
					bind:value={customKey}
					placeholder="Field name"
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomField(); } }}
				/>
				<button
					class="edit-panel__add-btn"
					onclick={addCustomField}
					disabled={!customKey.trim()}
				>+ Add field</button>
			</div>
		</div>
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

	.edit-panel__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--ed-space-3);
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
		min-height: 3rem;
		width: 100%;
		box-sizing: border-box;
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.edit-panel__textarea:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	/* Toggle switch */
	.fm-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		padding-top: 0.2rem;
	}

	.fm-toggle__track {
		width: 32px;
		height: 18px;
		border-radius: 99px;
		background: var(--ed-surface-3);
		position: relative;
		transition: background var(--ed-transition-fast);
		flex-shrink: 0;
	}

	.fm-toggle.active .fm-toggle__track {
		background: var(--ed-accent);
	}

	.fm-toggle__thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--ed-surface-0);
		box-shadow: var(--ed-shadow-sm);
		position: absolute;
		top: 2px;
		left: 2px;
		transition: transform var(--ed-transition-fast);
	}

	.fm-toggle.active .fm-toggle__thumb {
		transform: translateX(14px);
	}

	.fm-toggle__label {
		font-size: var(--ed-text-sm);
		color: var(--ed-text-secondary);
	}

	/* Custom fields */
	.edit-panel__custom-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-top: var(--ed-space-1);
	}

	.edit-panel__section-label {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--ed-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.edit-panel__custom-row {
		display: flex;
		gap: 0.35rem;
	}

	.edit-panel__custom-row .edit-panel__input {
		flex: 1;
	}

	.edit-panel__remove-btn {
		background: none;
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		color: var(--ed-text-muted);
		cursor: pointer;
		padding: 0 0.4rem;
		font-size: 0.9rem;
		line-height: 1;
		transition: color var(--ed-transition-fast), border-color var(--ed-transition-fast);
	}

	.edit-panel__remove-btn:hover {
		color: var(--ed-danger);
		border-color: var(--ed-danger);
	}

	.edit-panel__add-field {
		display: flex;
		gap: 0.35rem;
		padding-top: var(--ed-space-1);
	}

	.edit-panel__add-field .edit-panel__input {
		flex: 1;
	}

	.edit-panel__add-btn {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		white-space: nowrap;
		transition: background var(--ed-transition-fast), border-color var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.edit-panel__add-btn:hover:not(:disabled) {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	.edit-panel__add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
