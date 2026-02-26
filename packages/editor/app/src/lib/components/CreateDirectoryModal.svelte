<script lang="ts">
	import { editorState, type TreeNode } from '../state/editor.svelte.js';

	interface Props {
		oncreate: (options: { parent: string; name: string; createLayout: boolean }) => void;
		onclose: () => void;
	}

	let { oncreate, onclose }: Props = $props();

	let name = $state('');
	let parent = $state('');
	let createLayout = $state(true);
	let dialogEl: HTMLDialogElement;

	function getDirectories(node: TreeNode | null, acc: string[] = []): string[] {
		if (!node || node.type !== 'directory') return acc;
		acc.push(node.path);
		for (const child of node.children ?? []) {
			getDirectories(child, acc);
		}
		return acc;
	}

	let directories = $derived(getDirectories(editorState.tree));

	let validName = $derived(/^[a-z0-9][a-z0-9-]*$/.test(name));

	$effect(() => {
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validName) return;
		oncreate({ parent, name, createLayout });
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
		<h2 class="modal__title">New Directory</h2>

		<label class="modal__field">
			<span class="modal__label">Name</span>
			<input
				class="modal__input"
				type="text"
				bind:value={name}
				placeholder="my-section"
				autofocus
			/>
			{#if name && !validName}
				<span class="modal__error">Use lowercase letters, numbers, and hyphens</span>
			{/if}
		</label>

		<label class="modal__field">
			<span class="modal__label">Parent directory</span>
			<select class="modal__select" bind:value={parent}>
				{#each directories as dir}
					<option value={dir}>{dir || '/ (root)'}</option>
				{/each}
			</select>
		</label>

		<label class="modal__checkbox">
			<input type="checkbox" bind:checked={createLayout} />
			<span>Create with _layout.md</span>
		</label>

		<div class="modal__actions">
			<button type="button" class="modal__btn modal__btn--cancel" onclick={onclose}>Cancel</button>
			<button type="submit" class="modal__btn modal__btn--primary" disabled={!validName}>Create</button>
		</div>
	</form>
</dialog>

<style>
	.modal {
		border: none;
		border-radius: var(--ed-radius-lg);
		padding: 0;
		box-shadow: var(--ed-shadow-xl);
		max-width: 380px;
		width: 90vw;
	}

	.modal::backdrop {
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(4px);
	}

	.modal[open] {
		animation: modal-enter 180ms ease-out;
	}

	@keyframes modal-enter {
		from { opacity: 0; transform: translateY(8px) scale(0.98); }
		to { opacity: 1; transform: translateY(0) scale(1); }
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

	.modal__error {
		font-size: 0.65rem;
		color: var(--ed-danger);
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
