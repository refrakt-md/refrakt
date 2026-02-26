<script lang="ts">
	interface Props {
		title: string;
		message: string;
		confirmLabel?: string;
		onconfirm: () => void;
		onclose: () => void;
	}

	let { title, message, confirmLabel = 'Delete', onconfirm, onclose }: Props = $props();

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		onconfirm();
	}
</script>

<dialog bind:this={dialogEl} class="dialog" onclose={onclose}>
	<form class="dialog__form" onsubmit={handleSubmit}>
		<h2 class="dialog__title">{title}</h2>
		<p class="dialog__message">{message}</p>
		<div class="dialog__actions">
			<button type="button" class="dialog__btn dialog__btn--cancel" onclick={onclose}>Cancel</button>
			<button type="submit" class="dialog__btn dialog__btn--danger">{confirmLabel}</button>
		</div>
	</form>
</dialog>

<style>
	.dialog {
		border: none;
		border-radius: var(--ed-radius-lg);
		padding: 0;
		box-shadow: var(--ed-shadow-xl);
		max-width: 360px;
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

	.dialog__message {
		font-size: var(--ed-text-md);
		color: var(--ed-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.dialog__actions {
		display: flex;
		gap: var(--ed-space-2);
		justify-content: flex-end;
	}

	.dialog__btn {
		padding: var(--ed-space-2) var(--ed-space-3);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		cursor: pointer;
		border: 1px solid var(--ed-border-default);
	}

	.dialog__btn--cancel {
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
	}

	.dialog__btn--cancel:hover {
		background: var(--ed-surface-1);
	}

	.dialog__btn--danger {
		background: var(--ed-danger);
		color: #ffffff;
		border-color: var(--ed-danger);
	}

	.dialog__btn--danger:hover {
		background: var(--ed-danger-hover);
	}
</style>
