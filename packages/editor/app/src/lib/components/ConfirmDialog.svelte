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
		border-radius: 8px;
		padding: 0;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 360px;
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

	.dialog__message {
		font-size: 0.85rem;
		color: #475569;
		margin: 0;
		line-height: 1.5;
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

	.dialog__btn--danger {
		background: #ef4444;
		color: #ffffff;
		border-color: #ef4444;
	}

	.dialog__btn--danger:hover {
		background: #dc2626;
	}
</style>
