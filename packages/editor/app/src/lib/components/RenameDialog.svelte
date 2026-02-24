<script lang="ts">
	interface Props {
		currentName: string;
		onrename: (newName: string) => void;
		onclose: () => void;
	}

	let { currentName, onrename, onclose }: Props = $props();

	let newName = $state(currentName);
	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = newName.trim();
		if (trimmed && trimmed !== currentName) {
			onrename(trimmed);
		}
	}
</script>

<dialog bind:this={dialogEl} class="dialog" onclose={onclose}>
	<form class="dialog__form" onsubmit={handleSubmit}>
		<h2 class="dialog__title">Rename</h2>
		<input
			class="dialog__input"
			type="text"
			bind:value={newName}
			autofocus
			onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
		/>
		<div class="dialog__actions">
			<button type="button" class="dialog__btn dialog__btn--cancel" onclick={onclose}>Cancel</button>
			<button
				type="submit"
				class="dialog__btn dialog__btn--primary"
				disabled={!newName.trim() || newName.trim() === currentName}
			>Rename</button>
		</div>
	</form>
</dialog>

<style>
	.dialog {
		border: none;
		border-radius: 8px;
		padding: 0;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 340px;
		width: 90vw;
	}

	.dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	.dialog__form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
	}

	.dialog__title {
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a2e;
		margin: 0;
	}

	.dialog__input {
		padding: 0.4rem 0.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		font-size: 0.85rem;
		color: #1a1a2e;
		background: #ffffff;
		outline: none;
	}

	.dialog__input:focus {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
	}

	.dialog__actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.dialog__btn {
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		border: 1px solid #e2e8f0;
	}

	.dialog__btn--cancel {
		background: #ffffff;
		color: #64748b;
	}

	.dialog__btn--cancel:hover {
		background: #f8fafc;
	}

	.dialog__btn--primary {
		background: #0ea5e9;
		color: #ffffff;
		border-color: #0ea5e9;
	}

	.dialog__btn--primary:hover:not(:disabled) {
		background: #0284c7;
	}

	.dialog__btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
