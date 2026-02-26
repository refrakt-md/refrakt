<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import TagsInput from './TagsInput.svelte';
	import RawYamlEditor from './RawYamlEditor.svelte';

	/** Known frontmatter field keys that get dedicated form controls */
	const KNOWN_KEYS = new Set([
		'title', 'description', 'tags', 'draft', 'order', 'date', 'author', 'slug',
	]);

	let customKey = $state('');

	/** Custom fields are any keys not in the known set */
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

{#if editorState.currentPath}
	<div class="fm-editor">
		<div
			class="fm-editor__header"
			role="button"
			tabindex="0"
			onclick={() => { editorState.frontmatterOpen = !editorState.frontmatterOpen; }}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editorState.frontmatterOpen = !editorState.frontmatterOpen; } }}
		>
			<span class="fm-editor__arrow" class:collapsed={!editorState.frontmatterOpen}>▸</span>
			<span class="fm-editor__label">Frontmatter</span>
			{#if editorState.frontmatterOpen}
				<button
					class="fm-editor__mode-btn"
					class:active={editorState.frontmatterRawMode}
					onclick={(e) => { e.stopPropagation(); editorState.frontmatterRawMode = !editorState.frontmatterRawMode; }}
				>
					{editorState.frontmatterRawMode ? 'Form' : 'YAML'}
				</button>
			{/if}
		</div>

		{#if editorState.frontmatterOpen}
			<div class="fm-editor__body">
				{#if editorState.frontmatterRawMode}
					<RawYamlEditor />
				{:else}
					<div class="fm-editor__fields">
						<!-- Title -->
						<label class="fm-field">
							<span class="fm-field__label">Title</span>
							<input
								class="fm-field__input"
								type="text"
								value={editorState.frontmatter.title ?? ''}
								oninput={(e) => updateField('title', (e.target as HTMLInputElement).value)}
							/>
						</label>

						<!-- Description -->
						<label class="fm-field">
							<span class="fm-field__label">Description</span>
							<textarea
								class="fm-field__textarea"
								value={editorState.frontmatter.description ?? ''}
								oninput={(e) => updateField('description', (e.target as HTMLTextAreaElement).value)}
								rows={2}
							></textarea>
						</label>

						<!-- Slug -->
						<label class="fm-field">
							<span class="fm-field__label">Slug</span>
							<input
								class="fm-field__input"
								type="text"
								value={editorState.frontmatter.slug ?? ''}
								oninput={(e) => updateField('slug', (e.target as HTMLInputElement).value)}
								placeholder="auto-derived from filename"
							/>
						</label>

						<!-- Two-column row: Author + Date -->
						<div class="fm-editor__row">
							<label class="fm-field">
								<span class="fm-field__label">Author</span>
								<input
									class="fm-field__input"
									type="text"
									value={editorState.frontmatter.author ?? ''}
									oninput={(e) => updateField('author', (e.target as HTMLInputElement).value)}
								/>
							</label>
							<label class="fm-field">
								<span class="fm-field__label">Date</span>
								<input
									class="fm-field__input"
									type="date"
									value={editorState.frontmatter.date ?? ''}
									oninput={(e) => updateField('date', (e.target as HTMLInputElement).value)}
								/>
							</label>
						</div>

						<!-- Two-column row: Order + Draft -->
						<div class="fm-editor__row">
							<label class="fm-field">
								<span class="fm-field__label">Order</span>
								<input
									class="fm-field__input"
									type="number"
									value={editorState.frontmatter.order ?? ''}
									oninput={(e) => {
										const val = (e.target as HTMLInputElement).value;
										updateField('order', val === '' ? undefined : Number(val));
									}}
								/>
							</label>
							<label class="fm-field fm-field--checkbox">
								<input
									type="checkbox"
									checked={editorState.frontmatter.draft === true}
									onchange={(e) => updateField('draft', (e.target as HTMLInputElement).checked || undefined)}
								/>
								<span class="fm-field__label">Draft</span>
							</label>
						</div>

						<!-- Tags -->
						<div class="fm-field">
							<span class="fm-field__label">Tags</span>
							<TagsInput
								tags={editorState.frontmatter.tags ?? []}
								onchange={(tags) => updateField('tags', tags)}
							/>
						</div>

						<!-- Custom fields -->
						{#if customFields.length > 0}
							<div class="fm-editor__custom-section">
								<span class="fm-editor__section-label">Custom fields</span>
								{#each customFields as [key, value]}
									<div class="fm-field fm-field--custom">
										<span class="fm-field__label">{key}</span>
										<div class="fm-field__custom-row">
											<input
												class="fm-field__input"
												type="text"
												value={String(value ?? '')}
												oninput={(e) => updateField(key, (e.target as HTMLInputElement).value)}
											/>
											<button
												class="fm-field__remove"
												onclick={() => removeCustomField(key)}
												aria-label="Remove {key}"
											>&times;</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Add custom field -->
						<div class="fm-editor__add-field">
							<input
								class="fm-field__input"
								type="text"
								bind:value={customKey}
								placeholder="Field name"
								onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomField(); } }}
							/>
							<button
								class="fm-editor__add-btn"
								onclick={addCustomField}
								disabled={!customKey.trim()}
							>+ Add field</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.fm-editor {
		border-bottom: 1px solid var(--ed-border-default);
		background: var(--ed-surface-1);
		max-height: 40%;
		overflow-y: auto;
		flex-shrink: 0;
	}

	.fm-editor__header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.6rem var(--ed-space-4);
		font-size: var(--ed-text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-tertiary);
		cursor: pointer;
		user-select: none;
	}

	.fm-editor__header:hover {
		color: var(--ed-text-primary);
	}

	.fm-editor__label {
		flex: 1;
	}

	.fm-editor__arrow {
		display: inline-block;
		transition: transform var(--ed-transition-fast);
		font-size: 0.65rem;
		transform: rotate(90deg);
	}

	.fm-editor__arrow.collapsed {
		transform: rotate(0deg);
	}

	.fm-editor__mode-btn {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--ed-border-strong);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
		cursor: pointer;
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
	}

	.fm-editor__mode-btn:hover {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	.fm-editor__mode-btn.active {
		background: var(--ed-accent);
		color: #ffffff;
		border-color: var(--ed-accent);
	}

	.fm-editor__body {
		padding: var(--ed-space-3) var(--ed-space-4) var(--ed-space-4);
	}

	.fm-editor__fields {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
	}

	.fm-editor__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--ed-space-3);
	}

	.fm-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.fm-field--checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.6rem;
		padding-top: 1.2rem;
	}

	.fm-field__label {
		font-size: var(--ed-text-xs);
		font-weight: 500;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.fm-field__input {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
	}

	.fm-field__input:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.fm-field__textarea {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		resize: vertical;
		font-family: inherit;
	}

	.fm-field__textarea:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.fm-editor__custom-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-top: var(--ed-space-1);
	}

	.fm-editor__section-label {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--ed-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.fm-field__custom-row {
		display: flex;
		gap: 0.35rem;
	}

	.fm-field__custom-row .fm-field__input {
		flex: 1;
	}

	.fm-field__remove {
		background: none;
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		color: var(--ed-text-muted);
		cursor: pointer;
		padding: 0 0.4rem;
		font-size: 0.9rem;
		line-height: 1;
	}

	.fm-field__remove:hover {
		color: var(--ed-danger);
		border-color: var(--ed-danger);
	}

	.fm-editor__add-field {
		display: flex;
		gap: 0.35rem;
		padding-top: var(--ed-space-1);
	}

	.fm-editor__add-field .fm-field__input {
		flex: 1;
	}

	.fm-editor__add-btn {
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--ed-border-strong);
		border-radius: var(--ed-radius-sm);
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		white-space: nowrap;
	}

	.fm-editor__add-btn:hover:not(:disabled) {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	.fm-editor__add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
