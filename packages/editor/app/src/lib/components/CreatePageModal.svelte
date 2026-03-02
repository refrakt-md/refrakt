<script lang="ts">
	import Popover from './Popover.svelte';

	interface Props {
		oncreate: (options: { directory: string; slug: string; title: string; template: string; draft: boolean }) => void;
		oncreatefolder: (options: { parent: string; name: string; createLayout: boolean }) => void;
		onclose: () => void;
		initialDirectory?: string;
		anchorRect: { x: number; y: number; width: number; height: number };
	}

	let { oncreate, oncreatefolder, onclose, initialDirectory = '', anchorRect }: Props = $props();

	let mode: 'file' | 'folder' = $state('file');

	// ── File state ──
	let title = $state('');
	let slug = $state('');
	let slugManual = $state(false);
	let draft = $state(false);

	let autoSlug = $derived(
		title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
	);

	let effectiveSlug = $derived(slugManual ? slug : autoSlug);

	// ── Folder state ──
	let folderName = $state('');
	let createLayout = $state(true);
	let validFolderName = $derived(/^[a-z0-9][a-z0-9-]*$/.test(folderName));

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (mode === 'file') {
			if (!effectiveSlug) return;
			oncreate({ directory: initialDirectory, slug: effectiveSlug, title: title || effectiveSlug, template: 'blank', draft });
		} else {
			if (!validFolderName) return;
			oncreatefolder({ parent: initialDirectory, name: folderName, createLayout });
		}
	}
</script>

<Popover {anchorRect} {onclose}>
	<form class="modal__form" onsubmit={handleSubmit}>
		<div class="modal__tabs">
			<button type="button" class="modal__tab" class:active={mode === 'file'} onclick={() => mode = 'file'}>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8A1.5 1.5 0 0 0 13.5 13V6L9 1.5Z" />
					<polyline points="9 1.5 9 6 13.5 6" />
				</svg>
				File
			</button>
			<button type="button" class="modal__tab" class:active={mode === 'folder'} onclick={() => mode = 'folder'}>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M1.5 4h4.5l1.5 1.5H14.5v8.5h-13z" />
					<path d="M1.5 4v-1.5h4.5l1.5 1.5" />
				</svg>
				Folder
			</button>
		</div>

		{#if initialDirectory}
			<span class="modal__location">in {initialDirectory}/</span>
		{/if}

		{#if mode === 'file'}
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

			<label class="modal__checkbox">
				<input type="checkbox" bind:checked={draft} />
				<span>Create as draft</span>
			</label>

			<div class="modal__actions">
				<button type="button" class="modal__btn modal__btn--cancel" onclick={onclose}>Cancel</button>
				<button type="submit" class="modal__btn modal__btn--primary" disabled={!effectiveSlug}>Create</button>
			</div>
		{:else}
			<label class="modal__field">
				<span class="modal__label">Name</span>
				<input
					class="modal__input"
					type="text"
					bind:value={folderName}
					placeholder="my-section"
					autofocus
				/>
				{#if folderName && !validFolderName}
					<span class="modal__error">Use lowercase letters, numbers, and hyphens</span>
				{/if}
			</label>

			<label class="modal__checkbox">
				<input type="checkbox" bind:checked={createLayout} />
				<span>Create with _layout.md</span>
			</label>

			<div class="modal__actions">
				<button type="button" class="modal__btn modal__btn--cancel" onclick={onclose}>Cancel</button>
				<button type="submit" class="modal__btn modal__btn--primary" disabled={!validFolderName}>Create</button>
			</div>
		{/if}
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

	.modal__tabs {
		display: flex;
		gap: 2px;
		background: var(--ed-surface-2);
		border-radius: var(--ed-radius-sm);
		padding: 2px;
	}

	.modal__tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.35rem 0.5rem;
		border: none;
		background: transparent;
		color: var(--ed-text-muted);
		font-size: var(--ed-text-sm);
		font-weight: 500;
		cursor: pointer;
		border-radius: calc(var(--ed-radius-sm) - 1px);
		transition: background var(--ed-transition-fast), color var(--ed-transition-fast);
	}

	.modal__tab:hover {
		color: var(--ed-text-secondary);
	}

	.modal__tab.active {
		background: var(--ed-surface-0);
		color: var(--ed-text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	.modal__location {
		font-size: var(--ed-text-xs);
		color: var(--ed-text-muted);
		margin-top: -0.4rem;
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

	.modal__input {
		padding: var(--ed-space-2) var(--ed-space-2);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-sm);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
	}

	.modal__input:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.modal__hint {
		font-size: 0.65rem;
		color: var(--ed-text-muted);
	}

	.modal__error {
		font-size: 0.65rem;
		color: var(--ed-danger);
	}

	.modal__checkbox {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: var(--ed-text-sm);
		color: var(--ed-text-secondary);
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
		transition: background var(--ed-transition-fast);
	}

	.modal__btn--cancel {
		background: var(--ed-surface-0);
		color: var(--ed-text-tertiary);
	}

	.modal__btn--cancel:hover {
		background: var(--ed-surface-2);
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
