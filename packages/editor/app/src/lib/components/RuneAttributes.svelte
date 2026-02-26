<script lang="ts">
	import type { RuneInfo, RuneAttributeInfo } from '../api/client.js';

	interface Props {
		runeInfo: RuneInfo;
		attributes: Record<string, string>;
		onchange: (attrs: Record<string, string>) => void;
	}

	let { runeInfo, attributes, onchange }: Props = $props();

	function updateAttr(name: string, value: string) {
		const next = { ...attributes };
		if (value === '' || value === undefined) {
			delete next[name];
		} else {
			next[name] = value;
		}
		onchange(next);
	}

	/** All schema attributes, sorted with required first */
	let sortedAttrs = $derived(
		Object.entries(runeInfo.attributes)
			.sort(([, a], [, b]) => (a.required === b.required ? 0 : a.required ? -1 : 1))
	);
</script>

<div class="rune-attrs">
	{#each sortedAttrs as [name, info] (name)}
		{@const value = attributes[name] ?? ''}
		<label class="rune-attr">
			<span class="rune-attr__label">
				{name}
				{#if info.required}
					<span class="rune-attr__required">*</span>
				{/if}
			</span>

			{#if info.type === 'Boolean'}
				<div class="rune-attr__toggle-row">
					<button
						class="rune-attr__toggle"
						class:active={value === 'true'}
						onclick={() => updateAttr(name, value === 'true' ? '' : 'true')}
						type="button"
					>
						<span class="rune-attr__toggle-knob"></span>
					</button>
					<span class="rune-attr__toggle-label">{value === 'true' ? 'Yes' : 'No'}</span>
				</div>
			{:else if info.values && info.values.length > 0}
				<select
					class="rune-attr__select"
					value={value}
					onchange={(e) => updateAttr(name, (e.target as HTMLSelectElement).value)}
				>
					{#if !info.required}
						<option value="">-- none --</option>
					{/if}
					{#each info.values as opt}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
			{:else if info.type === 'Number'}
				<input
					class="rune-attr__input"
					type="number"
					value={value}
					oninput={(e) => updateAttr(name, (e.target as HTMLInputElement).value)}
					placeholder={info.required ? 'required' : ''}
				/>
			{:else}
				<input
					class="rune-attr__input"
					type="text"
					value={value}
					oninput={(e) => updateAttr(name, (e.target as HTMLInputElement).value)}
					placeholder={info.required ? 'required' : ''}
				/>
			{/if}
		</label>
	{/each}

	{#if sortedAttrs.length === 0}
		<span class="rune-attrs__empty">No attributes</span>
	{/if}
</div>

<style>
	.rune-attrs {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.rune-attr {
		display: flex;
		flex-direction: column;
		gap: var(--ed-space-1);
	}

	.rune-attr__label {
		font-size: var(--ed-text-xs);
		font-weight: 600;
		color: var(--ed-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.rune-attr__required {
		color: var(--ed-danger);
	}

	.rune-attr__input {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		font-family: inherit;
	}

	.rune-attr__input:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	.rune-attr__select {
		padding: var(--ed-space-2) var(--ed-space-3);
		border: 1px solid var(--ed-border-default);
		border-radius: var(--ed-radius-sm);
		font-size: var(--ed-text-base);
		color: var(--ed-text-primary);
		background: var(--ed-surface-0);
		outline: none;
		font-family: inherit;
		cursor: pointer;
	}

	.rune-attr__select:focus {
		border-color: var(--ed-accent);
		box-shadow: 0 0 0 2px var(--ed-accent-ring);
	}

	/* Toggle switch */
	.rune-attr__toggle-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.rune-attr__toggle {
		position: relative;
		width: 32px;
		height: 18px;
		border-radius: 9px;
		border: 1px solid var(--ed-border-strong);
		background: var(--ed-surface-3);
		cursor: pointer;
		transition: background var(--ed-transition-fast), border-color var(--ed-transition-fast);
		padding: 0;
	}

	.rune-attr__toggle.active {
		background: var(--ed-accent);
		border-color: var(--ed-accent);
	}

	.rune-attr__toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--ed-surface-0);
		transition: transform var(--ed-transition-fast);
	}

	.rune-attr__toggle.active .rune-attr__toggle-knob {
		transform: translateX(14px);
	}

	.rune-attr__toggle-label {
		font-size: var(--ed-text-sm);
		color: var(--ed-text-tertiary);
	}

	.rune-attrs__empty {
		font-size: var(--ed-text-sm);
		color: var(--ed-text-muted);
		font-style: italic;
	}
</style>
