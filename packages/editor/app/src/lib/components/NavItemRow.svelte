<script lang="ts">
	interface Props {
		slug: string;
		onchange: (newSlug: string) => void;
		ondelete: () => void;
		ondragstart: (e: PointerEvent) => void;
	}

	let { slug, onchange, ondelete, ondragstart }: Props = $props();

	let editing = $state(false);
	let editValue = $state(slug);

	function startEdit() {
		editValue = slug;
		editing = true;
	}

	function commitEdit() {
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== slug) {
			onchange(trimmed);
		}
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitEdit();
		} else if (e.key === 'Escape') {
			editing = false;
		}
	}
</script>

<div class="nav-item">
	<button
		class="nav-item__grip"
		onpointerdown={ondragstart}
		title="Drag to reorder"
	>
		<svg width="10" height="14" viewBox="0 0 10 14" fill="none">
			<circle cx="3" cy="3" r="1.2" fill="currentColor"/>
			<circle cx="7" cy="3" r="1.2" fill="currentColor"/>
			<circle cx="3" cy="7" r="1.2" fill="currentColor"/>
			<circle cx="7" cy="7" r="1.2" fill="currentColor"/>
			<circle cx="3" cy="11" r="1.2" fill="currentColor"/>
			<circle cx="7" cy="11" r="1.2" fill="currentColor"/>
		</svg>
	</button>

	{#if editing}
		<input
			class="nav-item__input"
			type="text"
			bind:value={editValue}
			onblur={commitEdit}
			onkeydown={handleKeydown}
			autofocus
		/>
	{:else}
		<button class="nav-item__slug" ondblclick={startEdit}>
			{slug}
		</button>
	{/if}

	<button
		class="nav-item__remove"
		onclick={ondelete}
		title="Remove item"
	>
		<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
			<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
		</svg>
	</button>
</div>

<style>
	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.25rem;
		border-radius: var(--ed-radius-sm);
	}

	.nav-item:hover {
		background: var(--ed-surface-2);
	}

	.nav-item__grip {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 22px;
		border: none;
		background: none;
		color: var(--ed-border-strong);
		cursor: grab;
		flex-shrink: 0;
		touch-action: none;
	}

	.nav-item__grip:hover {
		color: var(--ed-text-muted);
	}

	.nav-item__slug {
		flex: 1;
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: none;
		border: none;
		text-align: left;
		cursor: default;
		padding: 0.1rem 0.2rem;
		border-radius: 2px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav-item__slug:hover {
		background: var(--ed-surface-3);
	}

	.nav-item__input {
		flex: 1;
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		border: 1px solid var(--ed-accent);
		border-radius: var(--ed-radius-sm);
		padding: 0.1rem 0.25rem;
		outline: none;
		background: var(--ed-surface-0);
		min-width: 0;
	}

	.nav-item__remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: none;
		background: none;
		color: var(--ed-border-strong);
		cursor: pointer;
		border-radius: var(--ed-radius-sm);
		flex-shrink: 0;
		opacity: 0;
	}

	.nav-item:hover .nav-item__remove {
		opacity: 1;
	}

	.nav-item__remove:hover {
		color: var(--ed-danger);
		background: var(--ed-danger-subtle);
	}
</style>
