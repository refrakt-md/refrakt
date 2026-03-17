<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAssets, uploadAsset, type ImageAsset } from '../api/client.js';

	interface Props {
		/** Current image path (e.g. "/hero.png") or empty for new */
		currentSrc: string;
		/** Current alt text */
		currentAlt: string;
		onchange: (src: string, alt: string) => void;
		onremove: () => void;
		onclose: () => void;
	}

	let { currentSrc, currentAlt, onchange, onremove, onclose }: Props = $props();

	let modalEl: HTMLDivElement;
	let fileInput: HTMLInputElement;
	let altInput: HTMLInputElement;

	let images = $state<ImageAsset[]>([]);
	let loading = $state(true);
	let uploading = $state(false);
	let search = $state('');
	let editSrc = $state(currentSrc);
	let editAlt = $state(currentAlt);
	let dragOver = $state(false);

	const filtered = $derived(
		search
			? images.filter(img => img.name.toLowerCase().includes(search.toLowerCase()))
			: images
	);

	onMount(() => {
		loadImages();

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape') onclose();
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	async function loadImages() {
		loading = true;
		try {
			images = await fetchAssets();
		} catch {
			images = [];
		}
		loading = false;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function selectImage(img: ImageAsset) {
		editSrc = img.path;
		// If alt text is empty, suggest the filename without extension
		if (!editAlt) {
			const name = img.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
			editAlt = name;
		}
	}

	function handleApply() {
		if (editSrc) {
			onchange(editSrc, editAlt);
		}
	}

	function handleUploadClick() {
		fileInput?.click();
	}

	async function handleFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await doUpload(file);
		input.value = '';
	}

	async function doUpload(file: File) {
		if (!file.type.startsWith('image/')) return;
		uploading = true;
		try {
			const result = await uploadAsset(file);
			// Refresh list and select the new image
			await loadImages();
			editSrc = result.path;
			if (!editAlt) {
				const name = result.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
				editAlt = name;
			}
		} catch (err) {
			console.error('Upload failed:', err);
		}
		uploading = false;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) await doUpload(file);
	}

	function handleAltKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleApply();
		}
	}
</script>

<div
	class="image-edit-backdrop"
	onclick={handleBackdropClick}
	onkeydown={() => {}}
	role="dialog"
	aria-modal="true"
	aria-label="Select image"
>
	<div
		class="image-edit-modal"
		class:drag-over={dragOver}
		bind:this={modalEl}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<!-- Header -->
		<div class="image-edit-modal__header">
			<span class="image-edit-modal__label">image</span>
			<button class="image-edit-modal__close" onclick={onclose} aria-label="Close">&times;</button>
		</div>

		<!-- Search -->
		<div class="image-edit-modal__search">
			<input
				class="image-edit-modal__search-input"
				type="text"
				placeholder="Search images..."
				bind:value={search}
			/>
		</div>

		<!-- Grid -->
		<div class="image-edit-modal__grid-area">
			{#if loading}
				<div class="image-edit-modal__empty">Loading images...</div>
			{:else if filtered.length === 0 && !search}
				<div class="image-edit-modal__empty">No images found. Upload one to get started.</div>
			{:else if filtered.length === 0}
				<div class="image-edit-modal__empty">No images match "{search}"</div>
			{:else}
				<div class="image-edit-modal__grid">
					{#each filtered as img (img.path)}
						<button
							class="image-edit-modal__thumb"
							class:selected={editSrc === img.path}
							onclick={() => selectImage(img)}
							title={img.name}
						>
							<img src={img.path} alt={img.name} loading="lazy" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Upload bar -->
		<div class="image-edit-modal__upload-bar">
			<button
				class="image-edit-modal__upload-btn"
				onclick={handleUploadClick}
				disabled={uploading}
			>
				{uploading ? 'Uploading...' : 'Upload image'}
			</button>
			<span class="image-edit-modal__upload-hint">or drag & drop</span>
			<input
				type="file"
				accept="image/*"
				bind:this={fileInput}
				onchange={handleFileSelected}
				style="display: none"
			/>
		</div>

		<!-- Footer: alt text + actions -->
		<div class="image-edit-modal__footer">
			<div class="image-edit-modal__row">
				<label class="image-edit-modal__field-label" for="image-alt">Alt</label>
				<input
					id="image-alt"
					class="image-edit-modal__input"
					type="text"
					bind:value={editAlt}
					bind:this={altInput}
					onkeydown={handleAltKeydown}
					placeholder="Describe this image..."
				/>
			</div>
			<div class="image-edit-modal__actions">
				<button
					class="image-edit-modal__btn image-edit-modal__btn--apply"
					onclick={handleApply}
					disabled={!editSrc}
				>Apply</button>
				<button
					class="image-edit-modal__btn image-edit-modal__btn--remove"
					onclick={onremove}
				>Remove</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* ── Backdrop ─────────────────────────────────────────── */

	.image-edit-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.3);
		animation: image-edit-backdrop-in 120ms ease-out;
	}

	@keyframes image-edit-backdrop-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* ── Modal ────────────────────────────────────────────── */

	.image-edit-modal {
		z-index: 1101;
		display: flex;
		flex-direction: column;
		width: 90vw;
		max-width: 580px;
		max-height: 80vh;
		background: var(--ed-surface-0, #fff);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-lg, 8px);
		box-shadow: var(--ed-shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1));
		animation: image-edit-enter 120ms ease-out;
		overflow: hidden;
	}

	.image-edit-modal.drag-over {
		outline: 2px dashed var(--ed-accent, #3b82f6);
		outline-offset: -2px;
	}

	@keyframes image-edit-enter {
		from { opacity: 0; transform: scale(0.97) translateY(8px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ── Header ──────────────────────────────────────────── */

	.image-edit-modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
		border-bottom: 1px solid var(--ed-border-default, #e2e8f0);
	}

	.image-edit-modal__label {
		font-size: 10px;
		font-weight: 700;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.image-edit-modal__close {
		background: none;
		border: none;
		font-size: 18px;
		line-height: 1;
		color: var(--ed-text-muted, #94a3b8);
		cursor: pointer;
		padding: 0 4px;
	}

	.image-edit-modal__close:hover {
		color: var(--ed-text-primary, #1a1a2e);
	}

	/* ── Search ──────────────────────────────────────────── */

	.image-edit-modal__search {
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
	}

	.image-edit-modal__search-input {
		width: 100%;
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-0, #fff);
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
	}

	.image-edit-modal__search-input:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	/* ── Grid area ───────────────────────────────────────── */

	.image-edit-modal__grid-area {
		flex: 1;
		overflow-y: auto;
		padding: 0 var(--ed-space-3, 0.75rem);
		min-height: 120px;
		max-height: 320px;
	}

	.image-edit-modal__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 8px;
		padding-bottom: var(--ed-space-2, 0.5rem);
	}

	.image-edit-modal__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 120px;
		color: var(--ed-text-muted, #94a3b8);
		font-size: var(--ed-text-sm, 13px);
	}

	/* ── Thumbnail ───────────────────────────────────────── */

	.image-edit-modal__thumb {
		position: relative;
		aspect-ratio: 1;
		border: 2px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		overflow: hidden;
		cursor: pointer;
		padding: 0;
		background: var(--ed-surface-1, #f8fafc);
		transition: border-color 100ms;
	}

	.image-edit-modal__thumb:hover {
		border-color: var(--ed-text-muted, #94a3b8);
	}

	.image-edit-modal__thumb.selected {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.3));
	}

	.image-edit-modal__thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* ── Upload bar ──────────────────────────────────────── */

	.image-edit-modal__upload-bar {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2, 0.5rem);
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
		border-top: 1px solid var(--ed-border-default, #e2e8f0);
	}

	.image-edit-modal__upload-btn {
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-3, 0.75rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		background: var(--ed-surface-0, #fff);
		color: var(--ed-text-secondary, #475569);
		transition: background 100ms;
	}

	.image-edit-modal__upload-btn:hover:not(:disabled) {
		background: var(--ed-surface-2, #f1f5f9);
	}

	.image-edit-modal__upload-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.image-edit-modal__upload-hint {
		font-size: 11px;
		color: var(--ed-text-muted, #94a3b8);
	}

	/* ── Footer ──────────────────────────────────────────── */

	.image-edit-modal__footer {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-2, 0.5rem);
		padding: var(--ed-space-2, 0.5rem) var(--ed-space-3, 0.75rem);
		border-top: 1px solid var(--ed-border-default, #e2e8f0);
	}

	.image-edit-modal__row {
		display: flex;
		align-items: center;
		gap: var(--ed-space-2, 0.5rem);
	}

	.image-edit-modal__field-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--ed-text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		width: 24px;
		flex-shrink: 0;
	}

	.image-edit-modal__input {
		flex: 1;
		min-width: 0;
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: var(--ed-text-sm, 13px);
		color: var(--ed-text-primary, #1a1a2e);
		background: var(--ed-surface-0, #fff);
		outline: none;
		font-family: inherit;
		line-height: 1.4;
	}

	.image-edit-modal__input:focus {
		border-color: var(--ed-accent, #3b82f6);
		box-shadow: 0 0 0 2px var(--ed-accent-ring, rgba(59, 130, 246, 0.2));
	}

	/* ── Actions ─────────────────────────────────────────── */

	.image-edit-modal__actions {
		display: flex;
		gap: var(--ed-space-2, 0.5rem);
	}

	.image-edit-modal__btn {
		padding: var(--ed-space-1, 0.25rem) var(--ed-space-2, 0.5rem);
		border: 1px solid var(--ed-border-default, #e2e8f0);
		border-radius: var(--ed-radius-sm, 4px);
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: background 100ms, color 100ms;
	}

	.image-edit-modal__btn--apply {
		background: var(--ed-accent, #3b82f6);
		border-color: var(--ed-accent, #3b82f6);
		color: white;
	}

	.image-edit-modal__btn--apply:hover:not(:disabled) {
		opacity: 0.9;
	}

	.image-edit-modal__btn--apply:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.image-edit-modal__btn--remove {
		background: transparent;
		color: var(--ed-text-muted, #94a3b8);
	}

	.image-edit-modal__btn--remove:hover {
		color: var(--ed-text-secondary, #475569);
		background: var(--ed-surface-2, #f1f5f9);
	}
</style>
