<script lang="ts">
	import { editorState } from '../state/editor.svelte.js';
	import Popover from './Popover.svelte';

	interface Props {
		oncreate: (options: { name: string; layout: string }) => void;
		onclose: () => void;
		anchorRect: { x: number; y: number; width: number; height: number };
	}

	let { oncreate, onclose, anchorRect }: Props = $props();

	let name = $state('');
	let layout = $state('default');

	let validName = $derived(/^[a-z0-9][a-z0-9-]*$/.test(name));

	/** Extract available layout names from the theme config */
	let layouts = $derived.by(() => {
		const config = editorState.themeConfig;
		if (!config?.layouts) return ['default'];
		return Object.keys(config.layouts);
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validName) return;
		oncreate({ name, layout });
	}
</script>

<Popover {anchorRect} {onclose}>
	<form class="modal__form" onsubmit={handleSubmit}>
		<h2 class="modal__title">New Category</h2>
		<p class="modal__desc">Creates a directory with a route rule and layout.</p>

		<label class="modal__field">
			<span class="modal__label">Name</span>
			<input
				class="modal__input"
				type="text"
				bind:value={name}
				placeholder="tutorials"
				autofocus
			/>
			{#if name && !validName}
				<span class="modal__error">Use lowercase letters, numbers, and hyphens</span>
			{:else if name}
				<span class="modal__hint">Pattern: {name}/** &middot; Directory: {name}/</span>
			{/if}
		</label>

		<label class="modal__field">
			<span class="modal__label">Layout</span>
			<select class="modal__select" bind:value={layout}>
				{#each layouts as l}
					<option value={l}>{l}</option>
				{/each}
			</select>
		</label>

		<div class="modal__actions">
			<button type="button" class="modal__btn modal__btn--cancel" onclick={onclose}>Cancel</button>
			<button type="submit" class="modal__btn modal__btn--primary" disabled={!validName}>Create</button>
		</div>
	</form>
</Popover>

<style>
	.modal__form {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-3);
		padding: var(--ed-space-4);
		width: 300px;
	}

	.modal__title {
		font-size: var(--ed-text-md);
		font-weight: 600;
		color: var(--ed-text-primary);
		margin: 0;
	}

	.modal__desc {
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		margin: -0.3rem 0 0;
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
		font-size: var(--ed-text-sm);
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

	.modal__hint {
		font-size: 0.65rem;
		color: var(--ed-text-muted);
	}

	.modal__actions {
		display: flex;
		gap: var(--ed-space-2);
		justify-content: flex-end;
		padding-top: var(--ed-space-1);
	}

	.modal__btn {
		padding: var(--ed-space-1) var(--ed-space-3);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-sm);
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
		font-weight: 500;
	}

	.modal__btn--primary:hover:not(:disabled) {
		background: var(--ed-accent-hover);
	}

	.modal__btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
