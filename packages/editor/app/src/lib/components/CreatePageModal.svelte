<script lang="ts">
	import { editorState, type TreeNode } from '../state/editor.svelte.js';

	interface Props {
		oncreate: (options: { directory: string; slug: string; title: string; template: string; draft: boolean }) => void;
		onclose: () => void;
	}

	let { oncreate, onclose }: Props = $props();

	let title = $state('');
	let slug = $state('');
	let slugManual = $state(false);
	let directory = $state('');
	let template = $state('blank');
	let draft = $state(false);
	let dialogEl: HTMLDialogElement;

	let autoSlug = $derived(
		title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
	);

	let effectiveSlug = $derived(slugManual ? slug : autoSlug);

	/** Collect all directory paths from the tree */
	function getDirectories(node: TreeNode | null, acc: string[] = []): string[] {
		if (!node || node.type !== 'directory') return acc;
		acc.push(node.path);
		for (const child of node.children ?? []) {
			getDirectories(child, acc);
		}
		return acc;
	}

	let directories = $derived(getDirectories(editorState.tree));

	$effect(() => {
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!effectiveSlug) return;
		oncreate({ directory, slug: effectiveSlug, title: title || effectiveSlug, template, draft });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<dialog
	bind:this={dialogEl}
	class="modal"
	onclose={onclose}
	onkeydown={handleKeydown}
>
	<form class="modal__form" onsubmit={handleSubmit}>
		<h2 class="modal__title">New Page</h2>

		<label class="modal__field">
			<span class="modal__label">Title</span>
			<input
				class="modal__input"
				type="text"
				bind:value={title}
				placeholder="My New Page"
				autofocus
			/>
		</label>

		<label class="modal__field">
			<span class="modal__label">Slug</span>
			<input
				class="modal__input"
				type="text"
				value={effectiveSlug}
				oninput={(e) => { slug = (e.target as HTMLInputElement).value; slugManual = true; }}
				placeholder="my-new-page"
			/>
			{#if !slugManual && title}
				<span class="modal__hint">Auto-derived from title</span>
			{/if}
		</label>

		<label class="modal__field">
			<span class="modal__label">Directory</span>
			<select class="modal__select" bind:value={directory}>
				{#each directories as dir}
					<option value={dir}>{dir || '/ (root)'}</option>
				{/each}
			</select>
		</label>

		<fieldset class="modal__fieldset">
			<legend class="modal__label">Template</legend>
			<div class="modal__templates">
				{#each ['blank', 'blog', 'docs'] as tmpl}
					<label class="modal__template" class:selected={template === tmpl}>
						<input type="radio" name="template" value={tmpl} bind:group={template} />
						<span class="modal__template-name">{tmpl}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<label class="modal__checkbox">
			<input type="checkbox" bind:checked={draft} />
			<span>Create as draft</span>
		</label>

		<div class="modal__actions">
			<button type="button" class="modal__btn modal__btn--cancel" onclick={onclose}>Cancel</button>
			<button type="submit" class="modal__btn modal__btn--primary" disabled={!effectiveSlug}>Create</button>
		</div>
	</form>
</dialog>

<style>
	.modal {
		border: none;
		border-radius: var(--ed-radius-lg);
		padding: 0;
		box-shadow: var(--ed-shadow-xl);
		max-width: 420px;
		width: 90vw;
	}

	.modal::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	.modal__form {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		padding: var(--ed-space-5);
	}

	.modal__title {
		font-size: var(--ed-text-lg);
		font-weight: 600;
		color: var(--ed-text-primary);
		margin: 0;
	}

	.modal__field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.modal__label {
		font-size: var(--ed-text-xs);
		font-weight: 500;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.modal__input,
	.modal__select {
		padding: var(--ed-space-2) var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-md);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
	}

	.modal__input:focus,
	.modal__select:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.modal__hint {
		font-size: 0.65rem;
		color: var(--ed-text-muted);
	}

	.modal__fieldset {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.modal__templates {
		display: flex;
		gap: 0.4rem;
	}

	.modal__template {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		cursor: pointer;
		font-size: var(--ed-text-base);
		color: var(--ed-text-tertiary);
		transition: all var(--ed-transition-fast);
	}

	.modal__template input {
		display: none;
	}

	.modal__template:hover {
		border-color: var(--ed-accent);
		color: var(--ed-accent);
	}

	.modal__template.selected {
		border-color: var(--ed-accent);
		background: var(--ed-accent-subtle);
		color: var(--ed-heading);
	}

	.modal__template-name {
		text-transform: capitalize;
	}

	.modal__checkbox {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: var(--ed-text-base);
		color: var(--ed-text-secondary);
	}

	.modal__actions {
		display: flex;
		gap: var(--ed-space-2);
		justify-content: flex-end;
		padding-top: var(--ed-space-1);
	}

	.modal__btn {
		padding: var(--ed-space-2) var(--ed-space-3);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		cursor: pointer;
		border: 1px solid var(--ed-border-default);
	}

	.modal__btn--cancel {
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
	}

	.modal__btn--cancel:hover {
		background: var(--ed-surface-1);
	}

	.modal__btn--primary {
		background: var(--ed-accent);
		color: #ffffff;
		border-color: var(--ed-accent);
	}

	.modal__btn--primary:hover:not(:disabled) {
		background: var(--ed-accent-hover);
	}

	.modal__btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
