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
		border-radius: 8px;
		padding: 0;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 420px;
		width: 90vw;
	}

	.modal::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	.modal__form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
	}

	.modal__title {
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a2e;
		margin: 0;
	}

	.modal__field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.modal__label {
		font-size: 0.7rem;
		font-weight: 500;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.modal__input,
	.modal__select {
		padding: 0.4rem 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.85rem;
		color: #1a1a2e;
		background: #ffffff;
		outline: none;
	}

	.modal__input:focus,
	.modal__select:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.modal__hint {
		font-size: 0.65rem;
		color: #94a3b8;
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
		padding: 0.4rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		color: #64748b;
		transition: all 0.1s;
	}

	.modal__template input {
		display: none;
	}

	.modal__template:hover {
		border-color: #0ea5e9;
		color: #0ea5e9;
	}

	.modal__template.selected {
		border-color: #0ea5e9;
		background: #e0f2fe;
		color: #0369a1;
	}

	.modal__template-name {
		text-transform: capitalize;
	}

	.modal__checkbox {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #475569;
	}

	.modal__actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		padding-top: 0.25rem;
	}

	.modal__btn {
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		border: 1px solid #e2e8f0;
	}

	.modal__btn--cancel {
		background: #ffffff;
		color: #64748b;
	}

	.modal__btn--cancel:hover {
		background: #f8fafc;
	}

	.modal__btn--primary {
		background: #0ea5e9;
		color: #ffffff;
		border-color: #0ea5e9;
	}

	.modal__btn--primary:hover:not(:disabled) {
		background: #0284c7;
	}

	.modal__btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
