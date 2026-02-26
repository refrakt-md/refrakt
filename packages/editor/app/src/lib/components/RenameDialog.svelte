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
		border-radius: var(--ed-radius-lg);
		padding: 0;
		box-shadow: var(--ed-shadow-xl);
		max-width: 340px;
		width: 90vw;
	}

	.dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	.dialog__form {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		padding: var(--ed-space-5);
	}

	.dialog__title {
		font-size: var(--ed-text-lg);
		font-weight: 600;
		color: var(--ed-text-primary);
		margin: 0;
	}

	.dialog__input {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-md);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
	}

	.dialog__input:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.dialog__actions {
		display: flex;
		gap: var(--ed-space-2);
		justify-content: flex-end;
	}

	.dialog__btn {
		padding: var(--ed-space-2) var(--ed-space-3);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-sm);
		cursor: pointer;
		border: 1px solid var(--ed-border-default);
		transition: background var(--ed-transition-fast);
	}

	.dialog__btn--cancel {
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
	}

	.dialog__btn--cancel:hover {
		background: var(--ed-surface-2);
	}

	.dialog__btn--primary {
		padding: var(--ed-space-2) var(--ed-space-4);
		background: var(--ed-accent);
		color: #ffffff;
		border-color: var(--ed-accent);
		font-weight: 500;
		box-shadow: var(--ed-shadow-sm);
	}

	.dialog__btn--primary:hover:not(:disabled) {
		background: var(--ed-accent-hover);
	}

	.dialog__btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
