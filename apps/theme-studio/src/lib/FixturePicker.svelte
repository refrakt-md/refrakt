<script lang="ts">
	import { fixtures, presets } from './fixtures.js';
	import { themeState } from './state/theme.svelte.js';

	let open = $state(false);

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.fixture-picker')) {
			open = false;
		}
	}

	const presetNames = Object.keys(presets).filter((k) => k !== 'all');

	/** Check if current selection matches a preset exactly */
	function activePreset(): string | null {
		for (const [name, ids] of Object.entries(presets)) {
			if (
				ids.length === themeState.selectedFixtures.size &&
				ids.every((id) => themeState.selectedFixtures.has(id))
			) {
				return name;
			}
		}
		return null;
	}

	let selectedCount = $derived(themeState.selectedFixtures.size);
	let uncovered = $derived(themeState.uncoveredTokenGroups);
	let currentPreset = $derived(activePreset());
</script>

<svelte:window onclick={handleClickOutside} />

<div class="fixture-picker">
	<div class="picker-bar">
		<button
			class="picker-trigger"
			class:active={open}
			onclick={() => (open = !open)}
		>
			Runes
			<span class="count">{selectedCount}/{fixtures.length}</span>
			<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
				<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" />
			</svg>
		</button>

		{#each presetNames as name (name)}
			<button
				class="preset-btn"
				class:active={currentPreset === name}
				onclick={() => themeState.applyPreset(name)}
			>
				{name[0].toUpperCase() + name.slice(1)}
			</button>
		{/each}

		<button
			class="preset-btn"
			class:active={currentPreset === 'all'}
			onclick={() => themeState.applyPreset('all')}
		>
			All
		</button>
	</div>

	{#if open}
		<div class="picker-popover">
			<div class="fixture-list">
				{#each fixtures as fixture (fixture.id)}
					<label class="fixture-row">
						<input
							type="checkbox"
							checked={themeState.selectedFixtures.has(fixture.id)}
							onchange={() => themeState.toggleFixture(fixture.id)}
						/>
						<span class="fixture-name">{fixture.name}</span>
						<span class="fixture-tags">
							{#each fixture.tokenGroups as group}
								<span class="tag">{group}</span>
							{/each}
						</span>
					</label>
				{/each}
			</div>

			{#if uncovered.length > 0}
				<div class="coverage-warning">
					Not covered: {uncovered.join(', ')}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.fixture-picker {
		position: relative;
	}

	.picker-bar {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.picker-trigger {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		font-weight: 600;
		color: #555;
	}

	.picker-trigger:hover,
	.picker-trigger.active {
		border-color: #ccc;
		background: #fafafa;
	}

	.count {
		font-weight: 400;
		color: #999;
		font-size: 11px;
	}

	.preset-btn {
		padding: 4px 10px;
		border: 1px solid #e5e5e5;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		font-size: 11px;
		font-weight: 500;
		color: #777;
	}

	.preset-btn:hover {
		border-color: #ccc;
		background: #fafafa;
	}

	.preset-btn.active {
		border-color: #0ea5e9;
		color: #0ea5e9;
		background: #f0f9ff;
	}

	.picker-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 100;
		width: 360px;
		max-height: 420px;
		overflow-y: auto;
		background: white;
		border: 1px solid #e5e5e5;
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		padding: 8px;
	}

	.fixture-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.fixture-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
	}

	.fixture-row:hover {
		background: #f5f5f5;
	}

	.fixture-row input[type='checkbox'] {
		flex-shrink: 0;
	}

	.fixture-name {
		font-weight: 500;
		color: #333;
		white-space: nowrap;
	}

	.fixture-tags {
		display: flex;
		gap: 3px;
		flex-wrap: wrap;
		margin-left: auto;
	}

	.tag {
		font-size: 9px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 1px 5px;
		border-radius: 3px;
		background: #f0f0f0;
		color: #888;
	}

	.coverage-warning {
		margin-top: 8px;
		padding: 8px 10px;
		border-top: 1px solid #e5e5e5;
		font-size: 11px;
		color: #d97706;
		font-weight: 500;
	}
</style>
