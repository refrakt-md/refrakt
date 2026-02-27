<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import TagsInput from './TagsInput.svelte';
	import RawYamlEditor from './RawYamlEditor.svelte';

	let { forceRawMode = false }: { forceRawMode?: boolean } = $props();

	// When forceRawMode is set (code mode), force YAML editing
	$effect(() => {
		if (forceRawMode) {
			editorState.frontmatterRawMode = true;
		}
	});

	/** Known frontmatter field keys that get dedicated form controls */
	const KNOWN_KEYS = new Set([
		'title', 'description', 'tags', 'draft', 'order', 'date', 'author', 'slug',
	]);

	let customKey = $state('');

	/** Custom fields are any keys not in the known set */
	let customFields = $derived(
		Object.entries(editorState.frontmatter).filter(([k]) => !KNOWN_KEYS.has(k))
	);

	let isLayout = $derived(editorState.currentFileType === 'layout');

	/** Summary text for collapsed state */
	let summaryTitle = $derived(
		(editorState.frontmatter.title as string) || ''
	);
	let summaryDesc = $derived(() => {
		const desc = (editorState.frontmatter.description as string) || '';
		return desc.length > 60 ? desc.slice(0, 60) + '...' : desc;
	});

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
	<div class="fm-editor" class:fm-editor--layout={isLayout}>
		<div
			class="fm-editor__header"
			role="button"
			tabindex="0"
			onclick={() => { editorState.frontmatterOpen = !editorState.frontmatterOpen; }}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editorState.frontmatterOpen = !editorState.frontmatterOpen; } }}
		>
			<svg class="fm-editor__chevron" class:collapsed={!editorState.frontmatterOpen} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="6 4 10 8 6 12" />
			</svg>
			<span class="fm-editor__label">
				Frontmatter
				{#if !editorState.frontmatterOpen && summaryTitle}
					<span class="fm-editor__summary">
						{summaryTitle}
						{#if summaryDesc()}
							<span class="fm-editor__summary-desc"> — {summaryDesc()}</span>
						{/if}
					</span>
				{/if}
			</span>
			{#if editorState.frontmatterOpen && !forceRawMode}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="fm-editor__mode-track" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
					<button
						class="fm-editor__mode-btn"
						class:active={!editorState.frontmatterRawMode}
						onclick={() => { editorState.frontmatterRawMode = false; }}
					>Form</button>
					<button
						class="fm-editor__mode-btn"
						class:active={editorState.frontmatterRawMode}
						onclick={() => { editorState.frontmatterRawMode = true; }}
					>YAML</button>
				</div>
			{/if}
		</div>

		<div class="fm-editor__collapse" class:open={editorState.frontmatterOpen}>
			<div class="fm-editor__collapse-inner">
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
								<div class="fm-field">
									<span class="fm-field__label">Draft</span>
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
			</div>
		</div>
	</div>
{/if}

<style>
	.fm-editor {
		border-bottom: 1px solid var(--ed-border-default);
		border-left: 3px solid var(--ed-accent);
		background: var(--ed-surface-1);
		max-height: 40%;
		overflow-y: auto;
		flex-shrink: 0;
	}

	.fm-editor--layout {
		border-left-color: var(--ed-warning);
	}

	.fm-editor__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem var(--ed-space-4);
		font-size: var(--ed-text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ed-text-tertiary);
		cursor: pointer;
		user-select: none;
		transition: color var(--ed-transition-fast);
	}

	.fm-editor__header:hover {
		color: var(--ed-text-primary);
	}

	.fm-editor__chevron {
		flex-shrink: 0;
		transition: transform var(--ed-transition-fast);
		transform: rotate(90deg);
		color: var(--ed-text-muted);
	}

	.fm-editor__chevron.collapsed {
		transform: rotate(0deg);
	}

	.fm-editor__label {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.fm-editor__summary {
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
		color: var(--ed-text-secondary);
		font-size: var(--ed-text-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fm-editor__summary-desc {
		color: var(--ed-text-muted);
	}

	/* Expand/collapse animation */
	.fm-editor__collapse {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--ed-transition-slow);
	}

	.fm-editor__collapse.open {
		grid-template-rows: 1fr;
	}

	.fm-editor__collapse-inner {
		overflow: hidden;
	}

	/* Mode toggle track */
	.fm-editor__mode-track {
		display: inline-flex;
		background: var(--ed-surface-2);
		border-radius: var(--ed-radius-md);
		padding: 2px;
		gap: 2px;
		flex-shrink: 0;
	}

	.fm-editor__mode-btn {
		font-size: var(--ed-text-xs);
		padding: 0.15rem var(--ed-space-2);
		border: none;
		border-radius: calc(var(--ed-radius-md) - 2px);
		background: transparent;
		color: var(--ed-text-tertiary);
		cursor: pointer;
		text-transform: none;
		letter-spacing: 0;
		font-weight: 500;
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.fm-editor__mode-btn:hover:not(.active) {
		color: var(--ed-text-secondary);
	}

	.fm-editor__mode-btn.active {
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		box-shadow: var(--ed-shadow-sm);
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
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
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
		transition: border-color var(--ed-transition-fast), box-shadow var(--ed-transition-fast);
	}

	.fm-field__textarea:focus {
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
		text-transform: none;
		letter-spacing: 0;
		font-weight: 400;
	}

	/* Custom fields */
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
		transition: color var(--ed-transition-fast), border-color var(--ed-transition-fast);
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

	.fm-editor__add-btn:hover:not(:disabled) {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	.fm-editor__add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
