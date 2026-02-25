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
		border-bottom: 1px solid #e2e8f0;
		background: #fafbfc;
		max-height: 40%;
		overflow-y: auto;
		flex-shrink: 0;
	}

	.fm-editor__header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.6rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		cursor: pointer;
		user-select: none;
	}

	.fm-editor__header:hover {
		color: #1a1a2e;
	}

	.fm-editor__label {
		flex: 1;
	}

	.fm-editor__arrow {
		display: inline-block;
		transition: transform 0.15s;
		font-size: 0.65rem;
		transform: rotate(90deg);
	}

	.fm-editor__arrow.collapsed {
		transform: rotate(0deg);
	}

	.fm-editor__mode-btn {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border: 1px solid #cbd5e1;
		border-radius: 3px;
		background: #ffffff;
		color: #64748b;
		cursor: pointer;
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
	}

	.fm-editor__mode-btn:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.fm-editor__mode-btn.active {
		background: #0ea5e9;
		color: #ffffff;
		border-color: #0ea5e9;
	}

	.fm-editor__body {
		padding: 0.75rem 1rem 1rem;
	}

	.fm-editor__fields {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.fm-editor__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
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
		font-size: 0.7rem;
		font-weight: 500;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.fm-field__input {
		padding: 0.4rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.8rem;
		color: #1a1a2e;
		background: #ffffff;
		outline: none;
	}

	.fm-field__input:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.fm-field__textarea {
		padding: 0.4rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.8rem;
		color: #1a1a2e;
		background: #ffffff;
		outline: none;
		resize: vertical;
		font-family: inherit;
	}

	.fm-field__textarea:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.fm-editor__custom-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-top: 0.25rem;
	}

	.fm-editor__section-label {
		font-size: 0.65rem;
		font-weight: 600;
		color: #94a3b8;
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
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		color: #94a3b8;
		cursor: pointer;
		padding: 0 0.4rem;
		font-size: 0.9rem;
		line-height: 1;
	}

	.fm-field__remove:hover {
		color: #ef4444;
		border-color: #ef4444;
	}

	.fm-editor__add-field {
		display: flex;
		gap: 0.35rem;
		padding-top: 0.25rem;
	}

	.fm-editor__add-field .fm-field__input {
		flex: 1;
	}

	.fm-editor__add-btn {
		padding: 0.3rem 0.6rem;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
		background: #ffffff;
		color: #64748b;
		font-size: 0.75rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.fm-editor__add-btn:hover:not(:disabled) {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.fm-editor__add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
