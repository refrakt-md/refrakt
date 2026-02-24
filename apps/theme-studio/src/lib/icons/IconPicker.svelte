<script lang="ts">
	import { luminaConfig } from '@refrakt-md/lumina/transform';

	let { onselect, oncancel }: {
		onselect: (name: string, svg: string) => void;
		oncancel: () => void;
	} = $props();

	let search = $state('');

	const allIcons = Object.entries(luminaConfig.icons.global ?? {});

	let filteredIcons = $derived(
		search.trim()
			? allIcons.filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
			: allIcons,
	);
</script>

<div class="icon-picker">
	<input
		type="text"
		class="search"
		bind:value={search}
		placeholder="Search icons..."
	/>
	<div class="icon-grid">
		{#each filteredIcons as [name, svg] (name)}
			<button
				class="icon-cell"
				title={name}
				onclick={() => onselect(name, svg)}
			>
				<span class="icon-preview">{@html svg}</span>
				<span class="icon-label">{name}</span>
			</button>
		{/each}
		{#if filteredIcons.length === 0}
			<div class="no-results">No icons match "{search}"</div>
		{/if}
	</div>
	<button class="cancel-btn" onclick={oncancel}>Cancel</button>
</div>

<style>
	.icon-picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.search {
		padding: 6px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		font-size: 12px;
		background: white;
		color: #333;
	}

	.search:focus {
		outline: none;
		border-color: #0ea5e9;
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 2px;
		max-height: 240px;
		overflow-y: auto;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		padding: 4px;
	}

	.icon-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 2px;
		border: 1px solid transparent;
		border-radius: 4px;
		background: none;
		cursor: pointer;
	}

	.icon-cell:hover {
		background: #f0f9ff;
		border-color: #0ea5e9;
	}

	.icon-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		color: #555;
	}

	.icon-preview :global(svg) {
		width: 20px;
		height: 20px;
	}

	.icon-label {
		font-size: 8px;
		color: #999;
		text-align: center;
		line-height: 1.1;
		word-break: break-all;
		max-width: 56px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.no-results {
		grid-column: 1 / -1;
		text-align: center;
		color: #999;
		font-size: 12px;
		padding: 16px;
	}

	.cancel-btn {
		padding: 4px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		color: #999;
		align-self: flex-start;
	}

	.cancel-btn:hover {
		border-color: #ccc;
		color: #555;
	}
</style>
